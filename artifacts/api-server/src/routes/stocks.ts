import {
  GetSizeCheckQueryParams,
  GetSizeCheckResponse,
  GetStockHistoryQueryParams,
  GetStockHistoryResponse,
  GetStockParams,
  GetStockResponse,
  ListStocksResponse,
  type HistoryPoint,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { isAddress } from "viem";
import { findStockByAddress, findStockByTicker, type StockDefinition } from "../lib/b20/addresses";
import { buildLabel, fmtCompactUsd, type ComputedSnapshot, type ComputedStock } from "../lib/label/engine";
import { DatabaseNotConfiguredError } from "@workspace/db";
import { historyFor } from "../lib/snapshot/worker";
import { cacheFor, isZodError, param, publicAppUrl, requireSnapshot, sendError } from "./_shared";

const router: IRouter = Router();

const WINDOW_MS: Record<string, number> = {
  "1h": 3600_000,
  "6h": 6 * 3600_000,
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
};

function lookup(snap: ComputedSnapshot, raw: string): ComputedStock | undefined {
  const q = raw.trim();
  let def: StockDefinition | undefined;
  if (isAddress(q)) def = findStockByAddress(q);
  else def = findStockByTicker(q) ?? findStockByTicker(q.replace(/c$/i, ""));
  return def ? snap.stocks.get(def.ticker) : undefined;
}

async function loadHistory(ticker: string, window: string): Promise<{ points: HistoryPoint[]; pairAddress: string | null }> {
  const since = new Date(Date.now() - (WINDOW_MS[window] ?? WINDOW_MS["24h"]!));
  const rows = await historyFor(ticker, since);
  const points: HistoryPoint[] = rows.map((r) => ({
    tUtc: r.t,
    referencePrice: r.referencePrice,
    poolPrice: r.premiumBps === null ? null : r.poolPrice,
    premiumBps: r.premiumBps === null ? null : Math.round(r.premiumBps),
    feedState: r.feedState as HistoryPoint["feedState"],
  }));
  const pairAddress = rows.length > 0 ? (rows[rows.length - 1]?.pairAddress ?? null) : null;
  return { points, pairAddress };
}

router.get("/stocks", async (_req, res): Promise<void> => {
  const snap = await requireSnapshot(res);
  if (!snap) return;
  cacheFor(res, 15);
  res.json(ListStocksResponse.parse([...snap.stocks.values()].map((s) => s.summary)));
});

router.get("/stocks/:ticker", async (req, res): Promise<void> => {
  const snap = await requireSnapshot(res);
  if (!snap) return;
  const { ticker } = GetStockParams.parse({ ticker: param(req, "ticker") });
  const stock = lookup(snap, ticker);
  if (!stock) {
    sendError(res, 404, `Unknown tokenized stock "${ticker}". Only Coinbase-issued tokens on the official list have readings. Use /check for arbitrary addresses.`, "unknown_ticker");
    return;
  }
  let history: HistoryPoint[] = [];
  try {
    history = (await loadHistory(stock.def.ticker, "24h")).points;
  } catch (err) {
    req.log.warn({ err }, "History unavailable for label");
  }
  cacheFor(res, 15);
  res.json(GetStockResponse.parse(buildLabel(stock, snap, history, publicAppUrl(req))));
});

router.get("/history", async (req, res): Promise<void> => {
  let query;
  try {
    query = GetStockHistoryQueryParams.parse(req.query);
  } catch (err) {
    if (isZodError(err)) {
      sendError(res, 400, err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "bad_request");
      return;
    }
    throw err;
  }
  const snap = await requireSnapshot(res);
  if (!snap) return;
  const stock = lookup(snap, query.ticker);
  if (!stock) {
    sendError(res, 404, `Unknown tokenized stock "${query.ticker}".`, "unknown_ticker");
    return;
  }
  let loaded;
  try {
    loaded = await loadHistory(stock.def.ticker, query.window);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      sendError(res, 503, err.message, err.code);
      return;
    }
    throw err;
  }
  const { points, pairAddress } = loaded;
  cacheFor(res, 30);
  res.json(
    GetStockHistoryResponse.parse({
      ticker: stock.def.ticker,
      window: query.window,
      pairAddress: pairAddress ?? stock.primary?.pairAddress ?? null,
      points,
    }),
  );
});

router.get("/size-check", async (req, res): Promise<void> => {
  let query;
  try {
    query = GetSizeCheckQueryParams.parse(req.query);
  } catch (err) {
    if (isZodError(err)) {
      sendError(res, 400, err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "bad_request");
      return;
    }
    throw err;
  }
  const snap = await requireSnapshot(res);
  if (!snap) return;
  const stock = lookup(snap, query.ticker);
  if (!stock) {
    sendError(res, 404, `Unknown tokenized stock "${query.ticker}".`, "unknown_ticker");
    return;
  }
  const venue = stock.primary;
  if (!venue || venue.liquidityUsd <= 0) {
    sendError(res, 404, `${stock.def.ticker} has no pool with reported liquidity, so a size check is not possible.`, "no_venue");
    return;
  }
  if (venue.premiumBps === null) {
    sendError(
      res,
      422,
      `${stock.def.ticker}'s primary pool (${venue.dexLabel}) is not USD-comparable to the Chainlink reference, so an all-in estimate would be meaningless.`,
      "unpriced_venue",
    );
    return;
  }
  const amount = query.amountUsd;
  const L = venue.liquidityUsd;
  // Constant-product estimate: treat half the pool's USD liquidity as the quote reserve. This is an
  // approximation, not a bound — concentrated-liquidity pools can do better in range and worse out of range.
  const quoteReserve = L / 2;
  const impactFraction = query.side === "buy" ? amount / quoteReserve : amount / (quoteReserve + amount);
  const impactBps = Math.round(Math.min(impactFraction, 100) * 10_000);
  const currentPremiumBps = venue.premiumBps;
  const allIn = currentPremiumBps === null ? null : query.side === "buy" ? currentPremiumBps + impactBps : currentPremiumBps - impactBps;
  const shareOfLiquidityPct = (amount / L) * 100;
  const tokensApprox = venue.priceUsd !== null && venue.priceUsd > 0 ? amount / venue.priceUsd : 0;
  const sizeWord = shareOfLiquidityPct < 0.5 ? "small relative to" : shareOfLiquidityPct < 5 ? "meaningful relative to" : "large relative to";
  res.json(
    GetSizeCheckResponse.parse({
      ticker: stock.def.ticker,
      amountUsd: amount,
      side: query.side,
      pairAddress: venue.pairAddress,
      dexLabel: venue.dexLabel,
      liquidityUsd: L,
      shareOfLiquidityPct,
      estimatedImpactBps: impactBps,
      currentPremiumBps,
      estimatedAllInVsReferenceBps: allIn,
      tokensApprox,
      method: "Constant-product estimate: impact ≈ amount / (liquidity ÷ 2) for buys and amount / (liquidity ÷ 2 + amount) for sells, using DexScreener's total pool liquidity. This is an approximation, not a guaranteed bound; concentrated-liquidity pools (Aerodrome Slipstream, Uniswap v3/v4) usually do better in range and worse out of range. The all-in figure is signed: premium + impact for buys, premium − impact for sells.",
      note: `$${amount.toLocaleString("en-US")} is ${sizeWord} the ${fmtCompactUsd(L)} in the ${venue.dexLabel} pool (${shareOfLiquidityPct.toFixed(2)}% of liquidity). The pool currently sits ${currentPremiumBps === null ? "at an unknown distance from" : `${currentPremiumBps >= 0 ? "+" : ""}${currentPremiumBps} bps from`} the reference; this is a factual sizing estimate, not a quote or a recommendation.`,
    }),
  );
});

export default router;
