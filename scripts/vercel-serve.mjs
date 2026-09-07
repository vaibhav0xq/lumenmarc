#!/usr/bin/env node
/**
 * Local stand-in for the Vercel routing layer, used to smoke-test `.vercel/output` before deploying:
 * serves static files, falls back to index.html, and hands /api/* to the bundled serverless handler
 * exactly as Vercel does (same handler signature, on-demand snapshot mode, no background worker).
 *
 *   pnpm run build:vercel && node scripts/vercel-serve.mjs   # then open http://localhost:3000
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");
const staticDir = path.join(out, "static");
const { default: handler } = await import(pathToFileURL(path.join(out, "functions", "api.func", "vercel.mjs")).href);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

const port = Number(process.env.PORT ?? 3000);
http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return handler(req, res);
    let file = path.join(staticDir, decodeURIComponent(url.pathname));
    if (!file.startsWith(staticDir) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(staticDir, "index.html");
    res.setHeader("content-type", TYPES[path.extname(file)] ?? "application/octet-stream");
    createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Vercel-style preview on http://localhost:${port}`));
