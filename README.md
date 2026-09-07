# LumenMarc

**A clear market mark for tokenized stocks.**

LumenMarc is a read-only fair-value and integrity layer for **Coinbase Tokenized Stocks (B20 tokens) on Base**. Before anyone touches a tokenized stock onchain, it answers three factual questions in one screen:

| Pillar | Question | How LumenMarc answers it |
| --- | --- | --- |
| **Verify** | Is this token really the Coinbase-issued stock, or a lookalike? | Address pinned against Coinbase's published list, B20 factory check, onchain symbol/name, Chainlink feed presence, pause flags |
| **Price** | Is this pool price fair versus the real stock? | Live DEX pool prices compared with the official Chainlink "Coinbase &lt;TICKER&gt;" total-return reference, with premium/discount in bps, oracle freshness and US-market session state |
| **Own** | What does one token actually represent? | Multiplier, share-equivalents, dividend/custody policy, ISIN, supply cap, corporate-action status |

Everything is computed from public onchain and public API data. There is no wallet connection, no custody, no order routing and no recommendation — LumenMarc is informational market-integrity infrastructure, not a brokerage and not investment advice.

Built for the **Base Build "Builder Quest" — Tokenized Stocks** (September 2026) by **[Vaibhav (@vaibhav0xq)](https://github.com/vaibhav0xq)**.

Repository: [github.com/vaibhav0xq/lumenmarc](https://github.com/vaibhav0xq/lumenmarc) · Deployment guide: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) · License: MIT

---

## Why this exists

Coinbase Tokenized Stocks launched natively on Base on Aug 24, 2026 as B20 tokens. Within two weeks the onchain market already showed every failure mode a retail user could walk into. All of the following was measured live by LumenMarc on Mon Sep 7, 2026 (US Labor Day, market closed):

- **Lookalikes pass the obvious checks.** Anyone can deploy a B20 token, and B20 addresses share the `0xB200…` prefix. A token named "NVIDIA Curenncy" with the symbol `NVDAc`, a token called `GOOGLc`, and a "microstrategy"/`MSTR` token at `0xB20000000000000000000004255E0c2A4B401401` were all trading. All three pass `B20Factory.isB20()`. None is Coinbase-issued.
- **Pool prices drift far from the real stock.** `AMZNc` traded **+10.6%** above the Chainlink reference in a $3.7K Uniswap v4 pool; `MSTRc` +3.7%; `SNDKc` +3.1%. The only `TSLAc` pool is quoted against a third-party token ("STC"), which made its inferred USD price read **~4× the real stock** — a number that is meaningless, and that LumenMarc refuses to turn into a premium.
- **Reference prices freeze when the US market is closed.** The Chainlink feeds hold Friday's last print over weekends and holidays while pools trade 24/7. Users need to know whether a "gap" is expected (feed *held*) or anomalous (feed *stale*).
- **Ownership is not 1 token = 1 share forever.** Cash dividends are converted to share-equivalents by raising the token's multiplier; the total-return reference price already reflects this. Nothing in a wallet or DEX UI shows it.

LumenMarc turns those facts into a label that a person can read in five seconds and a JSON API that any wallet, aggregator or dashboard can embed.

---

## Judge's quick tour (about 60 seconds)

Paths below are relative to the deployed app. The API is mounted at `/api` on the same host.

| Step | Open | What you will see |
| --- | --- | --- |
| 1 | `/` | The **Tape**: US session state, integrity alerts (lookalikes, dislocations, non-USD counter-assets, zero-supply tokens), all 13 Coinbase stocks with reference vs. pool price |
| 2 | `/s/NVDAc` | A full **label**: Verify (five checks), Price (reference, primary pool, all venues, 24h premium history, size check), Own (multiplier, share-equivalents, dividend policy, ISIN, pauses) |
| 3 | `/s/TSLAc` | The **unpriced** case: the only pool quotes TSLAc against a third-party token, so LumenMarc shows the inferred price with a danger warning and declines to compute a premium or a size check |
| 4 | `/check?q=0xB20000000000000000000004255E0c2A4B401401` | **Lookalike verdict**: a third-party B20 "MSTR" token, with the official MSTRc address shown |
| 5 | `/check?q=0x853F5f1B92b16714Fe6CDA67CAad0856B83C7ab9` | **Pool verdict**: the Aerodrome NVDAc/USDC pool, verified and priced against the reference |
| 6 | `/portfolio/jesse.base.eth` | **Share-equivalents** for any address or Basename (read-only; this wallet really holds small positions in six Coinbase stocks) |
| 7 | `/embed/NVDAc` | The **embeddable card** |
| 8 | `/api/overview` · `/api/stocks/NVDAc` · `/api/check?q=TSLAc` | The same data as **JSON**, no key required |

The "Post" button on every label produces a neutral, ready-to-share summary for X or Farcaster.

---

## What is on the screen

**Feed state** — freshness of the Chainlink reference, judged against the NYSE calendar:

| State | Meaning |
| --- | --- |
| `live` | Printing during the regular session (or within the last 15 minutes in extended hours) |
| `held` | US market closed; the feed holds the last regular-session print. Expected, not an error |
| `stale` | Market open for more than 20 minutes with no new print. Anomalous |
| `unavailable` | The feed could not be read or returned a non-positive answer |

**Deviation state** — pool price versus the reference:

| State | Threshold |
| --- | --- |
| `fair` | within 50 bps |
| `elevated` | 50 to 300 bps |
| `dislocated` | more than 300 bps |
| `unpriced` | no pool, no readable reference, or the only pool is quoted against an asset that is not USD-comparable |

**Venue ranking** — pools whose counter-asset is USDC, ETH/WETH or another Coinbase-issued stock rank first, then by liquidity; the first is the *primary* venue that drives the headline. Pools below $25K liquidity carry a thin-liquidity warning. Pools quoted against anything else keep their inferred USD price but never produce a premium.

**Size check** — a constant-product *estimate* of price impact for a given USD amount on the primary pool, combined with the current premium into a signed all-in figure (premium + impact for buys, premium − impact for sells). It is an approximation, not a guaranteed bound, and it is refused when the primary pool is unpriced.

---

## Public JSON API

All endpoints are `GET`, unauthenticated and served under `/api`. The contract is `lib/api-spec/openapi.yaml`; responses are validated server-side against the generated Zod schemas before they leave the process.

| Endpoint | Returns |
| --- | --- |
| `/api/market` | US session state (open / premarket / afterhours / closed / holiday), next open/close |
| `/api/overview` | Everything on the Tape: session, integrity alerts, aggregate float and liquidity, all stocks ranked by dislocation |
| `/api/stocks` | Compact rows for all 13 stocks |
| `/api/stocks/{ticker}` | The full label (`summary`, `verify`, `price`, `own`, `supply`, `venues`, `pauses`, `metadata`, `corporateActions`, `disclosures`, `history`, `shareText`) |
| `/api/history?ticker=NVDAc&window=24h` | Premium history points (reference, pool price, premium bps, feed state) |
| `/api/size-check?ticker=NVDAc&amountUsd=10000&side=buy` | Estimated impact and all-in vs. reference for a size; `422` when the venue is unpriced |
| `/api/check?q=…` | A verdict for a ticker, token address, pool address, Uniswap v4 pool id, wallet address or Basename |
| `/api/portfolio/{account}` | Positions, share-equivalents and reference-priced value for an address or Basename |
| `/api/healthz` | Liveness |

Example:

```bash
curl -s "$APP/api/check?q=0xB20000000000000000000004255E0c2A4B401401" | jq '{kind, verdict, headline}'
# {
#   "kind": "lookalike-b20",
#   "verdict": "danger",
#   "headline": "Not a Coinbase stock: \"MSTR\" is a third-party B20 token imitating MSTRc"
# }
```

Embeddable card: `/embed/{ticker}` (works in an iframe).

---

## How it works

```
Base mainnet ──(viem multicall, public RPCs)──┐
  • 13 B20 tokens: symbol, name, decimals,     │
    totalSupply, supplyCap, multiplier,         │
    isPaused(mint/burn/transfer), extraMetadata │      ┌──────────────────────┐
  • B20 factory isB20()                         ├────▶ │  Label engine        │
  • 13 Chainlink "Coinbase <TICKER>" feeds      │      │  feed state          │      ┌───────────────┐
    latestRoundData, description, decimals      │      │  venue ranking       │ ───▶ │ Express API    │ ───▶ React UI
  • Basenames L2 resolver (forward + reverse)   │      │  premium / deviation │      │ /api/*         │      / , /s/:ticker,
                                                │      │  alerts, lookalikes  │      │ (Zod-validated)│      /check, /portfolio,
DexScreener public API ─────────────────────────┤      │  share-equivalents   │      └───────────────┘      /embed/:ticker
  • every Base pool for the 13 tokens           │      └──────────┬───────────┘
  • lookalike scan by ticker                    │                 │
                                                │                 ▼
NYSE calendar (2026–2028, in repo) ─────────────┘      Postgres: premium_snapshots (60 s, 14-day retention)
```

- **Snapshot worker** refreshes every 60 seconds: one un-chunked multicall for tokens, one for feeds, one DexScreener sweep, then classification and persistence. Requests are served from the in-memory snapshot; `/check` and `/portfolio` read the chain on demand.
- **Identity is the address.** The pinned official list (`artifacts/api-server/src/lib/b20/addresses.ts`) is the only thing that makes a token "Coinbase-issued". `isB20()`, the `0xB200…` prefix and onchain metadata are displayed but never trusted, because third-party tokens satisfy all three.
- **Nothing is mocked.** Every number on screen comes from a Base RPC call, a Chainlink round, DexScreener, or arithmetic on those. When a source is unavailable the UI says so instead of showing a placeholder: a feed that cannot be read is `unavailable`, a pool that is not USD-comparable is `unpriced` with no premium, a failed onchain read keeps the previous block-stamped snapshot (shown on the Tape) rather than substituting defaults, and the API answers 503/502 with a reason before its first successful read.

### Onchain facts LumenMarc relies on

- B20 tokens are Base-native precompiles at `0xB200…` addresses (no bytecode, no verified source). `paused()` reverts; feature pauses are read with `isPaused(uint8)`. `extraMetadata("isin")` is exposed with a lowercase key. `scaledBalanceOf` returns share-equivalents.
- Chainlink "Coinbase &lt;TICKER&gt;" feeds have 8 decimals and are total-return: the multiplier and the reference stay comparable after dividends.
- Issuer: Coinbase Onchain SPV Ltd. (ADGM), Regulation S, eligible non-US persons only. Base is the network; Coinbase is the issuer.

---

## Repository map

```
artifacts/api-server/           Express 5 API (mounted at /api)
  src/lib/b20/addresses.ts      The 13 official tokens + feeds, factory, quote assets  ← source of truth
  src/lib/b20/{abi,chain,readers}.ts   ABIs, viem client (fallback RPCs), multicall readers
  src/lib/market/hours.ts       NYSE session calendar and state
  src/lib/label/engine.ts       Feed/deviation classification, venue ranking, alerts, label copy
  src/lib/venues/dexscreener.ts DexScreener client (bounded cache)
  src/lib/snapshot/worker.ts    Snapshot refresh (background worker or on-demand), lookalike scan, persistence
  src/routes/                   market, overview, stocks, history, size-check, check, portfolio, cron
  src/index.ts / src/vercel.ts  Long-running server entry / serverless handler entry
artifacts/lumenmarc/            React + Vite + Tailwind front end (Tape, label, check, portfolio, embed, about)
artifacts/mockup-sandbox/       Internal component-preview sandbox used during design work (not deployed)
lib/api-spec/openapi.yaml       API contract → Orval → lib/api-zod + lib/api-client-react
lib/db/                         Drizzle schema (premium_snapshots); optional at runtime
scripts/vercel-build.mjs        Assembles the Vercel Build Output (static site + /api function)
docs/DEPLOY_VERCEL.md           Deployment guide and environment variables
docs/research/                  The research brief, opportunity map, originality check and source registry behind the product
docs/LOOM_SCRIPT.md             Demo script
docs/SUBMISSION_CHECKLIST.md    Submission checklist
```

## Running locally

Requirements: Node.js 20+ (22 recommended), pnpm 10 (`corepack enable` picks up the pinned version). Postgres is optional.

```bash
git clone https://github.com/vaibhav0xq/lumenmarc.git && cd lumenmarc
pnpm install
cp .env.example .env                        # every variable is optional; see the file for what each enables
# DATABASE_URL=postgres://...              → premium history (run the schema push below once)
# BASE_RPC_URL=https://...                 → keyed Base RPC; public RPCs with fallbacks are used otherwise
pnpm --filter @workspace/db run push        # only if DATABASE_URL is set: creates premium_snapshots
pnpm --filter @workspace/api-server run dev # API on $PORT (default 8080), mounted at /api, background refresh every 60 s
pnpm --filter @workspace/lumenmarc run dev  # UI on $PORT (default 5173); /api is proxied to the API in dev
```

`pnpm run typecheck` checks every package. Editing `lib/api-spec/openapi.yaml` requires `pnpm --filter @workspace/api-spec run codegen`.

No API keys are required for anything in this repository. A keyed Base RPC only makes refreshes more reliable.

## Deploying

The project is set up for **Vercel** (static front end + one serverless function for `/api`). Import the repo, add the environment variables, deploy — the full walkthrough, the environment-variable table and how history behaves on serverless are in **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)**.

```bash
pnpm run build:vercel            # reproduces the Vercel build locally → .vercel/output/
node scripts/vercel-serve.mjs    # serves that output on http://localhost:3000
```

Any Node host works too: `pnpm --filter @workspace/api-server run build` produces `dist/index.mjs` (listens on `PORT`, keeps the background refresh loop), and `BASE_PATH=/ pnpm --filter @workspace/lumenmarc run build` produces the static site in `artifacts/lumenmarc/dist/public`.

| Variable | Required | What it does |
| --- | --- | --- |
| `BASE_RPC_URL` | no (recommended) | Keyed Base RPC endpoint; public RPCs with fallbacks otherwise |
| `DATABASE_URL` | no | Postgres for the premium-history series; without it history endpoints answer `history_disabled` |
| `PUBLIC_APP_URL` | no | Canonical origin for share text and embed snippets |
| `CRON_SECRET` | no | Bearer secret for `GET /api/cron/snapshot` (scheduled refreshes on serverless hosts) |
| `LOG_LEVEL` | no | pino log level, default `info` |

---

## Positioning and disclosures

- LumenMarc is **informational**. It does not execute, route, recommend or solicit trades, and it never promises returns. Text throughout the product is factual and neutral by design.
- Coinbase Tokenized Stocks are issued by Coinbase (Coinbase Onchain SPV Ltd., ADGM) under Regulation S and are **not available to US persons**. Base is the settlement network, not the issuer.
- LumenMarc is an independent data layer and is **not affiliated** with Coinbase, Base or Chainlink.
- Onchain pool prices come from permissionless DEX pools that can be thin or volatile; nothing here guarantees execution at any price. Data may be delayed; verify onchain before acting.

## Known limits (stated on purpose)

- Public Base RPCs and DexScreener's public API are the data sources; both are rate-limited, so the snapshot cadence is 60 seconds and `/check` may take a few seconds on a cold address.
- The NYSE holiday calendar is maintained in-repo through 2028 and logs a warning beyond that.
- No Coinbase corporate action (dividend or split) had been processed onchain as of Sep 7, 2026, so the corporate-action panel currently shows the multiplier state rather than a history of events.
- Premium history only accumulates while the server is running.

## Roadmap (not part of this submission)

- **LumenGuard**: a small onchain guard that lets a user bound a swap by maximum deviation from the Chainlink reference (user-initiated, neutral routing).
- Alerts (feed stale, dislocation, lookalike appearing) and a Base App mini app.

## Research

`docs/research/base-builder-quest-report.md` contains the full research brief (market structure, issuer/legal posture, existing app layer, scored opportunity map of ideas, originality check and the 20-point spec LumenMarc was built from), with the source registry in `docs/research/sources.json` and captured evidence in `docs/research/sources/`.

## Author and license

Designed and built by **Vaibhav** — [github.com/vaibhav0xq](https://github.com/vaibhav0xq). Released under the [MIT License](LICENSE).

LumenMarc is an independent project. It is not affiliated with, endorsed by, or operated by Coinbase, Base, or Chainlink; "Coinbase Tokenized Stocks" and "B20" refer to Coinbase's publicly documented products and contracts.
