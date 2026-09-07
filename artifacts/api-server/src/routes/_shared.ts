import type { Request, Response } from "express";
import { ensureSnapshot, getLastError } from "../lib/snapshot/worker";
import type { ComputedSnapshot } from "../lib/label/engine";

export function param(req: Request, name: string): string {
  const v = (req.params as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function sendError(res: Response, status: number, error: string, code?: string): void {
  res.status(status).json(code ? { error, code } : { error });
}

/**
 * Browser cache for `seconds`; CDN/edge caches (Vercel, Cloudflare) for twice that and may serve a
 * stale copy for up to five minutes while revalidating in the background, so bursts of traffic
 * never fan out into bursts of RPC/DexScreener calls.
 */
export function cacheFor(res: Response, seconds: number): void {
  res.setHeader("cache-control", `public, max-age=${seconds}, s-maxage=${seconds * 2}, stale-while-revalidate=300`);
}

/** Returns the current snapshot or replies 503 and returns null. */
export async function requireSnapshot(res: Response): Promise<ComputedSnapshot | null> {
  const snap = await ensureSnapshot();
  if (!snap) {
    sendError(res, 503, `Market snapshot not ready${getLastError() ? `: ${getLastError()}` : ""}`, "snapshot_unavailable");
    return null;
  }
  return snap;
}

export interface ZodLikeError {
  issues: { path: (string | number)[]; message: string }[];
}

export function isZodError(err: unknown): err is ZodLikeError {
  return typeof err === "object" && err !== null && Array.isArray((err as { issues?: unknown }).issues);
}

export function publicAppUrl(req: Request): string {
  const configured = process.env["PUBLIC_APP_URL"]?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const proto = (req.get("x-forwarded-proto") ?? req.protocol ?? "https").split(",")[0]?.trim() || "https";
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  return `${proto}://${host}`;
}
