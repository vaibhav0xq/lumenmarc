import { GetMarketStatusResponse, GetOverviewResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { buildOverview, toMarketStatus } from "../lib/label/engine";
import { getSession } from "../lib/market/hours";
import { cacheFor, requireSnapshot } from "./_shared";

const router: IRouter = Router();

router.get("/market", (_req, res) => {
  res.json(GetMarketStatusResponse.parse(toMarketStatus(getSession())));
});

router.get("/overview", async (_req, res): Promise<void> => {
  const snap = await requireSnapshot(res);
  if (!snap) return;
  cacheFor(res, 15);
  res.json(GetOverviewResponse.parse(buildOverview(snap)));
});

export default router;
