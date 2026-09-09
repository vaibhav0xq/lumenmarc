import type {
  Check,
  CorporateAction,
  DeviationState,
  FeedReading,
  FeedState,
  HistoryPoint,
  IntegrityAlert,
  MarketStatus,
  Overview,
  StockLabel,
  StockSummary,
  TokenRef,
  VenueQuote,
} from "@workspace/api-zod";
import {
  B20_ASSET_PREFIX,
  findStockByAddress,
  isOfficialStock,
  KNOWN_QUOTE_TOKENS,
  OFFICIAL_LIST_SOURCE,
  STOCKS,
  type StockDefinition,
} from "../b20/addresses";
import type { ChainSnapshot, FeedRaw, TokenRaw } from "../b20/readers";
import { EXCHANGE_TZ, getSession, type SessionInfo } from "../market/hours";
import { dexLabel, type DsPair } from "../venues/dexscreener";

export const THRESHOLDS_BPS = { fair: 50, elevated: 300 } as const;
const THIN_LIQUIDITY_USD = 25_000;

export const DISCLOSURES: string[] = [
  "LumenMarc is an information service. Nothing here is an offer, solicitation, recommendation or investment advice.",
  "Coinbase Tokenized Stocks are offered by Coinbase to eligible users outside the United States only. They are not available to US persons or in restricted jurisdictions.",
  "Each token is a beneficial claim on shares held in a bankruptcy-remote structure. Holders are not shareholders of record and do not vote. Read the issuer's prospectus and terms.",
  "Reference prices are Chainlink 'Coinbase <TICKER>' total-return feeds, which update only while the US market trades. Pool prices come from public DEX data and may be delayed. Verify onchain.",
  "Premium/discount is a factual comparison of two prices, not a forecast. The 50 bps and 300 bps thresholds are LumenMarc's published conventions.",
];

export const DATA_SOURCES: string[] = [
  "Base mainnet JSON-RPC: B20 token reads (totalSupply, multiplier, isPaused, extraMetadata, contractURI, scaledBalanceOf), B20 factory isB20, Chainlink AggregatorV3 latestRoundData, Basenames L2 resolver",
  "DexScreener public API: pool discovery, pool prices, liquidity, 24h volume and transaction counts",
  OFFICIAL_LIST_SOURCE,
  "LumenMarc US market session calendar (NYSE holidays and early closes, 2026 to 2027)",
];

export interface ComputedStock {
  def: StockDefinition;
  token: TokenRaw;
  feed: FeedReading;
  summary: StockSummary;
  venues: VenueQuote[];
  primary: VenueQuote | null;
  checks: Check[];
}

export interface ComputedSnapshot {
  computedAtUtc: string;
  blockNumber: number;
  market: MarketStatus;
  session: SessionInfo;
  stocks: Map<string, ComputedStock>;
  alerts: IntegrityAlert[];
  /** Pairs that mention an official ticker/underlying symbol but are not the official token. */
  lookalikes: LookalikeHit[];
}

export interface LookalikeHit {
  address: string;
  symbol: string | null;
  name: string | null;
  resemblesTicker: string;
  pairAddress: string | null;
  dexLabel: string | null;
}

// ---------- formatting helpers ----------

export function fmtUsd(n: number, digits = 2): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmtUsd(n, 0);
}

export function fmtBps(bps: number): string {
  const sign = bps > 0 ? "+" : bps < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(bps))} bps`;
}

export function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

function weekdayName(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: EXCHANGE_TZ });
}

export function fmtEt(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: EXCHANGE_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " ET";
}

// ---------- market ----------

export function toMarketStatus(session: SessionInfo): MarketStatus {
  return {
    state: session.state,
    isOpen: session.isOpen,
    exchangeTimezone: EXCHANGE_TZ,
    nowUtc: new Date(session.nowUtc),
    localTime: session.localTime,
    nextOpenUtc: new Date(session.nextOpenUtc),
    nextCloseUtc: session.nextCloseUtc ? new Date(session.nextCloseUtc) : null,
    reason: session.reason,
    holidayName: session.holidayName,
  };
}

// ---------- feeds ----------

export function classifyFeed(feed: FeedRaw, session: SessionInfo, now: Date): FeedReading {
  const base = {
    feedAddress: feed.feedAddress,
    description: feed.description,
    price: feed.price,
    priceRaw: feed.answerRaw,
    decimals: feed.decimals,
    roundId: feed.roundId,
    updatedAtUtc: new Date(feed.updatedAtUtc),
  };
  if (!feed.ok || feed.updatedAtUnix === 0) {
    return { ...base, ageSeconds: 0, state: "unavailable", note: `Could not read the Chainlink feed${feed.error ? ` (${feed.error})` : ""}.` };
  }
  if (!(feed.price > 0)) {
    return { ...base, ageSeconds: 0, state: "unavailable", note: `The Chainlink feed returned a non-positive answer (${feed.answerRaw}); treating the reference as unavailable.` };
  }
  const ageSeconds = Math.max(0, Math.floor(now.getTime() / 1000 - feed.updatedAtUnix));
  const updated = feed.updatedAtUnix * 1000;
  const lastOpen = new Date(session.lastSessionOpenUtc).getTime();
  const nextOpen = fmtEt(session.nextOpenUtc);
  let state: FeedState;
  let note: string;

  if (session.isOpen) {
    const sinceOpenMin = (now.getTime() - lastOpen) / 60000;
    if (updated >= lastOpen - 15 * 60000 && ageSeconds < 26 * 3600) {
      state = "live";
      note = `Updating during the regular US session. Last print ${fmtEt(feed.updatedAtUtc)}; the feed updates on a 0.5% move or a 24 h heartbeat.`;
    } else if (sinceOpenMin > 20 || ageSeconds >= 26 * 3600) {
      state = "stale";
      note = `The US market is open but this feed has not updated since ${fmtEt(feed.updatedAtUtc)}. A corporate-action pause or a feed issue may be in effect. Do not rely on this price.`;
    } else {
      state = "live";
      note = `Regular session just opened. Holding ${fmtEt(feed.updatedAtUtc)} until the first print of the day.`;
    }
  } else if (session.inExtendedHours) {
    state = ageSeconds < 15 * 60 ? "live" : "held";
    note =
      state === "live"
        ? `Extended hours (${session.reason.split(" · ")[0]}). Last print ${fmtEt(feed.updatedAtUtc)}.`
        : `Extended hours. Holding the last print from ${fmtEt(feed.updatedAtUtc)}; the regular session ${session.state === "premarket" ? "opens" : "resumes"} ${nextOpen}.`;
  } else {
    state = "held";
    const day = weekdayName(feed.updatedAtUtc);
    const why = session.holidayName ? `${session.holidayName}` : session.state === "closed" && session.reason.startsWith("Weekend") ? "the weekend" : "the market close";
    note = `Holding ${day}'s last print (${fmtEt(feed.updatedAtUtc)}) over ${why}. The feed updates only while the US market trades; the next regular session ${nextOpen}.`;
  }
  return { ...base, ageSeconds, state, note };
}

// ---------- deviation ----------

export function classifyDeviation(premiumBps: number | null): DeviationState {
  if (premiumBps === null || !Number.isFinite(premiumBps)) return "unpriced";
  const abs = Math.abs(premiumBps);
  if (abs <= THRESHOLDS_BPS.fair) return "fair";
  if (abs <= THRESHOLDS_BPS.elevated) return "elevated";
  return "dislocated";
}

export function premiumBpsOf(poolPrice: number, referencePrice: number): number | null {
  if (!(poolPrice > 0) || !(referencePrice > 0)) return null;
  return ((poolPrice - referencePrice) / referencePrice) * 10_000;
}

// ---------- venues ----------

export function tokenRef(t: { address: string; symbol: string; name?: string }, isB20Hint?: boolean): TokenRef {
  const lower = t.address.toLowerCase();
  const official = isOfficialStock(lower);
  const known = KNOWN_QUOTE_TOKENS[lower];
  let verified: boolean | null;
  if (official) verified = true;
  else if (known) verified = null;
  else verified = false;
  void isB20Hint;
  return {
    address: t.address,
    symbol: t.symbol,
    name: t.name ?? null,
    verified,
    isStablecoin: known?.isStablecoin ?? false,
  };
}

function looksLikeB20(address: string): boolean {
  return address.toLowerCase().startsWith(B20_ASSET_PREFIX);
}

/** Only a recognised USD stablecoin quote is compared with the Chainlink reference; everything else is unpriced. */
export function isUsdComparableCounter(address: string): boolean {
  return KNOWN_QUOTE_TOKENS[address.toLowerCase()]?.isStablecoin === true;
}

/** A counter-asset LumenMarc recognises (stablecoin, ETH/WETH or a Coinbase-issued stock), as opposed to an arbitrary token. */
export function isRecognisedCounter(address: string): boolean {
  const lower = address.toLowerCase();
  return isOfficialStock(lower) || !!KNOWN_QUOTE_TOKENS[lower];
}

export function counterAssetWarnings(counter: TokenRef): string[] {
  const warnings: string[] = [];
  const lower = counter.address.toLowerCase();
  if (isUsdComparableCounter(lower)) return warnings;
  if (isRecognisedCounter(lower)) {
    warnings.push(
      `Quoted against ${counter.symbol}, not a USD stablecoin. LumenMarc compares only USD-stablecoin quotes with the Chainlink reference, so this pool is unpriced and no converted price is shown.`,
    );
    return warnings;
  }
  if (looksLikeB20(lower)) {
    warnings.push(
      `Counter-asset ${counter.symbol} (${shortAddr(counter.address)}) carries the B20 0xB200… prefix but is not on Coinbase's list, so it is not a Coinbase-issued stock.`,
    );
  }
  warnings.push(
    `Quoted against ${counter.symbol}, which is not a recognised USD stablecoin. A USD price could only be inferred through ${counter.symbol}'s own market, so none is shown.`,
  );
  return warnings;
}

export function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** Build a VenueQuote for `tokenAddress` from a DexScreener pair; null if the token is not in the pair. */
export function venueFromPair(pair: DsPair, tokenAddress: string, referencePrice: number | null): VenueQuote | null {
  const token = tokenAddress.toLowerCase();
  const baseIsToken = pair.baseToken.address.toLowerCase() === token;
  const quoteIsToken = pair.quoteToken.address.toLowerCase() === token;
  if (!baseIsToken && !quoteIsToken) return null;

  const warnings: string[] = [];
  const basePriceUsd = pair.priceUsd ? Number(pair.priceUsd) : NaN;
  const priceNative = Number(pair.priceNative);
  // DexScreener's USD figure for the token. It is only exposed when the counter-asset is USD-comparable;
  // for any other pool it stays internal, so an inferred conversion never leaves the process.
  let inferredUsd: number;
  if (baseIsToken) {
    inferredUsd = Number.isFinite(basePriceUsd) ? basePriceUsd : 0;
  } else {
    inferredUsd = Number.isFinite(basePriceUsd) && priceNative > 0 ? basePriceUsd / priceNative : 0;
    warnings.push("This token is the quote asset of the pool; its USD price is derived from the base token's USD price.");
  }
  if (inferredUsd <= 0) return null;
  const counter = baseIsToken ? pair.quoteToken : pair.baseToken;
  const counterRef = tokenRef(counter);
  const counterLower = counter.address.toLowerCase();
  const counterClean = isUsdComparableCounter(counterLower);
  warnings.push(...counterAssetWarnings(counterRef));
  if (!counterClean) {
    warnings.push(`Premium not computed: a USD price inferred through ${counter.symbol} is not comparable to the Chainlink reference, so no converted price is shown.`);
  }

  const liquidityUsd = pair.liquidity?.usd ?? 0;
  if (liquidityUsd > 0 && liquidityUsd < THIN_LIQUIDITY_USD) {
    warnings.push(`Thin liquidity (${fmtCompactUsd(liquidityUsd)}): small trades can move this pool's price materially.`);
  }
  if (liquidityUsd === 0) warnings.push("No liquidity reported for this pool.");

  // Only pools quoted against a recognised USD stablecoin get a premium; anything else is "unpriced".
  const premiumRaw = counterClean && referencePrice !== null ? premiumBpsOf(inferredUsd, referencePrice) : null;
  const premiumBps = premiumRaw === null ? null : Math.round(premiumRaw);
  const txns = pair.txns?.h24;
  return {
    dex: pair.dexId,
    dexLabel: dexLabel(pair),
    pairAddress: pair.pairAddress,
    url: pair.url,
    baseToken: tokenRef(pair.baseToken),
    quoteToken: tokenRef(pair.quoteToken),
    priceUsd: counterClean ? inferredUsd : null,
    premiumBps,
    premiumPct: premiumRaw === null ? null : premiumRaw / 100,
    liquidityUsd,
    volume24hUsd: pair.volume?.h24 ?? 0,
    txns24h: txns ? (txns.buys ?? 0) + (txns.sells ?? 0) : 0,
    priceChange24hPct: pair.priceChange?.h24 ?? null,
    deviationState: classifyDeviation(premiumRaw),
    isPrimary: false,
    warnings,
  };
}

function isCleanCounter(v: VenueQuote, tokenAddress: string): boolean {
  const counter = v.baseToken.address.toLowerCase() === tokenAddress.toLowerCase() ? v.quoteToken : v.baseToken;
  return isUsdComparableCounter(counter.address);
}

/** Rank venues: recognised counter-assets first, then by liquidity. Marks the primary. */
export function rankVenues(venues: VenueQuote[], tokenAddress: string): VenueQuote[] {
  const sorted = [...venues].sort((a, b) => {
    const ca = isCleanCounter(a, tokenAddress) ? 1 : 0;
    const cb = isCleanCounter(b, tokenAddress) ? 1 : 0;
    if (ca !== cb) return cb - ca;
    return b.liquidityUsd - a.liquidityUsd;
  });
  return sorted.map((v, i) => ({ ...v, isPrimary: i === 0 }));
}

// ---------- per-stock ----------

function headlineFor(def: StockDefinition, token: TokenRaw, feed: FeedReading, primary: VenueQuote | null): string {
  const refPart = feed.state === "unavailable" ? "reference unavailable" : `reference ${fmtUsd(feed.price)}${feed.state === "held" ? " (held: last US close)" : feed.state === "stale" ? " (stale)" : ""}`;
  if (token.totalSupply <= 0) {
    return `${def.ticker} exists onchain but has no circulating supply yet; no pools found. Chainlink ${refPart}.`;
  }
  if (!primary) {
    return `No pool price available for ${def.ticker}; Chainlink ${refPart}.`;
  }
  if (primary.premiumBps === null) {
    const counter = primary.baseToken.address.toLowerCase() === def.address.toLowerCase() ? primary.quoteToken : primary.baseToken;
    if (!isUsdComparableCounter(counter.address)) {
      return `No USD-comparable pool for ${def.ticker}: ${primary.dexLabel} quotes it against ${counter.symbol} (not a USD stablecoin), so no converted price is shown and no premium is computed. Chainlink ${refPart}.`;
    }
    if (primary.priceUsd !== null && primary.priceUsd > 0 && feed.state === "unavailable") {
      return `${primary.dexLabel} pool quotes ${def.ticker} at ${fmtUsd(primary.priceUsd)}, but the Chainlink reference is unavailable, so no premium can be computed.`;
    }
    return `No premium for ${def.ticker} at this block: ${primary.dexLabel} reported no usable price. Chainlink ${refPart}.`;
  }
  const dir = primary.premiumBps > 0 ? "above" : primary.premiumBps < 0 ? "below" : "at";
  const gap = primary.premiumBps === 0 ? "exactly at" : `${fmtPct(primary.premiumPct ?? 0)} (${fmtBps(primary.premiumBps)}) ${dir}`;
  return `${primary.dexLabel} pool trades ${gap} the Chainlink ${refPart}; ${fmtCompactUsd(primary.liquidityUsd)} liquidity.`;
}

function verificationChecks(token: TokenRaw, feed: FeedReading): Check[] {
  const def = token.def;
  const nameMatches = token.onchainSymbol !== null && token.onchainSymbol === def.ticker;
  const feedMatches = feed.state !== "unavailable" && feed.description.toUpperCase().includes(def.underlying);
  const anyPaused = [token.paused.transfer, token.paused.mint, token.paused.burn].some((p) => p === true);
  const pauseKnown = [token.paused.transfer, token.paused.mint, token.paused.burn].every((p) => p !== null);
  return [
    {
      id: "official-list",
      label: "Address on Coinbase's published token list",
      passed: true,
      detail: `${def.address} is listed for ${def.ticker} (${def.name}). Source: ${OFFICIAL_LIST_SOURCE}.`,
    },
    {
      id: "b20-factory",
      label: "B20 factory confirms this is a B20 token",
      passed: token.factoryIsB20,
      detail:
        token.factoryIsB20 === null
          ? "Factory isB20() could not be read."
          : token.factoryIsB20
            ? "B20Factory.isB20(address) returned true. Note: any B20 token (including third-party lookalikes) passes this check."
            : "B20Factory.isB20(address) returned false.",
    },
    {
      id: "onchain-metadata",
      label: "Onchain symbol matches the listed ticker",
      passed: token.onchainSymbol === null ? null : nameMatches,
      detail:
        token.onchainSymbol === null
          ? "Could not read symbol()."
          : `symbol() = ${token.onchainSymbol}, name() = ${token.onchainName ?? "?"}. Metadata is mutable; the address is the identity.`,
    },
    {
      id: "reference-feed",
      label: "Chainlink reference feed responds for this stock",
      passed: feed.state === "unavailable" ? false : feedMatches,
      detail: feed.state === "unavailable" ? feed.note : `${feed.description} at ${feed.feedAddress}: ${feed.state}, last update ${fmtEt(feed.updatedAtUtc)}.`,
    },
    {
      id: "pauses",
      label: "No token feature is paused",
      passed: pauseKnown ? !anyPaused : null,
      detail: pauseKnown
        ? anyPaused
          ? `Paused: ${[token.paused.transfer && "transfer", token.paused.mint && "mint", token.paused.burn && "burn"].filter(Boolean).join(", ")}.`
          : "transfer, mint and burn are all unpaused (isPaused = false)."
        : "Pause state could not be read.",
    },
  ];
}

export function computeStock(def: StockDefinition, chain: ChainSnapshot, pairs: DsPair[], session: SessionInfo, now: Date): ComputedStock {
  const token = chain.tokens.get(def.ticker);
  const feedRaw = chain.feeds.get(def.ticker);
  if (!token || !feedRaw) throw new Error(`Missing chain data for ${def.ticker}`);
  const feed = classifyFeed(feedRaw, session, now);
  const referencePrice = feed.state === "unavailable" ? null : feed.price;
  const rawVenues = pairs
    .map((p) => venueFromPair(p, def.address, referencePrice))
    .filter((v): v is VenueQuote => v !== null);
  const venues = rankVenues(rawVenues, def.address);
  const primary = venues[0] ?? null;
  const deviationState: DeviationState = primary ? primary.deviationState : "unpriced";
  const floatUsd = referencePrice !== null ? token.shareEquivalents * referencePrice : null;
  const summary: StockSummary = {
    ticker: def.ticker,
    underlying: def.underlying,
    name: token.onchainName ?? def.name,
    address: def.address,
    decimals: token.decimals,
    status: token.totalSupply > 0 ? "live" : "no-supply",
    issuer: {
      verified: true,
      name: "Coinbase (Coinbase Onchain SPV Ltd., ADGM)",
      source: OFFICIAL_LIST_SOURCE,
      note: "Address matches Coinbase's published list. The 0xB200… prefix alone proves nothing; anyone can deploy a B20 token.",
    },
    reference: feed,
    multiplier: token.multiplier,
    multiplierRaw: token.multiplierRaw.toString(),
    totalSupply: token.totalSupply,
    shareEquivalents: token.shareEquivalents,
    floatUsd,
    primaryVenue: primary,
    venueCount: venues.length,
    deviationState,
    headline: headlineFor(def, token, feed, primary),
    updatedAtUtc: new Date(chain.readAtUtc),
  };
  return { def, token, feed, summary, venues, primary, checks: verificationChecks(token, feed) };
}

// ---------- alerts ----------

export function buildAlerts(stocks: ComputedStock[], session: SessionInfo, lookalikes: LookalikeHit[]): IntegrityAlert[] {
  const alerts: IntegrityAlert[] = [];

  for (const hit of lookalikes) {
    alerts.push({
      severity: "danger",
      ticker: hit.resemblesTicker,
      title: `Lookalike token "${hit.symbol ?? "?"}" is not Coinbase-issued`,
      detail: `${hit.name ?? hit.symbol ?? "A token"} at ${hit.address} resembles ${hit.resemblesTicker} but is not on Coinbase's list${hit.dexLabel ? ` (trading on ${hit.dexLabel})` : ""}. Only the listed addresses are Coinbase stocks.`,
      address: hit.address,
      pairAddress: hit.pairAddress,
    });
  }

  for (const s of stocks) {
    for (const v of s.venues) {
      if (!isCleanCounter(v, s.def.address)) {
        const counter = v.baseToken.address.toLowerCase() === s.def.address.toLowerCase() ? v.quoteToken : v.baseToken;
        alerts.push({
          severity: "danger",
          ticker: s.def.ticker,
          title: `${s.def.ticker} pool quoted against ${counter.symbol}, which is not Coinbase-issued`,
          detail: `${v.dexLabel} pair ${shortAddr(v.pairAddress)} prices ${s.def.ticker} in ${counter.symbol} (${shortAddr(counter.address)}). A USD price inferred through ${counter.symbol} is not comparable to the Chainlink reference, so the pool is left unpriced.`,
          address: counter.address,
          pairAddress: v.pairAddress,
        });
      }
    }
    if (s.primary && s.primary.priceUsd !== null && s.primary.deviationState === "dislocated" && isCleanCounter(s.primary, s.def.address)) {
      alerts.push({
        severity: Math.abs(s.primary.premiumBps ?? 0) > 1000 ? "danger" : "caution",
        ticker: s.def.ticker,
        title: `${s.def.ticker} ${fmtPct(s.primary.premiumPct ?? 0)} vs reference on ${s.primary.dexLabel}`,
        detail: `${fmtUsd(s.primary.priceUsd)} in the pool vs ${fmtUsd(s.feed.price)} Chainlink reference (${fmtBps(s.primary.premiumBps ?? 0)}), with ${fmtCompactUsd(s.primary.liquidityUsd)} liquidity. Standard slippage settings compare against the pool's own quote, not the reference.`,
        address: s.def.address,
        pairAddress: s.primary.pairAddress,
      });
    }
    if (s.feed.state === "stale" || s.feed.state === "unavailable") {
      alerts.push({
        severity: "caution",
        ticker: s.def.ticker,
        title: `${s.def.ticker} reference feed ${s.feed.state}`,
        detail: s.feed.note,
        address: s.feed.feedAddress,
        pairAddress: null,
      });
    }
    const paused = [s.token.paused.transfer && "transfer", s.token.paused.mint && "mint", s.token.paused.burn && "burn"].filter(Boolean);
    if (paused.length > 0) {
      alerts.push({
        severity: "danger",
        ticker: s.def.ticker,
        title: `${s.def.ticker}: ${paused.join(", ")} paused onchain`,
        detail: "The issuer has paused one or more token features. Transfers or mint/redeem may not settle until unpaused.",
        address: s.def.address,
        pairAddress: null,
      });
    }
    if (s.token.multiplier !== 1) {
      alerts.push({
        severity: "info",
        ticker: s.def.ticker,
        title: `${s.def.ticker} multiplier is ${s.token.multiplier.toFixed(6)}`,
        detail: `One token now represents ${s.token.multiplier.toFixed(6)} share-equivalents after a corporate action (dividend or split). Total-return reference prices already include this.`,
        address: s.def.address,
        pairAddress: null,
      });
    }
  }

  const noSupply = stocks.filter((s) => s.token.totalSupply <= 0).map((s) => s.def.ticker);
  if (noSupply.length > 0) {
    alerts.push({
      severity: "info",
      ticker: null,
      title: `${noSupply.join(", ")} deployed but not yet circulating`,
      detail: "These tokens exist onchain with a live reference feed but have zero supply and no pools. Anything trading under these names today is not the Coinbase token.",
      address: null,
      pairAddress: null,
    });
  }

  if (!session.isOpen) {
    alerts.push({
      severity: "info",
      ticker: null,
      title: `US market closed (${session.reason.split(" · ")[0]})`,
      detail: `All reference feeds hold their last print while pools keep trading 24/7, so premiums and discounts today reflect trading since the last US close. Next regular session ${fmtEt(session.nextOpenUtc)}.`,
      address: null,
      pairAddress: null,
    });
  }

  const order = { danger: 0, caution: 1, info: 2 } as const;
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------- snapshot ----------

export function computeSnapshot(chain: ChainSnapshot, pairs: DsPair[], lookalikes: LookalikeHit[], now: Date = new Date()): ComputedSnapshot {
  const session = getSession(now);
  const stocks = new Map<string, ComputedStock>();
  for (const def of STOCKS) {
    stocks.set(def.ticker, computeStock(def, chain, pairs, session, now));
  }
  const list = [...stocks.values()];
  return {
    computedAtUtc: now.toISOString(),
    blockNumber: chain.blockNumber,
    market: toMarketStatus(session),
    session,
    stocks,
    alerts: buildAlerts(list, session, lookalikes),
    lookalikes,
  };
}

export function buildOverview(snap: ComputedSnapshot): Overview {
  const list = [...snap.stocks.values()];
  const feeds = { live: 0, held: 0, stale: 0, unavailable: 0 };
  for (const s of list) feeds[s.feed.state] += 1;
  const dislocations = list
    .map((s) => s.summary)
    .sort((a, b) => Math.abs(b.primaryVenue?.premiumBps ?? -1) - Math.abs(a.primaryVenue?.premiumBps ?? -1));
  return {
    market: snap.market,
    snapshotAtUtc: new Date(snap.computedAtUtc),
    blockNumber: snap.blockNumber,
    tokensTotal: list.length,
    tokensLive: list.filter((s) => s.token.totalSupply > 0).length,
    floatUsd: list.reduce((acc, s) => acc + (s.summary.floatUsd ?? 0), 0),
    liquidityUsd: list.reduce((acc, s) => acc + s.venues.reduce((a, v) => a + v.liquidityUsd, 0), 0),
    volume24hUsd: list.reduce((acc, s) => acc + s.venues.reduce((a, v) => a + v.volume24hUsd, 0), 0),
    feeds,
    dislocations,
    alerts: snap.alerts,
    disclosures: DISCLOSURES,
    dataSources: DATA_SOURCES,
  };
}

// ---------- full label ----------

function corporateActionsFor(token: TokenRaw): CorporateAction[] {
  if (token.multiplier === 1) {
    return [
      {
        kind: "note",
        title: "No corporate action applied onchain yet",
        detail: `multiplier() = 1.000000000000000000 (WAD). Dividends and splits will appear here as MultiplierUpdated events; Coinbase reinvests cash dividends into share-equivalents by raising the multiplier.`,
        status: "informational",
        scheduledForUtc: null,
        txHash: null,
        uri: null,
      },
    ];
  }
  return [
    {
      kind: "multiplier-update",
      title: `Multiplier is ${token.multiplier.toFixed(9)}`,
      detail: `At least one corporate action has been applied: 1 token = ${token.multiplier.toFixed(6)} share-equivalents. The Chainlink total-return reference already reflects this, so pool prices and the reference stay comparable.`,
      status: "executed",
      scheduledForUtc: null,
      txHash: null,
      uri: null,
    },
  ];
}

export function buildLabel(s: ComputedStock, snap: ComputedSnapshot, history: HistoryPoint[], appUrl: string): StockLabel {
  const { def, token, feed, summary, venues, primary } = s;
  const verifiedStatement = `${def.ticker} at ${def.address} is the Coinbase-issued tokenized stock for ${def.name}: it matches Coinbase's published address list${token.factoryIsB20 ? ", the B20 factory confirms it" : ""}${feed.state !== "unavailable" ? ` and its Chainlink reference feed (${feed.description}) responds` : ""}.`;
  const premiumBps = primary?.premiumBps ?? null;
  let priceStatement: string;
  if (feed.state === "unavailable") priceStatement = "The Chainlink reference could not be read, so no premium or discount can be computed.";
  else if (!primary) priceStatement = `No pool with a usable price was found for ${def.ticker}. The Chainlink reference is ${fmtUsd(feed.price)} (${feed.state}).`;
  else if (premiumBps === null || primary.priceUsd === null) {
    const counter = primary.baseToken.address.toLowerCase() === def.address.toLowerCase() ? primary.quoteToken : primary.baseToken;
    priceStatement = isUsdComparableCounter(counter.address)
      ? `${primary.dexLabel} (${shortAddr(primary.pairAddress)}) is quoted in ${counter.symbol} but reported no usable price at this block, so no premium is computed against the Chainlink reference of ${fmtUsd(feed.price)}. The token is unpriced.`
      : `${primary.dexLabel} (${shortAddr(primary.pairAddress)}) is the only venue found and it quotes ${def.ticker} against ${counter.symbol}, which is not a recognised USD stablecoin. A USD price could only be inferred through ${counter.symbol}'s own market and would not be comparable to the Chainlink reference of ${fmtUsd(feed.price)}, so no converted price is shown and no premium is computed. The token is unpriced.`;
  } else {
    const bps: number = premiumBps;
    const dir = bps > 0 ? "above" : bps < 0 ? "below" : "at";
    priceStatement = `${primary.dexLabel} (${shortAddr(primary.pairAddress)}) quotes ${fmtUsd(primary.priceUsd)}, ${fmtBps(bps)} ${dir} the Chainlink reference of ${fmtUsd(feed.price)} (${summary.deviationState}). ${feed.state === "held" ? "The reference is the last US close; pools trade around the clock, so a gap outside market hours is expected and closes at the issuer's mint and redeem edge only during US hours." : feed.state === "stale" ? "The reference is stale; treat the gap with caution." : "Both prices are current."}`;
  }
  const liquidityUsd = primary?.liquidityUsd ?? 0;
  const referenceText = feed.state === "unavailable" ? "Chainlink reference unavailable" : `Chainlink reference ${fmtUsd(feed.price)}${feed.state === "held" ? " (last US close)" : ""}`;
  const shareText = !primary
    ? `${def.ticker} on Base: Coinbase-issued, ${token.totalSupply > 0 ? "no pool price available" : "no circulating supply yet"}. ${referenceText}. ${appUrl}/s/${def.ticker} via LumenMarc`
    : primary.premiumPct === null
      ? `${def.ticker} on Base: the only ${primary.dexLabel} pool is not USD-comparable, so no premium is computed (unpriced). ${referenceText}. Coinbase-issued: yes. 1 token = ${token.multiplier.toFixed(4)} share-eq. ${appUrl}/s/${def.ticker} via LumenMarc`
      : `${def.ticker} on Base: ${primary.dexLabel} pool ${fmtPct(primary.premiumPct)} vs the ${referenceText}. Coinbase-issued: yes. 1 token = ${token.multiplier.toFixed(4)} share-eq. Liquidity ${fmtCompactUsd(liquidityUsd)}. ${appUrl}/s/${def.ticker} via LumenMarc`;

  return {
    summary,
    verify: {
      verified: true,
      address: def.address,
      addressIsB20: looksLikeB20(def.address),
      matchedOfficialList: true,
      checks: s.checks,
      statement: verifiedStatement,
    },
    price: {
      reference: feed,
      primaryVenue: primary,
      premiumBps,
      premiumPct: primary?.premiumPct ?? null,
      deviationState: summary.deviationState,
      statement: priceStatement,
      thresholdsBps: { ...THRESHOLDS_BPS },
    },
    own: {
      multiplier: token.multiplier,
      multiplierRaw: token.multiplierRaw.toString(),
      sharesPerToken: token.multiplier,
      tokensPerShare: token.multiplier > 0 ? 1 / token.multiplier : 0,
      dividendPolicy:
        "Cash dividends are not paid to token holders. Coinbase converts them into additional shares (net of applicable withholding) and raises the multiplier, so each token's share-equivalent increases while the token balance stays the same.",
      claimStructure:
        "Each token is a beneficial claim on shares (1 × multiplier) held 1:1 in a bankruptcy-remote structure for the issuer, Coinbase Onchain SPV Ltd. (ADGM). Holders are not shareholders of record and do not vote. Mint and redemption are available only to eligible non-US users through Coinbase; secondary transfers are permissionless subject to the token's onchain policies.",
      custodian: "Underlying shares are held with Alpaca, a regulated broker/custodian, for the issuer's SPV (per Coinbase's disclosures).",
      lastMultiplierChangeUtc: null,
    },
    supply: {
      totalSupply: token.totalSupply,
      shareEquivalents: token.shareEquivalents,
      floatUsd: summary.floatUsd,
      holdersNote: "Holder counts are not read onchain by LumenMarc; use a block explorer for the holder list.",
    },
    venues,
    pauses: token.paused,
    metadata: { isin: token.isin, cusip: token.cusip, contractUri: token.contractUri },
    corporateActions: corporateActionsFor(token),
    disclosures: DISCLOSURES,
    history,
    blockNumber: snap.blockNumber,
    updatedAtUtc: new Date(snap.computedAtUtc),
    shareText,
  };
}

/** Which official stock a symbol/name resembles, if any (used for lookalike detection). */
export function resemblesOfficial(symbol: string | null, name: string | null): string | null {
  const sym = (symbol ?? "").trim().toUpperCase();
  const nm = (name ?? "").trim().toUpperCase();
  for (const def of STOCKS) {
    const t = def.ticker.toUpperCase();
    const u = def.underlying.toUpperCase();
    if (sym === t || sym === u || sym === `${u}X` || sym === `W${u}` || sym === `${u}.C`) return def.ticker;
    if (nm && nm === def.name.toUpperCase()) return def.ticker;
  }
  return null;
}

export { findStockByAddress };
