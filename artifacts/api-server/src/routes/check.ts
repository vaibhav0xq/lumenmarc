import { CheckAddressQueryParams, CheckAddressResponse, type Check, type CheckResult, type CheckedPool, type CheckedToken } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { getAddress, isAddress } from "viem";
import { B20_ASSET_PREFIX, findStockByAddress, findStockByTicker, isOfficialStock, STOCKS } from "../lib/b20/addresses";
import { readArbitraryToken } from "../lib/b20/readers";
import { looksLikeBasename, resolveBasename } from "../lib/basename";
import {
  classifyDeviation,
  counterAssetWarnings,
  isRecognisedCounter,
  isUsdComparableCounter,
  fmtBps,
  fmtUsd,
  premiumBpsOf,
  resemblesOfficial,
  shortAddr,
  tokenRef,
  type ComputedSnapshot,
  type ComputedStock,
} from "../lib/label/engine";
import { dexLabel, pairByAddress, type DsPair } from "../lib/venues/dexscreener";
import { isZodError, requireQuery, requireSnapshot, sendError } from "./_shared";

const router: IRouter = Router();

const tickerList = STOCKS.map((s) => s.ticker).join(", ");

function officialResult(input: string, stock: ComputedStock): CheckResult {
  const { def, token, summary, primary } = stock;
  const details = [
    `Address ${def.address} matches Coinbase's published list for ${def.ticker} (${def.name}).`,
    summary.reference.state === "unavailable"
      ? `Reference: ${summary.reference.description} did not answer at this block (unavailable).`
      : `Reference: ${summary.reference.description} ${fmtUsd(summary.reference.price)} (${summary.reference.state}).`,
    primary
      ? primary.premiumBps === null || primary.priceUsd === null
        ? `Primary pool: ${primary.dexLabel} ${shortAddr(primary.pairAddress)}, quoted in ${primary.quoteToken.symbol}${primary.quoteToken.isStablecoin ? "" : " (not a USD stablecoin)"}: no premium is computed and no converted price is shown.`
        : `Primary pool: ${primary.dexLabel} ${shortAddr(primary.pairAddress)} at ${fmtUsd(primary.priceUsd)}: ${fmtBps(primary.premiumBps)} vs reference (${primary.deviationState}).`
      : token.totalSupply > 0
        ? "No pool with a usable price was found."
        : "No circulating supply yet; nothing trading under this ticker today is the Coinbase token.",
    `1 token = ${token.multiplier.toFixed(6)} share-equivalents (multiplier). ISIN ${token.isin ?? "n/a"}.`,
  ];
  return {
    input,
    kind: "coinbase-stock",
    verdict: "verified",
    headline: `${def.ticker} is the Coinbase-issued tokenized stock for ${def.name}`,
    details,
    checks: stock.checks,
    token: {
      address: def.address,
      name: token.onchainName ?? def.name,
      symbol: token.onchainSymbol ?? def.ticker,
      decimals: token.decimals,
      isB20: token.factoryIsB20 ?? true,
      prefixLooksOfficial: true,
      matchedTicker: def.ticker,
      totalSupply: token.totalSupply,
      resemblesTicker: null,
    },
    pool: primary
      ? {
          pairAddress: primary.pairAddress,
          dex: primary.dex,
          dexLabel: primary.dexLabel,
          url: primary.url,
          baseToken: primary.baseToken,
          quoteToken: primary.quoteToken,
          priceUsd: primary.priceUsd,
          liquidityUsd: primary.liquidityUsd,
          volume24hUsd: primary.volume24hUsd,
          matchedTicker: def.ticker,
          referencePrice: summary.reference.state === "unavailable" ? null : summary.reference.price,
          premiumBps: primary.premiumBps,
          deviationState: primary.deviationState,
        }
      : null,
    stockTicker: def.ticker,
  };
}

function poolResult(input: string, pair: DsPair, snap: ComputedSnapshot): CheckResult {
  const baseOfficial = findStockByAddress(pair.baseToken.address);
  const quoteOfficial = findStockByAddress(pair.quoteToken.address);
  const matched = baseOfficial ?? quoteOfficial ?? null;
  const stock = matched ? snap.stocks.get(matched.ticker) : undefined;
  const label = dexLabel(pair);
  const basePriceUsd = pair.priceUsd ? Number(pair.priceUsd) : NaN;
  const priceNative = Number(pair.priceNative);
  let priceUsd = Number.isFinite(basePriceUsd) ? basePriceUsd : 0;
  if (matched && quoteOfficial && !baseOfficial) {
    priceUsd = Number.isFinite(basePriceUsd) && priceNative > 0 ? basePriceUsd / priceNative : 0;
  }
  const referencePrice = stock && stock.feed.state !== "unavailable" ? stock.feed.price : null;
  const counter = matched ? (baseOfficial ? pair.quoteToken : pair.baseToken) : null;
  const counterWarnings = counter ? counterAssetWarnings(tokenRef(counter)) : [];
  // Same rule as the label engine: a premium only exists when the counter-asset is a recognised USD
  // stablecoin. Anything else yields an inferred USD price that is not comparable to the reference.
  const counterClean = counter ? isUsdComparableCounter(counter.address) : false;
  const counterSuspicious = counter ? !isRecognisedCounter(counter.address) : false;
  const premiumRaw = matched && counterClean && priceUsd > 0 && referencePrice !== null ? premiumBpsOf(priceUsd, referencePrice) : null;
  const premiumBps = premiumRaw === null ? null : Math.round(premiumRaw);
  const deviationState = classifyDeviation(premiumRaw);
  const lookalikeSide = [pair.baseToken, pair.quoteToken].find((t) => !isOfficialStock(t.address) && resemblesOfficial(t.symbol, t.name));

  let verdict: CheckResult["verdict"];
  let headline: string;
  const details: string[] = [`${label} pair ${pair.baseToken.symbol}/${pair.quoteToken.symbol} (${pair.pairAddress}), liquidity ${fmtUsd(pair.liquidity?.usd ?? 0, 0)}, 24h volume ${fmtUsd(pair.volume?.h24 ?? 0, 0)}.`];
  if (matched && !counterClean) {
    verdict = counterSuspicious ? "danger" : "info";
    headline = counterSuspicious
      ? `Pool contains Coinbase-issued ${matched.ticker} but is quoted against ${counter?.symbol ?? "an unrecognised token"}`
      : `${label} pool for Coinbase-issued ${matched.ticker}, quoted in ${counter?.symbol ?? "a non-USD asset"}: unpriced`;
    details.push(...counterWarnings);
    if (referencePrice !== null) details.push(`A USD price inferred through ${counter?.symbol ?? "that token"} would not be comparable to the Chainlink reference of ${fmtUsd(referencePrice)}, so no premium is computed and no converted price is shown. The pool is unpriced.`);
  } else if (matched) {
    verdict = deviationState === "dislocated" ? "caution" : "verified";
    headline = `${label} pool for Coinbase-issued ${matched.ticker}${premiumBps === null ? "" : `: ${fmtBps(premiumBps)} vs the Chainlink reference (${deviationState})`}`;
    details.push(`${matched.ticker} side is the official token at ${matched.address}. Counter-asset ${counter?.symbol ?? "?"} is a USD stablecoin.`);
    if (priceUsd <= 0) details.push("DexScreener reported no usable price for this pool at this block, so no premium is computed.");
    else if (referencePrice !== null) details.push(`Pool ${fmtUsd(priceUsd)} vs reference ${fmtUsd(referencePrice)} (${stock?.feed.state}).`);
    else details.push(`Pool ${fmtUsd(priceUsd)}; the Chainlink reference did not answer at this block, so no premium is computed.`);
  } else if (lookalikeSide) {
    verdict = "danger";
    headline = `Not a Coinbase stock: "${lookalikeSide.symbol}" in this pool imitates ${resemblesOfficial(lookalikeSide.symbol, lookalikeSide.name)}`;
    details.push(`${lookalikeSide.symbol} at ${lookalikeSide.address} is not on Coinbase's list. Only the listed addresses are Coinbase-issued.`);
  } else {
    verdict = "info";
    headline = `${label} pool with no Coinbase tokenized stock in it`;
    details.push("Neither side of this pool is a Coinbase-issued tokenized stock.");
  }
  const checks: Check[] = [
    { id: "pool-found", label: "Pool found on DexScreener", passed: true, detail: `${label}, ${pair.url}` },
    { id: "official-side", label: "One side is a Coinbase-issued stock", passed: !!matched, detail: matched ? `${matched.ticker} at ${matched.address}` : "No official token address in this pair." },
    { id: "counter-asset", label: "Counter-asset is a USD stablecoin", passed: matched ? counterClean : null, detail: counter ? `${counter.symbol} (${shortAddr(counter.address)})${counterClean ? "" : counterSuspicious ? ": not a recognised asset" : ": recognised, but not a USD stablecoin, so the pool is unpriced"}` : "n/a" },
  ];
  const pool: CheckedPool = {
    pairAddress: pair.pairAddress,
    dex: pair.dexId,
    dexLabel: label,
    url: pair.url,
    baseToken: tokenRef(pair.baseToken),
    quoteToken: tokenRef(pair.quoteToken),
    priceUsd: matched && counterClean && priceUsd > 0 ? priceUsd : null,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    volume24hUsd: pair.volume?.h24 ?? 0,
    matchedTicker: matched?.ticker ?? null,
    referencePrice,
    premiumBps,
    deviationState,
  };
  return { input, kind: "pool", verdict, headline, details, checks, token: null, pool, stockTicker: matched?.ticker ?? null };
}

async function addressResult(input: string, address: `0x${string}`, snap: ComputedSnapshot): Promise<CheckResult> {
  const official = findStockByAddress(address);
  if (official) {
    const stock = snap.stocks.get(official.ticker);
    if (stock) return officialResult(input, stock);
  }

  const [facts, pairLookup] = await Promise.all([
    readArbitraryToken(address),
    pairByAddress(address).then(
      (pair) => ({ pair, failed: false as const }),
      (err: unknown) => ({ pair: null, failed: true as const, reason: err instanceof Error ? err.message : String(err) }),
    ),
  ]);
  // DexScreener resolving the address as a pair is authoritative: many pools (Aerodrome v2, Uniswap v2)
  // are themselves ERC-20 LP tokens, so token metadata must not override the pool classification.
  // A B20 token is never a pool, so only a non-B20 address needs that answer before a verdict is given.
  if (pairLookup.failed && !facts.isB20) {
    throw new UpstreamUnavailable(`DexScreener did not answer for ${address} (${pairLookup.reason}), so it cannot be ruled out as a pool. Retry shortly.`);
  }
  const pair = pairLookup.pair;
  if (pair && !facts.isB20) {
    return poolResult(input, pair, snap);
  }

  const prefixLooksOfficial = address.toLowerCase().startsWith(B20_ASSET_PREFIX);
  const resembles = resemblesOfficial(facts.symbol, facts.name);
  const token: CheckedToken = {
    address,
    name: facts.name,
    symbol: facts.symbol,
    decimals: facts.decimals,
    isB20: facts.isB20,
    prefixLooksOfficial,
    matchedTicker: null,
    totalSupply: facts.totalSupply,
    resemblesTicker: resembles,
  };
  const checks: Check[] = [
    { id: "official-list", label: "Address on Coinbase's published token list", passed: false, detail: "Not on the list. Coinbase-issued stocks are identified by address only." },
    { id: "b20-factory", label: "B20 factory reports isB20", passed: facts.isB20, detail: facts.isB20 ? "isB20 = true: a B20 token, which anyone can deploy; this does not indicate Coinbase issuance." : "isB20 = false." },
    { id: "b20-prefix", label: "Address carries the 0xB200… prefix", passed: prefixLooksOfficial ? null : null, detail: prefixLooksOfficial ? "Yes. The prefix is shared by all B20 tokens, official or not." : "No." },
    { id: "resemblance", label: "Name/symbol does not imitate an official ticker", passed: resembles ? false : null, detail: resembles ? `"${facts.symbol ?? facts.name}" resembles Coinbase's ${resembles}.` : "No resemblance detected." },
  ];

  if (facts.isB20) {
    return {
      input,
      kind: "lookalike-b20",
      verdict: resembles ? "danger" : "caution",
      headline: resembles
        ? `Not a Coinbase stock: "${facts.symbol ?? "?"}" is a third-party B20 token imitating ${resembles}`
        : `"${facts.symbol ?? shortAddr(address)}" is a B20 token but is not on Coinbase's list`,
      details: [
        `${facts.name ?? "This token"} (${facts.symbol ?? "?"}) at ${address} passes the B20 factory check and uses the shared 0xB200… prefix, but Coinbase's published list does not include it.`,
        resembles ? `The official ${resembles} is at ${findStockByTicker(resembles)?.address}.` : "B20 is an open token standard on Base; issuance by Coinbase is established only by the published address list.",
        `Supply ${facts.totalSupply === null ? "unknown" : facts.totalSupply.toLocaleString("en-US")}; decimals ${facts.decimals ?? "?"}.`,
      ],
      checks,
      token,
      pool: null,
      stockTicker: null,
    };
  }

  if (facts.symbol || facts.name) {
    return {
      input,
      kind: "other-token",
      verdict: resembles ? "danger" : "info",
      headline: resembles
        ? `Not a Coinbase stock: ERC-20 "${facts.symbol ?? "?"}" is unrelated to Coinbase's ${resembles}`
        : `"${facts.symbol ?? facts.name}" is an ERC-20 token, not a Coinbase tokenized stock`,
      details: [
        `${facts.name ?? "Token"} (${facts.symbol ?? "?"}) at ${address}: not a B20 token and not on Coinbase's list.`,
        resembles ? `The official ${resembles} is at ${findStockByTicker(resembles)?.address}.` : `Coinbase-issued tickers: ${tickerList}.`,
      ],
      checks,
      token,
      pool: null,
      stockTicker: null,
    };
  }

  if (pair) return poolResult(input, pair, snap);

  return {
    input,
    kind: "not-found",
    verdict: "info",
    headline: facts.hasCode ? "Contract found, but it is not a token or a known pool" : "Looks like a wallet address, not a token or pool",
    details: facts.hasCode
      ? [`${address} has bytecode but exposes no ERC-20 metadata and DexScreener knows no pool at this address.`]
      : [`${address} has no code. To see what it holds across Coinbase tokenized stocks, open the portfolio view for this address.`],
    checks: [],
    token: null,
    pool: null,
    stockTicker: null,
  };
}

/** A dependency did not answer, so the verdict cannot be completed honestly. Reported as 502, never as "not found". */
class UpstreamUnavailable extends Error {
  readonly code = "upstream_unavailable";
}

router.get("/check", async (req, res): Promise<void> => {
  if (!requireQuery(req, res, "q")) return;
  let q: string;
  try {
    q = CheckAddressQueryParams.parse(req.query).q.trim();
  } catch (err) {
    if (isZodError(err)) {
      sendError(res, 400, "q is required", "bad_request");
      return;
    }
    throw err;
  }
  const snap = await requireSnapshot(res);
  if (!snap) return;

  if (!q) {
    res.json(CheckAddressResponse.parse({ input: q, kind: "invalid", verdict: "info", headline: "Enter a ticker, token address, pool address or Basename", details: [], checks: [], token: null, pool: null, stockTicker: null }));
    return;
  }

  let result: CheckResult;
  try {
    if (isAddress(q)) {
      result = await addressResult(q, getAddress(q), snap);
    } else if (/^0x[0-9a-fA-F]{64}$/.test(q)) {
      let pair: DsPair | null;
      try {
        pair = await pairByAddress(q);
      } catch (err) {
        throw new UpstreamUnavailable(`DexScreener did not answer for this pool id (${err instanceof Error ? err.message : String(err)}). Retry shortly.`);
      }
      result = pair
        ? poolResult(q, pair, snap)
        : { input: q, kind: "not-found", verdict: "info", headline: "No pool found for this 32-byte id", details: ["Uniswap v4 pool ids are looked up on DexScreener; this one is unknown."], checks: [], token: null, pool: null, stockTicker: null };
    } else if (looksLikeBasename(q)) {
      const address = await resolveBasename(q);
      result = address
        ? { input: q, kind: "not-found", verdict: "info", headline: `${q.toLowerCase()} resolves to a wallet (${shortAddr(address)})`, details: [`${address}: open the portfolio view to see its Coinbase tokenized stock holdings.`], checks: [], token: null, pool: null, stockTicker: null }
        : { input: q, kind: "invalid", verdict: "info", headline: `${q} does not resolve to an address`, details: ["No Basename record found on the Base L2 resolver."], checks: [], token: null, pool: null, stockTicker: null };
    } else if (/^0x/i.test(q)) {
      result = { input: q, kind: "invalid", verdict: "info", headline: "That is not a valid address", details: ["Addresses are 42 characters (0x + 40 hex). Uniswap v4 pool ids are 66 characters."], checks: [], token: null, pool: null, stockTicker: null };
    } else {
      const def = findStockByTicker(q) ?? findStockByTicker(q.replace(/c$/i, ""));
      const stock = def ? snap.stocks.get(def.ticker) : undefined;
      result = stock
        ? officialResult(q, stock)
        : { input: q, kind: "not-found", verdict: "info", headline: `No Coinbase tokenized stock called "${q}"`, details: [`Coinbase-issued tickers on Base: ${tickerList}. Anything else trading under a stock name is not issued by Coinbase.`], checks: [], token: null, pool: null, stockTicker: null };
    }
  } catch (err) {
    if (err instanceof UpstreamUnavailable) {
      sendError(res, 502, err.message, err.code);
      return;
    }
    throw err;
  }

  res.json(CheckAddressResponse.parse(result));
});

export default router;
