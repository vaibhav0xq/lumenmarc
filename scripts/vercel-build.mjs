#!/usr/bin/env node
/**
 * Produces a Vercel Build Output API (v3) directory at .vercel/output:
 *   static/          -> the Vite build of artifacts/lumenmarc
 *   functions/api.func -> the Express API bundled as one Node serverless function
 *   config.json      -> routing: /api/* -> function, hashed assets immutable, SPA fallback
 *
 * Run by Vercel via `pnpm run build:vercel`; runs locally the same way (then `node scripts/vercel-serve.mjs`).
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");

function run(cmd, env = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

rmSync(out, { recursive: true, force: true });

// 1. Frontend (served from "/", API on the same origin)
run("pnpm --filter @workspace/lumenmarc run build", { BASE_PATH: "/", NODE_ENV: "production" });

// 2. API as a serverless handler
run("pnpm --filter @workspace/api-server run build:vercel", { NODE_ENV: "production" });

// 3. Assemble the output directory
mkdirSync(path.join(out, "functions", "api.func"), { recursive: true });
cpSync(path.join(root, "artifacts/lumenmarc/dist/public"), path.join(out, "static"), { recursive: true });
cpSync(path.join(root, "artifacts/api-server/dist-vercel"), path.join(out, "functions", "api.func"), { recursive: true });

writeFileSync(
  path.join(out, "functions", "api.func", ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "vercel.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      maxDuration: 30,
      environment: { NODE_ENV: "production" },
    },
    null,
    2,
  ),
);
writeFileSync(path.join(out, "functions", "api.func", "package.json"), JSON.stringify({ type: "module" }, null, 2));

writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api(?:/.*)?", dest: "/api" },
        {
          src: "/assets/(.*)",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log(`\nBuild Output API directory ready at ${path.relative(root, out)}`);
