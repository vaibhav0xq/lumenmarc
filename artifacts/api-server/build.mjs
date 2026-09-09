import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

// `node build.mjs`           -> dist/index.mjs         (long-running server: listens on PORT, background worker)
// `node build.mjs --vercel`  -> dist-vercel/vercel.mjs   (serverless handler: no listen, on-demand snapshots)
// `node build.mjs --netlify` -> dist-netlify/netlify.js  (Lambda-style handler via serverless-http, on-demand snapshots)
//
// The Netlify target is CommonJS (.js, no "type": "module" next to the function): Netlify re-bundles v1 functions to
// CommonJS with its own esbuild pass, which would empty the `import.meta.url` in the ESM banner below. Emitting
// CommonJS directly needs no banner at all.
const target = process.argv.includes("--vercel") ? "vercel" : process.argv.includes("--netlify") ? "netlify" : "server";
const serverless = target !== "server";
const format = target === "netlify" ? "cjs" : "esm";

const entryByTarget = { server: "src/index.ts", vercel: "src/vercel.ts", netlify: "src/netlify.ts" };

async function buildAll() {
  const distDir = path.resolve(artifactDir, target === "server" ? "dist" : `dist-${target}`);
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, entryByTarget[target])],
    platform: "node",
    bundle: true,
    format,
    outdir: distDir,
    outExtension: format === "cjs" ? {} : { ".js": ".mjs" },
    logLevel: "info",
    // Vercel sets NODE_ENV=production on the function at runtime; Netlify's functions runtime leaves it
    // unset, so it is fixed at bundle time there (production logger, no pino-pretty transport).
    ...(target === "netlify" ? { define: { "process.env.NODE_ENV": '"production"' } } : {}),
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: serverless ? false : "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: format === "esm" ? {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    } : undefined,
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
