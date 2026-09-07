# LumenMarc — submission checklist

Quest: Base Build "Builder Quest" — Tokenized Stocks
Deadline as announced: **Wed Sep 9, 2026, 11:59 PM "EST"**. In September the US East Coast is on EDT (UTC−4), so treat the cutoff as **Thu Sep 10, 09:29 AM IST** — the earlier of the two possible readings. Aim to be fully submitted by **Wed Sep 9, 11:00 PM IST** at the latest (≈10 hours of buffer); Tue Sep 8 evening IST is better.

Working assumption for the mechanics (the announcement thread on X could not be read from the build environment): a Loom demo, a public app link, a public repo link, and an X post tagging @buildonbase. **Verify the exact steps in the quest thread before posting — see step 5.**

---

## 1. Public repository (produces the repo URL)

- [x] Repository: **https://github.com/vaibhav0xq/lumenmarc** (public, MIT, authored by @vaibhav0xq).
- [ ] Confirm `README.md` renders on GitHub and that the repo contains no secrets (`DATABASE_URL`, `BASE_RPC_URL` live only in Vercel/local `.env`, which is git-ignored).
- [ ] Every later change is pushed to `main` before it is deployed, so the repo and the live app never diverge.

## 2. Deploy on Vercel (produces the live URL)

Full guide: `docs/DEPLOY_VERCEL.md`.

- [ ] Vercel → Add New → Project → import `vaibhav0xq/lumenmarc` (owner: your own Vercel account, not a shared team). Framework preset **Other**, root directory = repository root, leave build/install commands to `vercel.json`.
- [ ] Environment variables before the first deploy: `BASE_RPC_URL` (a keyed Base RPC), `DATABASE_URL` (Neon Postgres; create it via Vercel Marketplace → Neon or neon.tech), `PUBLIC_APP_URL` (the final domain, can be added after the first deploy), `CRON_SECRET` (any long random string).
- [ ] Apply the schema once: `DATABASE_URL=... pnpm --filter @workspace/db run push`.
- [ ] Keep history continuous during the judging window: Vercel Pro → add the `crons` entry from the deploy guide; otherwise point cron-job.org (free) at `APP/api/cron/snapshot` every minute with `Authorization: Bearer <CRON_SECRET>`.
- [ ] Smoke-test the production URL (replace `APP`):
  - `APP/` renders the Tape with 13 rows and a market status
  - `APP/api/healthz` → `{"status":"ok"}`
  - `APP/api/cron/snapshot` → `"historyPersistence":"enabled"`
  - `APP/api/overview` has non-empty `dislocations`
  - `APP/s/NVDAc`, `APP/check?q=TSLAc`, `APP/portfolio/jesse.base.eth`, `APP/embed/NVDAc` load
- [ ] Wait two minutes and reload `APP/s/NVDAc` — the premium history chart should start showing points.
- [ ] Optional: attach a custom domain, then set `PUBLIC_APP_URL` to it and redeploy.

## 3. Put the real links into the README

- [ ] Add a line under the title: `Live: <APP URL> · Demo: <Loom URL>` next to the repo link.
- [ ] Push again (Vercel redeploys automatically from `main`).

## 4. Record the Loom

- [ ] Follow `docs/LOOM_SCRIPT.md`. Record against the **Vercel production URL**, not a preview deployment or the dev workspace.
- [ ] Length 2:00–3:00. Title: "LumenMarc — a clear market mark for tokenized stocks (Base Builder Quest)".
- [ ] Set the Loom to public / anyone with the link. Watch it once at 1× before posting.

## 5. Verify the submission mechanics (ask before posting)

- [ ] Open the quest thread: https://x.com/buildonbase/status/2095105190663766466 and read every reply from @buildonbase / @base.
- [ ] Confirm: is the submission the X post itself, a form, a Base Build project page, or a reply to the thread? Are there required tags, a hashtag, or a required Base Build account/project registration?
- [ ] If the quest is run through Base Build (build.base.org / base.dev), make sure the project exists there with the same name, links and description before posting.

## 6. The X post (draft — adjust to the verified mechanics)

> Built for the @buildonbase Builder Quest — Tokenized Stocks:
>
> LumenMarc — a clear market mark for tokenized stocks on Base.
>
> Before you touch a Coinbase Tokenized Stock onchain, it verifies the token is really Coinbase-issued, compares pool prices with the Chainlink reference (with oracle freshness), and shows what one token represents.
>
> Live on Base today it flags lookalike "NVDAc"/"MSTR" tokens, +10% premiums in thin pools, and a TSLAc pool that isn't USD-comparable at all.
>
> Read-only, no keys, public JSON API + embeddable cards.
>
> App: <APP URL>
> Demo: <Loom URL>
> Code: <GitHub URL>

Keep the wording informational: no "buy", "opportunity", "returns". Attach one screenshot of the Tape or the NVDAc label (desktop, dark).

## 7. Final pass before the post goes out

- [ ] Every link in the post opens in a private browser window.
- [ ] `APP/api/overview` is returning fresh data (`updatedAtUtc` within the last two minutes).
- [ ] The README's live/repo/demo links are correct.
- [ ] Note the post URL and the time submitted; leave the deployment untouched until results are announced (winners are notified by email, at Base's discretion).

## After submission

- Do not push to `main` (which redeploys production) during the judging window unless something is broken.
- If Base asks for eligibility or contact details, the product statement is: informational market-integrity tooling for Coinbase Tokenized Stocks on Base; non-custodial; no trading, routing or advice; intended for eligible non-US users and integrators.
