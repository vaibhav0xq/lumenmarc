import { GetPortfolioParams, GetPortfolioResponse, type Position } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { readBalances } from "../lib/b20/readers";
import { resolveAccount } from "../lib/basename";
import { cacheFor, param, requireSnapshot, sendError } from "./_shared";

const router: IRouter = Router();

router.get("/portfolio/:account", async (req, res): Promise<void> => {
  const { account } = GetPortfolioParams.parse({ account: param(req, "account") });
  const resolved = await resolveAccount(account);
  if (!resolved) {
    sendError(res, 404, `"${account}" is neither a valid 0x address nor a Basename that resolves on Base.`, "unresolvable_account");
    return;
  }
  const snap = await requireSnapshot(res);
  if (!snap) return;

  const decimals = new Map<string, number>();
  for (const s of snap.stocks.values()) decimals.set(s.def.ticker, s.token.decimals);
  let balances: Awaited<ReturnType<typeof readBalances>>;
  try {
    balances = await readBalances(resolved.address, decimals);
  } catch (err) {
    req.log.warn({ err, account: resolved.address }, "Portfolio balance read failed");
    sendError(res, 502, `Could not read balances from Base right now (${err instanceof Error ? err.message : String(err)}). Retry in a moment.`, "rpc_read_failed");
    return;
  }

  const positions: Position[] = [];
  for (const b of balances) {
    if (b.rawBalance <= 0) continue;
    const stock = snap.stocks.get(b.def.ticker);
    const feed = stock?.feed;
    const referencePrice = feed && feed.state !== "unavailable" ? feed.price : 0;
    const shareEquivalents = b.scaledBalance > 0 ? b.scaledBalance : b.rawBalance * b.multiplier;
    positions.push({
      ticker: b.def.ticker,
      name: stock?.summary.name ?? b.def.name,
      address: b.def.address,
      rawBalance: b.rawBalance,
      shareEquivalents,
      multiplier: b.multiplier,
      referencePrice,
      valueUsd: shareEquivalents * referencePrice,
      feedState: feed?.state ?? "unavailable",
    });
  }
  positions.sort((a, b) => b.valueUsd - a.valueUsd);
  const totalValueUsd = positions.reduce((acc, p) => acc + p.valueUsd, 0);
  const totalShareEquivalents = positions.reduce((acc, p) => acc + p.shareEquivalents, 0);
  const held = positions.some((p) => p.feedState === "held");

  cacheFor(res, 15);
  res.json(
    GetPortfolioResponse.parse({
      account: resolved.address,
      basename: resolved.basename,
      positions,
      totalValueUsd,
      totalShareEquivalents,
      note:
        positions.length === 0
          ? "This account holds none of the 13 Coinbase tokenized stocks on Base (balances read onchain at the current block)."
          : `Values use the Chainlink 'Coinbase <TICKER>' reference prices${held ? " (currently holding the last US close)" : ""}, not pool prices. Share-equivalents = token balance × multiplier, read via scaledBalanceOf. Read-only onchain data; not a statement of account.`,
      updatedAtUtc: new Date(),
    }),
  );
});

export default router;
