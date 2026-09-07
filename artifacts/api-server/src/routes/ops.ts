import { Router, type IRouter } from "express";
import { getLastError, historyEnabled, refreshIfStale, refreshNow, snapshotMode } from "../lib/snapshot/worker";
import { sendError } from "./_shared";

const router: IRouter = Router();

/**
 * Operational endpoint for schedulers (Vercel Cron, cron-job.org, uptime pingers) that keeps premium
 * history accumulating on serverless hosts where no background worker exists.
 *
 * - With CRON_SECRET configured, a caller presenting `Authorization: Bearer <secret>` (the header
 *   Vercel Cron sends automatically) forces a refresh; anyone else gets 401.
 * - Without CRON_SECRET the endpoint only refreshes when the snapshot is older than the normal
 *   freshness window — exactly what any read endpoint would do — so it cannot be used to amplify
 *   RPC / DexScreener / database load.
 */
router.get("/cron/snapshot", async (req, res): Promise<void> => {
  const secret = process.env["CRON_SECRET"]?.trim();
  let snap;
  let forced: boolean;
  if (secret) {
    const header = req.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) {
      sendError(res, 401, "Missing or invalid cron secret", "unauthorized");
      return;
    }
    snap = await refreshNow();
    forced = true;
  } else {
    const result = await refreshIfStale();
    snap = result.snapshot;
    forced = false;
  }
  res.setHeader("cache-control", "no-store");
  if (!snap) {
    sendError(res, 503, `Snapshot refresh failed${getLastError() ? `: ${getLastError()}` : ""}`, "snapshot_unavailable");
    return;
  }
  res.json({
    ok: true,
    mode: snapshotMode(),
    forced,
    blockNumber: snap.blockNumber,
    computedAtUtc: snap.computedAtUtc,
    historyPersistence: historyEnabled() ? "enabled" : "disabled (DATABASE_URL not set)",
    warning: getLastError(),
  });
});

export default router;
