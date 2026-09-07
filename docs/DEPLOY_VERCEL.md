# Deploying LumenMarc on Vercel

LumenMarc deploys to Vercel as **one project**: the Vite front end is served as static files and the Express API runs as a single Node serverless function behind `/api/*`. No Replit-specific pieces are involved.

The repository ships a `vercel.json` (install + build commands) and a build script (`scripts/vercel-build.mjs`) that produces a [Build Output API](https://vercel.com/docs/build-output-api) directory, so the Vercel dashboard needs almost no configuration.

## 1. Import the repository

1. Vercel dashboard → **Add New… → Project** → import `github.com/vaibhav0xq/lumenmarc`.
2. Settings on the import screen:
   - **Framework Preset:** Other
   - **Root Directory:** leave as the repository root (do **not** point it at `artifacts/lumenmarc`)
   - **Build Command / Install Command / Output Directory:** leave the defaults — they are read from `vercel.json`
   - **Node.js version:** 22.x (Project Settings → General, if it is not already the default)
3. Add the environment variables from the table below, then **Deploy**.

## 2. Environment variables

All of them are optional; the deployment works with none of them set.

| Variable | Purpose | Recommended for production? |
| --- | --- | --- |
| `BASE_RPC_URL` | Keyed Base mainnet RPC (Alchemy, QuickNode, Infura, Coinbase Developer Platform…). Without it the public Base RPCs are used with fallbacks, and an occasional refresh can fail on rate limits (the app keeps its last snapshot and says so). | **Yes** |
| `DATABASE_URL` | Postgres connection string ([Neon](https://neon.tech) works well; Vercel Marketplace → Neon creates one in a click — use the **pooled** connection string, the one containing `-pooler`, so many function instances share Neon's PgBouncer). Backs the premium **history** series only. Without it every other feature works and the history endpoints answer `history_disabled` — the UI shows that message instead of an empty chart. | Yes, for the demo |
| `PUBLIC_APP_URL` | Canonical public origin, e.g. `https://lumenmarc.vercel.app`, used in share text and embed snippets. Falls back to the request host. | Optional |
| `CRON_SECRET` | Enables *forced* refreshes on `GET /api/cron/snapshot` for callers presenting `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it automatically). Without it the endpoint only refreshes when the snapshot is stale, like any read endpoint, so it cannot be abused to amplify load. | With a scheduler |
| `LOG_LEVEL` | pino level (`info` default). | Optional |

Nothing else is read from the environment. (`SESSION_SECRET` from the original template is not used anywhere.)

### Database schema

Apply the single table once (from your machine, with the same `DATABASE_URL`):

```bash
DATABASE_URL=postgres://... pnpm --filter @workspace/db run push
```

## 3. How the serverless deployment behaves

- **Snapshots are computed on demand.** A function instance recomputes the market snapshot when its in-memory copy is older than 45 s (one Base multicall pass + DexScreener, ≈0.5–3 s). Concurrent requests share one computation.
- **CDN caching absorbs traffic.** Read endpoints send `Cache-Control: public, max-age=15, s-maxage=30, stale-while-revalidate=60`, so a burst of visitors does not become a burst of RPC calls. Worst case a cached response is about two minutes behind the chain (snapshot age + CDN window); every payload carries its own `snapshotAtUtc` / block number, and the UI shows them.
- **History is traffic-driven unless you schedule refreshes.** Rows are written at most once every 50 s *when a snapshot is computed*; the check-and-insert runs under a Postgres advisory lock, so several instances computing at once still produce one row per stock. If nobody visits, nothing is recorded. To keep the 24-hour chart continuous:
  - **Vercel Pro:** add a cron in `vercel.json`:
    ```json
    "crons": [{ "path": "/api/cron/snapshot", "schedule": "* * * * *" }]
    ```
    (Hobby plan crons run at most once a day, which is not useful here.)
  - **Any plan:** point a free external pinger (cron-job.org, UptimeRobot, GitHub Actions on a schedule) at `https://<your-domain>/api/cron/snapshot` every minute with header `Authorization: Bearer <CRON_SECRET>`.
- **Nothing is faked.** If Base RPC and DexScreener both fail before the first snapshot on a cold instance, the API answers `503 snapshot_unavailable` and the UI says so. After a first success, failures keep the previous block-stamped snapshot and surface a warning.

## 4. Smoke test after the first deploy

Replace `APP` with your deployment URL:

- `APP/` — the Tape with 13 rows and a market-session badge
- `APP/api/healthz` → `{"status":"ok"}`
- `APP/api/cron/snapshot` → `{"ok":true,"mode":"on-demand","forced":true,...,"historyPersistence":"enabled"}` (send `Authorization: Bearer <CRON_SECRET>` when the secret is set; without a secret the response says `"forced":false`)
- `APP/api/overview`, `APP/api/stocks/NVDAc`, `APP/api/check?q=TSLAc`
- `APP/s/NVDAc`, `APP/check?q=TSLAc`, `APP/portfolio/jesse.base.eth`, `APP/embed/NVDAc`
- Reload `APP/s/NVDAc` after a couple of minutes: the premium-history chart should show points once rows exist.

## 5. Reproducing the Vercel build locally

```bash
pnpm install
pnpm run build:vercel            # writes .vercel/output/
node scripts/vercel-serve.mjs    # http://localhost:3000 — static + the bundled /api function
```

`scripts/vercel-serve.mjs` mimics Vercel's routing (static files, SPA fallback, `/api/*` → handler) so the exact bundle that ships can be exercised before pushing. It does not interpret `config.json`; the routing there follows the same pattern the SvelteKit and Astro Vercel adapters use (a catch-all `dest` pointing at one function, which receives the original request path and query), so Express sees `/api/overview`, not `/api`.

## 6. Custom domain

Project → Settings → Domains → add the domain, then set `PUBLIC_APP_URL` to it and redeploy so embeds and share links use the canonical host.
