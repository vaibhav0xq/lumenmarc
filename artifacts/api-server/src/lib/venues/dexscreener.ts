import { logger } from "../logger";

/**
 * DexScreener public API client (no key). Used only for venue discovery and pool quotes;
 * the fair-value reference always comes from the Chainlink feeds onchain.
 */

const BASE_URL = "https://api.dexscreener.com";
const CHAIN = "base";

export interface DsToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DsPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: DsToken;
  quoteToken: DsToken;
  priceNative: string;
  priceUsd?: string;
  txns?: { h24?: { buys: number; sells: number } };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  pairCreatedAt?: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 500;

async function getJson<T>(path: string, ttlMs: number): Promise<T> {
  const hit = cache.get(path) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { accept: "application/json", "user-agent": "LumenMarc/0.1 (+fair-value layer for tokenized stocks on Base)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`DexScreener ${path} → HTTP ${res.status}`);
  }
  const value = (await res.json()) as T;
  // Bounded cache: user-supplied /check inputs create arbitrary keys, so evict expired then oldest entries.
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
    while (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }
  cache.set(path, { expiresAt: Date.now() + ttlMs, value });
  return value;
}

function onlyBase(pairs: DsPair[] | undefined | null): DsPair[] {
  return (pairs ?? []).filter((p) => p && p.chainId === CHAIN && p.pairAddress);
}

/** All pairs on Base that involve any of the given token addresses (max 30 per call). */
export async function pairsForTokens(addresses: string[]): Promise<DsPair[]> {
  const out: DsPair[] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    const chunk = addresses.slice(i, i + 30);
    const data = await getJson<DsPair[]>(`/tokens/v1/${CHAIN}/${chunk.join(",")}`, 20_000);
    out.push(...onlyBase(data));
  }
  return out;
}

/** Pairs for a single token. */
export async function pairsForToken(address: string): Promise<DsPair[]> {
  const data = await getJson<DsPair[]>(`/token-pairs/v1/${CHAIN}/${address}`, 20_000);
  return onlyBase(data);
}

/**
 * Look up one pool by its pair address (or Uniswap v4 pool id). Null means DexScreener answered and knows
 * no such pair; an upstream failure throws so callers never mistake an outage for "no pool".
 */
export async function pairByAddress(pairAddress: string): Promise<DsPair | null> {
  try {
    const data = await getJson<{ pairs?: DsPair[] | null }>(`/latest/dex/pairs/${CHAIN}/${pairAddress}`, 20_000);
    const pairs = onlyBase(data.pairs);
    return pairs[0] ?? null;
  } catch (err) {
    logger.warn({ err, pairAddress }, "DexScreener pair lookup failed");
    throw err;
  }
}

/** Free-text search (used to surface lookalike pairs by symbol). */
export async function searchPairs(query: string): Promise<DsPair[]> {
  const data = await getJson<{ pairs?: DsPair[] | null }>(`/latest/dex/search?q=${encodeURIComponent(query)}`, 60_000);
  return onlyBase(data.pairs);
}

export const DEX_LABELS: Record<string, string> = {
  aerodrome: "Aerodrome",
  "aerodrome-slipstream": "Aerodrome Slipstream",
  uniswap: "Uniswap",
  pancakeswap: "PancakeSwap",
  sushiswap: "SushiSwap",
  baseswap: "BaseSwap",
  alienbase: "Alien Base",
  balancer: "Balancer",
  curve: "Curve",
};

export function dexLabel(pair: DsPair): string {
  const base = DEX_LABELS[pair.dexId] ?? pair.dexId.charAt(0).toUpperCase() + pair.dexId.slice(1);
  const version = pair.labels?.find((l) => /^v\d/i.test(l));
  return version ? `${base} ${version}` : base;
}
