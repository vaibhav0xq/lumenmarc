import { db, dbConfigured, premiumSnapshotsTable, requireDb } from "@workspace/db";
import { and, gte, lt, sql } from "drizzle-orm";
import { isOfficialStock, STOCKS } from "../b20/addresses";
import { readChainSnapshot } from "../b20/readers";
import { computeSnapshot, resemblesOfficial, type ComputedSnapshot, type LookalikeHit } from "../label/engine";
import { logger } from "../logger";
import { dexLabel, pairsForTokens, searchPairs, type DsPair } from "../venues/dexscreener";

/**
 * Snapshot lifecycle — two modes, one code path:
 *
 * - Worker mode (long-running Node host, e.g. `pnpm dev` or a VM): `startSnapshotWorker()` refreshes
 *   every TICK_MS in the background; requests always read the latest snapshot.
 * - On-demand mode (serverless, e.g. Vercel): nothing runs in the background. `ensureSnapshot()`
 *   recomputes when the in-memory snapshot is older than MAX_AGE_MS, deduplicating concurrent
 *   requests. Warm instances keep the snapshot in memory; cold instances pay one compute (~1-3 s).
 *
 * In both modes a failed refresh keeps the previous block-stamped snapshot and records `lastError`;
 * nothing is ever substituted with defaults. Before the first successful snapshot the API replies 503.
 */
const TICK_MS = 60_000;
const MAX_AGE_MS = 45_000;
const LOOKALIKE_EVERY_MS = 10 * 60_000;
const LOOKALIKE_CONCURRENCY = 4;
const PERSIST_MIN_GAP_MS = 50_000;
const RETENTION_DAYS = 14;

let current: ComputedSnapshot | null = null;
let currentAtMs = 0;
let lastError: string | null = null;
let ticks = 0;
let lookalikes: LookalikeHit[] = [];
let lookalikesAtMs = 0;
let timer: NodeJS.Timeout | null = null;
let inFlight: Promise<void> | null = null;
let previousPairs: DsPair[] = [];
// True once DexScreener has answered at least once. Before that a venue-fetch failure fails the whole tick,
// so the API keeps reporting 503 instead of publishing a snapshot in which every token reads "no venue".
let venuesKnown = false;
let persistenceNoticeLogged = false;

export function getSnapshot(): ComputedSnapshot | null {
  return current;
}

export function getLastError(): string | null {
  return lastError;
}

export function snapshotMode(): "worker" | "on-demand" {
  return timer ? "worker" : "on-demand";
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Scan DexScreener for pairs whose token symbol/name imitates an official stock but whose address is not official. */
async function scanLookalikes(): Promise<LookalikeHit[]> {
  const hits = new Map<string, LookalikeHit>();
  const perQuery = await mapWithConcurrency(STOCKS.map((s) => s.ticker), LOOKALIKE_CONCURRENCY, async (q) => {
    try {
      return await searchPairs(q);
    } catch (err) {
      logger.warn({ err, q }, "Lookalike search failed");
      return [] as DsPair[];
    }
  });
  for (const pairs of perQuery) {
    for (const p of pairs) {
      for (const t of [p.baseToken, p.quoteToken]) {
        if (isOfficialStock(t.address)) continue;
        const resembles = resemblesOfficial(t.symbol, t.name);
        if (!resembles) continue;
        const key = t.address.toLowerCase();
        if (!hits.has(key)) {
          hits.set(key, {
            address: t.address,
            symbol: t.symbol ?? null,
            name: t.name ?? null,
            resemblesTicker: resembles,
            pairAddress: p.pairAddress,
            dexLabel: dexLabel(p),
          });
        }
      }
    }
  }
  return [...hits.values()];
}

/** Arbitrary constant identifying the "premium history writer" advisory lock. */
const PERSIST_LOCK_KEY = 0x4c554d45; // "LUME"

/**
 * Store one row per priced stock. Rate-limited against the database itself (not just this process)
 * so several serverless instances computing at once do not multiply the series: the max(t) check and
 * the insert run inside one transaction under an advisory lock, so concurrent writers serialize and
 * the second one sees the first one's rows.
 */
async function persist(snap: ComputedSnapshot): Promise<boolean> {
  if (!db) {
    if (!persistenceNoticeLogged) {
      persistenceNoticeLogged = true;
      logger.warn("DATABASE_URL not set; premium history persistence is disabled");
    }
    return false;
  }
  const t = new Date(snap.computedAtUtc);
  const rows = [...snap.stocks.values()]
    .filter((s) => s.feed.state !== "unavailable")
    .map((s) => ({
      ticker: s.def.ticker,
      t,
      referencePrice: s.feed.price,
      poolPrice: s.primary?.priceUsd ?? null,
      premiumBps: s.primary?.premiumBps ?? null,
      feedState: s.feed.state,
      pairAddress: s.primary?.pairAddress ?? null,
      liquidityUsd: s.primary?.liquidityUsd ?? null,
      blockNumber: snap.blockNumber,
    }));
  if (rows.length === 0) return false;

  const inserted = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${PERSIST_LOCK_KEY})`);
    const [latest] = await tx
      .select({ maxT: sql<Date | string | null>`max(${premiumSnapshotsTable.t})` })
      .from(premiumSnapshotsTable);
    const maxT = latest?.maxT ? new Date(latest.maxT).getTime() : 0;
    if (maxT && t.getTime() - maxT < PERSIST_MIN_GAP_MS) return false;
    await tx.insert(premiumSnapshotsTable).values(rows);
    return true;
  });
  if (inserted && ticks % 60 === 1) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
    await db.delete(premiumSnapshotsTable).where(lt(premiumSnapshotsTable.t, cutoff));
  }
  return inserted;
}

async function refresh(): Promise<void> {
  ticks += 1;
  const startedAt = Date.now();
  try {
    const [chain, pairs] = await Promise.all([
      readChainSnapshot(),
      pairsForTokens(STOCKS.map((s) => s.address)).catch((err: unknown) => {
        if (!venuesKnown) throw err;
        logger.warn({ err }, "DexScreener venue fetch failed; keeping the previous venues");
        return null;
      }),
    ]);
    if (lookalikesAtMs === 0 || Date.now() - lookalikesAtMs >= LOOKALIKE_EVERY_MS) {
      try {
        lookalikes = await scanLookalikes();
        lookalikesAtMs = Date.now();
      } catch (err) {
        logger.warn({ err }, "Lookalike scan failed");
      }
    }
    if (pairs !== null) venuesKnown = true;
    const effectivePairs = pairs ?? previousPairs;
    previousPairs = effectivePairs;
    const snap = computeSnapshot(chain, effectivePairs, lookalikes);
    current = snap;
    currentAtMs = Date.now();
    lastError = pairs === null ? "DexScreener unavailable; venue data may be stale" : null;
    logger.info(
      {
        ms: Date.now() - startedAt,
        block: snap.blockNumber,
        pairs: effectivePairs.length,
        alerts: snap.alerts.length,
        market: snap.market.state,
        mode: snapshotMode(),
      },
      "Snapshot refreshed",
    );
    try {
      await persist(snap);
    } catch (err) {
      logger.error({ err }, "Failed to persist premium snapshot");
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Snapshot refresh failed");
  }
}

function run(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = refresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Long-running hosts: refresh in the background on a fixed cadence. */
export function startSnapshotWorker(): void {
  if (timer) return;
  void run();
  timer = setInterval(() => void run(), TICK_MS);
  timer.unref();
}

/**
 * Returns a usable snapshot, computing one when needed.
 * Worker mode: waits only for the very first snapshot. On-demand mode: recomputes when stale.
 */
export async function ensureSnapshot(): Promise<ComputedSnapshot | null> {
  if (timer) {
    if (!current) await run();
    return current;
  }
  if (!current || Date.now() - currentAtMs >= MAX_AGE_MS) {
    await run();
  }
  return current;
}

/** Force a refresh (authenticated cron). Returns the refreshed snapshot or null when the refresh failed. */
export async function refreshNow(): Promise<ComputedSnapshot | null> {
  await run();
  return current;
}

/** Refresh only when the in-memory snapshot is older than MAX_AGE_MS (unauthenticated warmers). */
export async function refreshIfStale(): Promise<{ snapshot: ComputedSnapshot | null; refreshed: boolean }> {
  if (current && Date.now() - currentAtMs < MAX_AGE_MS) return { snapshot: current, refreshed: false };
  await run();
  return { snapshot: current, refreshed: true };
}

export function historyEnabled(): boolean {
  return dbConfigured;
}

export async function historyFor(ticker: string, since: Date, maxPoints = 300) {
  const database = requireDb();
  const rows = await database
    .select({
      t: premiumSnapshotsTable.t,
      referencePrice: premiumSnapshotsTable.referencePrice,
      poolPrice: premiumSnapshotsTable.poolPrice,
      premiumBps: premiumSnapshotsTable.premiumBps,
      feedState: premiumSnapshotsTable.feedState,
      pairAddress: premiumSnapshotsTable.pairAddress,
    })
    .from(premiumSnapshotsTable)
    .where(and(sql`${premiumSnapshotsTable.ticker} = ${ticker}`, gte(premiumSnapshotsTable.t, since)))
    .orderBy(premiumSnapshotsTable.t);
  if (rows.length <= maxPoints) return rows;
  const step = rows.length / maxPoints;
  const sampled: typeof rows = [];
  for (let i = 0; i < maxPoints; i++) {
    const row = rows[Math.floor(i * step)];
    if (row) sampled.push(row);
  }
  const last = rows[rows.length - 1];
  if (last && sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}
