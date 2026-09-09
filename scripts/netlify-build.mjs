#!/usr/bin/env node
/**
 * Builds LumenMarc for Netlify:
 *   artifacts/lumenmarc/dist/public  -> the Vite build, served as the publish directory
 *   netlify/functions/api/api.js     -> the Express API bundled as one Netlify Function (serverless-http)
 *
 * netlify.toml points Netlify at both and rewrites /api/* to the function. Run by Netlify via
 * `pnpm run build:netlify`; runs locally the same way (then `netlify serve` or `netlify dev`).
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const functionsDir = path.join(root, "netlify", "functions");
const functionDir = path.join(functionsDir, "api");

function run(cmd, env = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

rmSync(functionsDir, { recursive: true, force: true });

// 1. Frontend (served from "/", API on the same origin)
run("pnpm --filter @workspace/lumenmarc run build", { BASE_PATH: "/", NODE_ENV: "production" });

// 2. API as a Lambda-style handler
run("pnpm --filter @workspace/api-server run build:netlify", { NODE_ENV: "production" });

// 3. Function directory: netlify/functions/api/api.js (CommonJS; main file named after the directory)
mkdirSync(functionDir, { recursive: true });
cpSync(path.join(root, "artifacts/api-server/dist-netlify"), functionDir, { recursive: true });
renameSync(path.join(functionDir, "netlify.js"), path.join(functionDir, "api.js"));

console.log(`\nNetlify build ready: publish ${path.relative(root, path.join(root, "artifacts/lumenmarc/dist/public"))}, function ${path.relative(root, functionDir)}`);
