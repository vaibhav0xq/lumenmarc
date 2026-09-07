import { Router, type IRouter } from "express";
import { getLastError, historyEnabled, refreshNow, snapshotMode } from "../lib/snapshot/worker";
import { sendError } from "./_shared";

const router: IRouter = Router();

/**
 * Operational endpoint for schedulers (Vercel Cron, cron-job.org, uptime pingers).
 * Forces a snapshot refresh so premium history keeps accumulating on serverless hosts where no
 * background worker exists. When CRON_SECRET is set the caller must send `Authorization: Bearer <secret>`
 * (the header Vercel Cron sends automatically).
 */
router.get("/cron/snapshot", async (req, res): Promise<void> => {
  const secret = process.env["CRON_SECRET"]?.trim();
  if (secret) {
    const header = req.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) {
      sendError(res, 401, "Missing or invalid cron secret", "unauthorized");
      return;
    }
  }
  const snap = await refreshNow();
  res.setHeader("cache-control", "no-store");
  if (!snap) {
    sendError(res, 503, `Snapshot refresh failed${getLastError() ? `: ${getLastError()}` : ""}`, "snapshot_unavailable");
    return;
  }
  res.json({
    ok: true,
    mode: snapshotMode(),
    blockNumber: snap.blockNumber,
    computedAtUtc: snap.computedAtUtc,
    historyPersistence: historyEnabled() ? "enabled" : "disabled (DATABASE_URL not set)",
    warning: getLastError(),
  });
});

export default router;
