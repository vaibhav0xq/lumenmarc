# Base Builder Quest — Tokenized Stocks
## Research brief → opportunity map → originality check → final pick (awaiting your approval)

Prepared 2026-09-07 (Monday) · All on-chain numbers measured live at Base block 50,995,152 (11:14 UTC) · Source registry: `research/sources.json` · Raw evidence: `research/sources/`

---

## 0. TL;DR and the clock

- **The quest ends Wednesday, Sep 9, 2026 at 11:59 PM EST — that is Thursday Sep 10, 09:29 AM IST.** It was announced Sep 2 (one-week quest). Prizes: **$2,000 for the top project, $3,000 split between 5 finalists ($600 each)**, chosen "at Base's discretion", winners notified by email. Submission starts with "Post a Loom…"; the remaining steps are in an X thread I could not read (see §1.10). We have roughly **60 hours**, so the recommendation below is scoped as a 48-hour build with buffer for the Loom and submission.
- **Recommendation: build "LumenMarc" — the fair-value and integrity layer for Coinbase Tokenized Stocks on Base.** One screen ("the label") that tells you, for any tokenized stock and any pool, three things before you trade: *is this token really Coinbase-issued, is this price fair versus the official reference, and what exactly will I own* — plus a tiny onchain **guard** that lets you swap with a max-deviation-from-the-real-stock bound, and alerts. It's original (nothing like it exists on any chain), maximally compliance-safe (factual, non-custodial, no advice), deeply B20-specific (multiplier, registry, Chainlink total-return feeds, feed freezes), and demoable with **real evidence measured this morning**: NVDAc was trading +1.05% over Friday's close on a Sunday, AMZNc +10.6% on a $3.7K pool, and a "TSLAc" pair was quoting **3.6× the real price** against a lookalike token called StudentCoin that sits at a `0xB2000…` address.
- Runner-up: **Heirloom** (time-locked, eligibility-gated stock gifts). Strong story, but it's the example Base itself put in the Request for Builders, so it will be a crowded lane, and it needs an escrow contract holding securities — more legal and engineering risk than 48 hours should carry.

---

## 1. Research brief

### 1.1 What Coinbase Tokenized Stocks on Base actually are
- Launched natively on Base on **Aug 24, 2026** as **B20** tokens — a Base-native superset of ERC-20 implemented as **precompiles** (the token addresses return no bytecode; there is no Basescan-verified source to read). Issued by **Coinbase Onchain SPV Ltd. (ADGM)** under Coinbase's **ADGM FSRA** authorization, offered under **Regulation S** to **eligible non-US persons only**. Each token is a **beneficial claim** on one real share held 1:1 in a bankruptcy-remote trust structure with **Alpaca** as the regulated broker/custodian (Coinbase's page says "direct senior claim"; Galaxy notes legal title stays with the trust). [Base launch post](https://blog.base.org/tokenized-stocks) · [coinbase.com/tokenize](https://www.coinbase.com/tokenize) · [Galaxy](https://www.galaxy.com/insights/research/coinbase-tokenized-stocks-base-third-party-issuer-sec-innovation-exemption)
- **Secondary holding and trading are permissionless** (any wallet, any DEX, any DeFi protocol). KYC exists only at the **mint/redeem** edge (authorized participants). Coinbase can still enforce blocklist/allowlist **policies**, pause functions, and seize under legal order. [Base docs](https://docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base)
- **Dividends are not paid in cash.** They are reinvested into shares and expressed through an onchain **multiplier** (WAD, 1e18). Balances never change; the redemption ratio does. Splits work the same way. Corporate actions are announced onchain (`Announcement` / `EndAnnouncement`) and routine ones are **scheduled in advance** (ERC-8056 `updateUIMultiplier`). Helper reads: `multiplier()`, `scaledBalanceOf`, `toScaledBalance`, `toRawBalance`. Transfers can carry a `bytes32` memo (`transferWithMemo`). Extra metadata (ISIN/CUSIP) via `extraMetadata(key)`. [Base docs](https://docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base)
- **Price oracle:** Chainlink "Coinbase <TICKER>" feeds are the official reference. They are **total-return values** (already multiplier-adjusted), 8 decimals, updated during US market hours on 0.5% deviation / 24h heartbeat, **frozen when the market is closed and during corporate actions**. You must check `updatedAt`. DEX prices do not feed the oracle. [Base docs — price feeds](https://docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base)

### 1.2 Eligibility and the front-end's obligations
- Verified rule: **Reg S, eligible jurisdictions outside the US only.** No first-party list of permitted/restricted countries surfaced (the prospectus PDFs linked from base.org/stocks did not render in any fetch). Treat "non-US" as *necessary, not sufficient*. [base.org/stocks](https://www.base.org/stocks)
- Base's Request for Builders states plainly that **every developer is solely responsible** for securities, commodities, banking, tax, sanctions and consumer-protection compliance, and that selection is not endorsement. [RFB](https://blog.base.org/request-for-builders-tokenized-stocks)
- The SEC's Jan 28, 2026 statement: tokenized equity is still a security. The Apr 13, 2026 SEC staff statement on user interfaces describes the lower-risk pattern: **self-custodial, user-initiated, user-controlled parameters, no recommendations/solicitation, no custody/execution/discretion, neutral objective routing, no "best price" claims, prominent disclosures, flat product-agnostic fees only.** That is a US framework, but it is the clearest published checklist for "interface, not broker" and we should design to it anyway. [SEC UI statement](https://www.sec.gov/newsroom/speeches-statements/staff-statement-regarding-broker-dealer-registration-certain-user-interfaces-utilized-prepare-staff-statement-regarding-broker-dealer-registration-certain-user-interfaces-utilized)
- ESMA warned that tokenized stocks cause "investor misunderstanding" because holders are usually not shareholders of record → any consumer surface should state the precise claim (beneficial claim on a share held in trust; issuer Coinbase SPV; custodian Alpaca; no voting; prospectus link). [ESMA](https://www.esma.europa.eu/press-news/esma-news/eu-supervisory-authorities-warn-consumers-risks-and-limited-protection-certain) · [Reuters](https://www.reuters.com/sustainability/boards-policy-regulation/european-regulator-says-tokenised-stocks-risk-investor-misunderstanding-2025-09-01)
- Eligibility tooling that exists on Base: **Coinbase Verifications** EAS attestations (Verified Account schema `0xf8b05c79…f0de9`, Verified Country schema `0x1801901f…ca065`, EAS `0x4200…0021`, indexer `0x2c7eE1E5…619C`). Coinbase says they are informational, not compliance determinations; country is optional. Useful as a *hint*, not a gate you can rely on legally. [coinbase/verifications](https://github.com/coinbase/verifications)

### 1.3 Tickers, contracts, and what is really live (measured today)
All 13 B20 tokens exist; **10 have circulating supply**; **all multipliers are exactly 1.0** (no dividend or split has been processed yet — the first live corporate action is ahead of us: third-party calendars put NVDA's next ex-dividend date at Sep 10). Full table with feed addresses and pool addresses: `research/onchain-snapshot-2026-09-07.md`.

| Token | Address | Supply (tokens) | Chainlink ref (Fri close) | Best pool | Pool price | Premium | Pool liquidity | 24h vol |
|---|---|---|---|---|---|---|---|---|
| NVDAc | 0xb200…108C | 13,731 | $229.96 | Aerodrome/USDC | $232.38 | **+1.05%** | $2.49M | $3.04M |
| GOOGLc | 0xb200…58B7 | 6,114 | $338.71 | Aerodrome/USDC | $339.24 | +0.16% | $1.64M | $2.86M |
| AAPLc | 0xb200…d1fb | 6,194 | $320.08 | Aerodrome/USDC | $320.74 | +0.21% | $1.42M | $2.67M |
| METAc | 0xb200…707C | 2,229 | $615.23 | Aerodrome/USDC | $613.22 | −0.33% | $1.27M | $2.42M |
| MSFTc | 0xB200…872B | 560 | $499.78 | Aerodrome/USDC | $504.69 | +0.98% | $118K | $488K |
| SNDKc | 0xb200…10c5 | 141 | $1,732.87 | Aerodrome/USDC | $1,784.69 | +2.99% | $175K | $333K |
| SPCXc | 0xb200…CBd5 | 5,723 | $148.10 | Uniswap v3/USDC | $151.37 | +2.21% | $28K | $503 |
| MSTRc | 0xb200…883d | 1,528 | $142.63 | Uniswap v4/USDC | $148.51 | +4.12% | $3.9K | $800 |
| AMZNc | 0xb200…C2E8 | 2,975 | $257.69 | Uniswap v4/ETH | $284.91 | **+10.56%** | $3.7K | $68 |
| TSLAc | 0xb200…0cD0 | 1,727 | $353.33 | Uniswap v4/**STC** | $1,274.94 | **+261%** | $110K | $7.7K |
| COINc / CRCLc / INTCc | 0xb200… | 0 | $184.74 / $101.66 / $95.62 | — | — | — | — | — |

Implied onchain float ≈ **$11.5M**. Registry: `0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`. Note base.org/stocks still labels six of these "coming soon" — the page lags the chain.

Two facts from this table drive the recommendation:
1. **The reference price is 24/5; the tokens are 24/7.** Every night and every weekend the "fair" price is unobservable to a normal user, and pools drift (even the deepest pool sat ~1% rich on a Sunday). Standard slippage protection compares you with the pool's own quote, so it cannot protect you from paying a 10% or 261% premium to the real stock.
2. **Lookalikes are already here.** `STC` at `0xB200000000000000000000CfCD1d711EEf213b01` is "StudentCoin", a third-party B20 token (B20 is asset-agnostic; anyone can create one). The `0xB2000…` prefix does **not** mean Coinbase issued it. Coinbase's own page says: if a token is not on the list, Coinbase did not issue it.

### 1.4 Official contracts, APIs, and docs a builder needs
- Technical guide (B20 mechanics, policies, pauses, announcements, feeds): docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base · B20 spec + playground · "Launch a B20 token" guide (saved under `research/sources/b20-product-technical-*`).
- Chainlink feed proxies for all 13 (e.g., NVDA `0x04689a41629776563E6822F76f2e57D148d28513`, AAPL `0x787f13dEa48Db0897CbCDD985de77809D837F988`; complete list in the snapshot file).
- Base stack: **Base Account** (passkeys, `pay()` in USDC, Spend Permissions, Sub Accounts), **MiniKit / Base.dev** (mini apps inside Base App, manifest signing, notifications), **OnchainKit** (Identity/Basenames, Wallet, Transaction, Swap, Fund), **0x Swap API** (`GET /swap/allowance-holder/quote`, chain 8453), **CDP Onramp** (server-side session tokens), **Coinbase Verifications** (EAS). Sources: `research/sources/gapfill-02-base-account-sdk.md`, `gapfill-03-coinbase-verifications.md`, `base-builder-quest-*`.
- Offchain market data: DexScreener / GeckoTerminal public APIs (pools, liquidity, OHLCV), CoinGecko/CMC listings, Steakhouse's Dune dashboard.

### 1.5 Official do's and don'ts (Base + Coinbase)
- **Do** identify tokens by address, not symbol (metadata is mutable). Discover via `B20Created`. Apply the multiplier for share-equivalents. Check `isAuthorized(policyID, account)` before assuming a transfer will succeed (`approve()` is not policy-gated). Monitor pauses. Index `Announcement` events. Check feed `updatedAt`; expect frozen feeds off-hours and around corporate actions. Reconstruct price series with `MultiplierUpdated` history.
- **Don't** describe tokens as "shares you own outright" without the beneficial-claim caveat; don't serve US persons or restricted jurisdictions; don't promise dividend yields (dividends arrive net of withholding as share fractions); don't rely on the DEX price as the oracle; don't assume a `0xB2000…` address is Coinbase's.
- Base's RFB explicitly welcomes: neobrokerages, personalized indexes, gifting/rewards (incl. time locks), yield stripping/credit, memes/agents — and explicitly disclaims any regulatory cover for builders. [RFB](https://blog.base.org/request-for-builders-tokenized-stocks)

### 1.6 Existing projects and competitors (what's crowded, what's empty)
On Base, the day-one directory lists ~50 integrations: trading surfaces (Base App, Bitget, OKX, Fomo, Aerodrome, Uniswap, 0x/1inch/Matcha/Kyber/CoW), lending (Aave live per Base; Morpho/Euler listed without evidence of funded markets), vaults (Beefy, Origin, Superform), perps/options (Wasabi), agents/social (Virtuals, Treasures, Bankr, Avici, ZyfAI, Maestro, Banana Gun), portfolio/index (Glider, Treasures), analytics (Steakhouse Dune, SoSoValue), compliance/identity (Clearstar, Castar). [base.org/stocks](https://www.base.org/stocks)

Off Base: **xStocks/Backed** (Jersey SPV tracker certificates, Solana/Kraken; 60+ names; Kraken ran a 60-builder hackathon in April), **Ondo Global Markets** ($1B+ TVL, BVI notes), **Dinari** (SEC broker-dealer, permissioned dShares), **Robinhood Chain** (Arbitrum L2, EU), **Securitize**, **Superstate**; cautionary history: Mirror/Synthetix synthetics.

| Category | Crowded by | Empty / weak today |
|---|---|---|
| Neobrokerage | Base App, Bitget, OKX, Fomo, Coinbase | local-currency EM onramps (but heavy) |
| Personalized indexes | Glider (build/copy/automate), Treasures, ZyfAI | B20-native baskets, oracle-scored recipes |
| Gifting & rewards | nothing onchain; Bits of Stock offchain | **onchain gift vaults / time locks** |
| Yield & credit | Aave (live), Morpho/Euler (listed) | yield stripping — structurally weak (no cash flows, sub-1% yields on these 13) |
| Memes & agents | Virtuals, Bankr, Treasures, Maestro | memestock pairs (gimmicky, risky) |
| Compliance & safety | Clearstar, Castar (identity/perks) | **issuer verification, fair-value, pre-trade integrity** |
| Dev infra | Chainlink, 0x, LI.FI, Enso | **B20-aware SDK/components** |
| Consumer UX | wallets, Definitive | **multiplier-aware ownership ledger, corporate-action calendar** |
| Data/analytics | Steakhouse Dune, SoSoValue | per-trade, real-time premium/discount |
| Social/viral | Avici, Bankr, Glider copy | attestable performance (adviser-risk adjacent) |

### 1.7 Legal and compliance risks by feature (from the legal workstream)
- Lowest risk: factual market data, education, ownership math, alerts. Medium: user-initiated non-custodial swaps through neutral routing. Higher: recommendations, personalized/AI baskets (adviser-like), agent-run portfolios (discretion), custody-like escrows, rewards that distribute securities as promotions, gifting to unverified recipients (Reg S offer to a US person), yield products that "promise" returns.
- Layered eligibility is the norm: geo-block US/restricted IPs, explicit eligibility attestation, sanctions screening for any product that moves funds, re-check at transaction time, honor token-level policies.
- Withholding happens before dividend reinvestment; no B20-specific tax workflow exists — an informational surface should show "net reinvested share fraction" and never gross yield.

### 1.8 What wins Base quests (verified vs inferred)
- Verified: the previous 2026 round asked for **autonomous OpenClaw agents transacting on Base**, drew **125+ entries**, paid **2 ETH** to the winner and **0.75 ETH** to four finalists (AxiomBot, PumpClaw among them). Winners were working things on mainnet. No public rubric exists; selection is "at Base's discretion". [results thread](https://x.com/buildonbase/status/2028580552853672176)
- Inferred (high confidence from Base's own materials): judges reward (a) tight relevance to *their* standard — B20 specifics handled correctly, (b) live on Base mainnet, (c) use of the Base stack (Base Account, mini app in Base App, Basenames, OnchainKit), (d) a crisp Loom with a real user moment, (e) originality against the 50-name directory, (f) a story that helps the ecosystem look safe and serious — Base repeated "eligible jurisdictions outside the US" in its own posts.

### 1.9 Why the obvious lanes are traps for a 2-day quest
- Swap/portfolio UIs: Base App already is one; aggregators cover routing.
- AI/agent portfolios: crowded (Virtuals, Bankr, ZyfAI) and adviser/discretion risk.
- Yield stripping: the 13 names pay ~0–0.7% dividends and B20 delivers them as share fractions, not cash — nothing to strip.
- Lending loops: need funded markets with published parameters (not verifiable today) and add liquidation risk during frozen-feed windows.
- Prediction markets / memestock pairs: derivatives/gambling and promotion risk.

### 1.10 Blocked or unverified — please read
- **Submission steps beyond "Post a Loom"** (tags, form, base.dev listing, deadline for the post itself) — the X thread is unreadable from here (X API returned 402; mirrors fail). *If you can open x.com/buildonbase/status/2095105190663766466 and paste the steps, I'll fold them into the plan.*
- The **prospectus** (permitted-country schedule, transfer legends, redemption fees, insolvency waterfall) did not render from base.org/stocks.
- **Aave/Morpho/Euler parameters** for these tokens, **Base App country availability**, and a trustworthy **holder count** were not found.
- No Coinbase multiplier update has occurred yet; the first one (NVDA ex-div ~Sep 10) will be the first live test of the whole ecosystem's dividend handling — and a live moment for our product.

---

## 2. Opportunity map (16 ideas across the 10 categories)

Scores 1–10. Axes: **O** originality · **B** Base relevance · **U** usefulness for tokenized stocks · **W** demo wow · **F** feasibility (by Sep 9) · **C** compliance safety · **T** technical defensibility · **J** judge appeal · **V** viral potential · **Σ** /90.

| # | Category | Idea | O | B | U | W | F | C | T | J | V | Σ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Compliance & safety | **LumenMarc** — verified-issuer + fair-value label + guarded swaps + alerts | 9 | 9 | 9 | 8 | 8 | 9 | 8 | 9 | 6 | **75** |
| 2 | Consumer UX | Ownership Ledger — multiplier-aware share-equivalents, dividend/split history, corporate-action calendar (folds into LumenMarc as a module) | 8 | 8 | 8 | 5 | 7 | 9 | 7 | 7 | 3 | 62 |
| 3 | Data/analytics | 24/7 "fair value tape" — premium/discount across all 13 vs reference (folds into LumenMarc) | 7 | 8 | 7 | 7 | 8 | 8 | 5 | 6 | 6 | 62 |
| 4 | Gifting | **Heirloom** — time-locked, eligibility-gated stock gifts with memos + Basenames | 6 | 8 | 7 | 8 | 5 | 5 | 6 | 8 | 8 | 61 |
| 5 | Dev infra | B20 Kit — React hooks/components for multiplier-aware balances, feeds, corporate actions (open-source byproduct of LumenMarc) | 7 | 9 | 7 | 4 | 7 | 9 | 6 | 7 | 3 | 59 |
| 6 | Consumer UX | Stock Savings Plan — recurring USDC→stock buys via Base Account Spend Permissions | 5 | 9 | 8 | 6 | 5 | 5 | 6 | 7 | 5 | 56 |
| 7 | Personalized indexes | Recipes — open weight recipes, user-executed, scored from Chainlink total-return | 5 | 7 | 7 | 6 | 5 | 5 | 5 | 6 | 7 | 53 |
| 8 | Compliance & safety | Eligibility pre-flight SDK — `canReceive(token, wallet)` combining policies + attestations | 7 | 8 | 6 | 3 | 7 | 8 | 6 | 6 | 2 | 53 |
| 9 | Rewards | Equity cashback for merchants via Base Pay hooks | 6 | 7 | 6 | 6 | 3 | 3 | 4 | 5 | 6 | 46 |
| 10 | Social/viral | Earnings Night — live rooms around after-hours moves, 24/7 trading | 4 | 6 | 5 | 7 | 4 | 4 | 3 | 5 | 8 | 46 |
| 11 | Neobrokerage | Local-stablecoin stock kiosk (BRZ/MXNe/cNGN → stock) | 4 | 8 | 7 | 5 | 4 | 4 | 3 | 5 | 5 | 45 |
| 12 | Personalized indexes | AI preference-to-basket ("no fossil, tilt AI") | 4 | 6 | 6 | 7 | 5 | 3 | 3 | 5 | 6 | 45 |
| 13 | Yield & credit | Multiplier-aware borrowing manager on Aave/Morpho | 5 | 7 | 6 | 4 | 3 | 5 | 6 | 5 | 3 | 44 |
| 14 | Memes & agents | Agent paper-trading arena on live onchain data | 4 | 6 | 4 | 6 | 5 | 6 | 3 | 4 | 6 | 44 |
| 15 | Memes & agents | Memestock LP launcher (meme + equity pairs, fees buy stock) | 5 | 7 | 3 | 6 | 4 | 2 | 3 | 4 | 8 | 42 |
| 16 | Yield & credit | Dividend PT/YT stripping | 6 | 6 | 3 | 3 | 2 | 4 | 5 | 3 | 2 | 34 |

### Top 3 explained
**1) LumenMarc (75).** Solves a problem that only exists because of tokenized stocks: a 24/7 asset priced against a 24/5 reference, in an ecosystem where anyone can mint a `0xB2000…` lookalike. It gives every trade a "nutrition label" (verified issuer · fair-value gap · liquidity/impact · oracle status · share-equivalents), enforces the user's own fair-value bound onchain, and alerts on dislocations and corporate actions. It is factual and non-custodial, so it sits on the safe side of every regulator's line — the closest TradFi analog is the **premium/discount disclosure ETFs are required to publish**, which tokenized stocks have nowhere. It is also mostly *reads*, which is why it fits the deadline.

**2) Heirloom (61).** "Give your niece 0.1 NVIDIA that unlocks on her 18th birthday, in a wallet only she can claim." Emotionally strongest demo, and B20's `transferWithMemo` + Basenames + Coinbase Verifications make a very Base-native version. Held back by: it is the RFB's own example (expect several entries), an escrow contract holding securities invites custody questions, gifting a security to an unverified recipient is a Reg S exposure, and a safe time-lock contract deserves more than 48 hours of testing.

**3) Stock Savings Plan (56).** Recurring, non-custodial buys through Spend Permissions is a genuinely nice Base-Account showcase, but Glider already automates stock portfolios on Base and Coinbase/Base App offer recurring buys; a keeper executing scheduled trades also pushes the app toward "execution" rather than "interface".

Ideas 2, 3 and 5 are not lost — they become LumenMarc modules (Ledger, Tape) and its open-source SDK.

---

## 3. Strict originality check

### LumenMarc
| Who built something similar | How close | What's missing there |
|---|---|---|
| ETF issuers' premium/discount pages (TradFi) | Same concept (market price vs NAV) | Nothing onchain, nothing per-trade, nothing 24/7 |
| DexScreener / GeckoTerminal | Show pool price, liquidity, volume | No reference price, no issuer verification, no multiplier, no oracle status, no guard |
| Chainlink feeds | Provide the reference | Raw number only; no comparison, no UX, no lookalike detection |
| Steakhouse Dune, SoSoValue | Aggregate analytics | Not pre-trade, not real-time per pool, no enforcement |
| Uniswap/1inch/0x slippage protection | Protects execution vs. **the pool quote** | Cannot detect a pool that is itself dislocated (AMZNc +10.6%, TSLAc +261%) |
| Uniswap token warnings, wallet scam lists | Generic scam heuristics | Don't know the Coinbase list, the registry, or the multiplier |
| Clearstar / Castar | Compliance identity, shareholder perks | Not price integrity, not pre-trade |
| Coinbase's own "if not on this list…" | Static page | No programmatic check, no pool-level view |

**Unique angle:** slippage versus *the real stock*, not versus the pool — enforced onchain by a user-set bound against the Chainlink total-return reference, with staleness semantics that respect B20's freeze behaviour. **Why it only makes sense on Base:** the B20 registry + Coinbase's fixed address list + Chainlink total-return feeds + Aerodrome/Uniswap liquidity + permissionless secondary trading all exist together only here; xStocks/Ondo tokens have different oracle and multiplier semantics. **Verdict: original. Build.**

### Heirloom (gift vaults)
Closest: Stockpile/GiveAShare (offchain US gifting), Bits of Stock (offchain rewards), Sablier/Hedgey/Superfluid (generic ERC-20 vesting — would technically time-lock a B20 today), Peanut-style claim links, "The Index" reward token on Robinhood Chain. Nothing does eligibility-gated claims for tokenized securities. **But** the concept is the RFB's own example → crowded among entrants; the differentiator (attestation-gated claim + refund on expiry + memo receipts) is real but subtle in a 2-minute Loom; escrow of securities and Reg S recipient risk need counsel-grade thought. **Verdict: original-enough, strategically second. Keep as fallback.**

### Stock Savings Plan
Closest: Glider (automated stock portfolios on Base, card onramp), Balmy/Mean-style DCA, Coinbase/Base App recurring buys. **Verdict: incremental and partially crowded; rejected.**

---

## 4. Final idea — **LumenMarc** (20-point spec)

> Working title "LumenMarc" (the finance term for spot-vs-reference spread, and it's on Base). Alternates if you prefer: **Fairshare**, **Tape**.

1. **One-liner.** LumenMarc is the fair-value and integrity layer for Coinbase Tokenized Stocks on Base: before you trade, it verifies the token, compares the pool price with the official reference, and shows exactly what you'll own — and it can enforce your fair-value bound onchain.

2. **Problem.** Tokenized stocks trade 24/7 against a reference that updates 24/5. Every night and weekend the "right" price is invisible to normal users, pools drift (NVDAc +1.05% on a Sunday with $2.5M liquidity; AMZNc +10.6% on a $3.7K pool), lookalike B20 tokens exist (StudentCoin "STC" quoting TSLAc at 3.6×), and dividends arrive as an invisible multiplier rather than cash — so people don't know what they bought, at what premium, or what they own.

3. **Users.** (a) Eligible non-US retail traders using Base App / wallets; (b) integrators — wallets, aggregators, lenders — who need a pre-trade check and corporate-action awareness; (c) the Base/Coinbase ecosystem itself (fewer "I got scammed / I paid 10% over" moments).

4. **Why now.** Launched 14 days ago; long tail still illiquid; first-ever multiplier update imminent (NVDA ex-div ~Sep 10); Base's own posts stress eligibility and safety; no one has shipped this.

5. **Why Base.** B20 registry and Coinbase's address list make "verified issuer" deterministic; Chainlink total-return feeds are official; Aerodrome/0x liquidity is here; Base Account, Basenames and Base App mini apps give distribution and identity; gas is cheap enough to enforce the guard onchain.

6. **Why tokenized stocks (and not crypto in general).** Crypto has no off-hours reference and no issuer; the premium/discount problem, the multiplier, the frozen-feed windows and the "is this the real one" question are unique to tokenized securities.

7. **Core flow.** Open LumenMarc → pick a stock or paste any token/pool → **Label** appears: ✅ Coinbase-issued (address match) or ⚠️ lookalike · reference price + age + market status · pool price, premium/discount, liquidity, your-size impact · multiplier & share-equivalents, scheduled corporate actions, prospectus/custody facts, eligibility notice → optional **Guarded swap**: set max deviation vs reference (default 1%) and staleness tolerance → sign once (Base Account) → tx routes via 0x through `LumenGuard`, which reverts if the realized price breaches your bound → **Position** view (share-equivalents) → **Alerts** (premium < x%, market open, corporate action scheduled) delivered as Base App notifications.

8. **MVP features (must ship by Sep 9).**
   - Label engine for all 13 tokens + arbitrary address/pair input (verified-issuer check, reference vs pool, liquidity, impact via 0x quote, multiplier, market status, oracle staleness, lookalike warning).
   - Home "tape": live premium/discount strip across all 13 with sparklines from our 1-minute snapshots.
   - Guarded swap via `LumenGuard` on Base mainnet (USDC↔stock, 0x route, user-set bounds, no fee).
   - Wallet/identity via Base Account + OnchainKit (Basenames), geo-gate + eligibility acknowledgement, disclosures.
   - Public JSON API `GET /api/label/:address?amount=` + embeddable label card.
   - Base App mini app (MiniKit manifest) with at least one notification type.
   - Open-source repo + README + Loom.

9. **Stretch (only if time remains).** Corporate-action calendar from `Announcement`/ERC-8056 scheduled updates; per-wallet dividend ledger once the first multiplier update lands; EAS "LumenMarc check" attestations; share-card OG images ("NVDAc +1.05% vs Friday close — Sunday 11:14 UTC"); Telegram/email alerts; Coinbase Verifications eligibility hint badge.

10. **Onchain components.** `LumenGuard.sol` (~100 lines): `guardedSwap(params)` pulls the user's input token, executes the 0x AllowanceHolder calldata, reads the Chainlink feed, checks `updatedAt` against the user's `maxStaleness` (or explicit `allowStale`), and requires `amountOut ≥ expectedOut × (1 − maxDeviationBps)` where expectedOut derives from the reference price; refunds any dust; emits `GuardedSwap(user, token, refPrice, execPrice, deviationBps)`. Immutable, no admin, no fees. Foundry tests + mainnet deploy (a few dollars of ETH).

11. **Offchain components.** Next.js app on Replit: viem multicall readers (B20 metadata, multiplier, `isAuthorized`, pause flags; Chainlink rounds), venue service (DexScreener/GeckoTerminal pools + 0x quotes for impact), label rules engine with published thresholds, Postgres snapshot worker (1-min premium/discount history, alert evaluation), API routes, MiniKit notification sender, geo-gate middleware.

12. **Data sources.** B20 token contracts + registry; Chainlink feeds (13 addresses); coinbase.com/tokenize + docs.base.org address list (pinned in code, refreshed manually); DexScreener/GeckoTerminal; 0x Swap API v2; NYSE calendar (2026 holidays hard-coded); optional Coinbase Verifications EAS.

13. **Compliance posture.** Informational and consumer-protective by design: objective, published thresholds; neutral language ("premium 1.05% vs reference", never "buy/sell/cheap/expensive"); no recommendations, portfolios or discretion; non-custodial; user sets every parameter; venues sorted by objective factors; no fees, no PFOF; US and restricted IPs geo-blocked with an eligibility acknowledgement; prominent disclosures (not a broker, not advice, tokens are beneficial claims on shares held in trust by Coinbase's SPV/Alpaca, dividends reinvested net of withholding, prospectus link); logs of methodology and parameters. This mirrors the SEC staff's interface conditions and ESMA's disclosure ask even though our audience is non-US.

14. **Demo script (Loom, ≤3 min).** 0:00 "It's Sunday. Wall Street is closed. NVIDIA is trading on Base right now — is $232 fair?" → 0:20 NVDAc label: verified ✓, reference $229.96 (Friday close, 40h old — expected), Aerodrome +1.05%, $2.49M liquidity, $1,000 impact 0.04%, 1 token = 1.0000 shares → 0:50 paste the TSLAc/STC pair: red label, "STC is StudentCoin, not Coinbase-issued; quote is 3.6× the reference" → 1:10 AMZNc: +10.6% on $3.7K, "dislocated" → 1:30 guarded buy of $25 NVDAc with 1% bound: signs with Base Account, tx on Basescan shows `GuardedSwap` event; then show a bound-breach revert → 2:10 set alert "NVDAc premium < 0.5%" inside Base App → 2:30 `curl /api/label/0xb200…108C` + embed snippet → 2:50 "24/7 tokens, 24/5 reference. LumenMarc is the fair-value layer."

15. **Originality (one paragraph).** No product on any chain performs pre-trade issuer verification plus fair-value comparison plus oracle-state awareness for tokenized stocks, and none enforces a fair-value bound onchain; existing slippage protection is pool-relative, existing dashboards are aggregate, existing compliance tools are identity-focused. Evidence of need is live and measurable today.

16. **Risks and mitigations.** 0x may lack routes for thin tokens → fall back to Aerodrome/Uniswap deep links and label-only mode. Public RPC rate limits → use a keyed RPC (Alchemy/CDP) with multicall + caching. Data-provider limits → 60s cache and snapshot table. Feed frozen during a corporate action → label shows "frozen: corporate action", guard requires explicit `allowStale`. "Premium" read as advice → neutral copy, thresholds documented, disclosures. Guard bugs → minimal code, Foundry tests, tiny demo amounts, "no guarantees" copy. Mini-app manifest signing needs your Base App/Farcaster account → do it early. Scope creep → the MVP list above is the cut line.

17. **Milestones (≈60h to deadline; work plan 48h).** H0–6 scaffold, readers, label engine, deploy skeleton · H6–16 venues, impact, lookalike detection, tape, label UI · H16–26 LumenGuard (tests, mainnet deploy), guarded swap flow with Base Account · H26–34 snapshot worker, alerts, MiniKit manifest, Basenames, API + embed · H34–42 QA on live data, copy/disclosures, geo-gate, README, open-source · H42–48 Loom, post, submit — target submission by **Tuesday Sep 9 evening IST**, a full 12 hours before the cutoff.

18. **Replit tech stack.** Next.js 15 + TypeScript + Tailwind + shadcn/ui; viem + wagmi; OnchainKit + MiniKit; Base Account SDK; 0x Swap API v2; Drizzle + Replit Postgres; a lightweight worker (node-cron) for snapshots/alerts; Foundry for `LumenGuard.sol`; Vitest for the label engine; deployed on Replit with a custom domain if available. Secrets needed from you: 0x API key, a keyed Base RPC URL, a deployer key funded with ~$10 of Base ETH, your Base App/Farcaster account to sign the mini-app manifest, Loom.

19. **UI/UX direction.** "Bloomberg calm, Base clean": dark canvas, tabular numerals, one hero card per token with three stacked bands — **Verify / Price / Own** — each with a plain-English sentence; a thin live tape across the top; colour used only for the deviation state (fair / elevated / dislocated / unverified) with the wording always neutral; mobile-first because it ships as a Base App mini app; a shareable label card for X/Farcaster.

20. **Exact next coding steps (in order).**
    1. Create the project; set secrets; pin the 13 token + 13 feed + registry addresses in `lib/b20/addresses.ts` with the official-source comment.
    2. `lib/b20/read.ts`: multicall readers (name/symbol/decimals/totalSupply/multiplier/isAuthorized/paused) + `lib/feeds.ts` (latestRoundData, staleness) + `lib/market-hours.ts` (NYSE calendar/state).
    3. `lib/venues.ts`: DexScreener/GeckoTerminal pools + 0x quote for user-size impact; `lib/label.ts`: rules engine (verified / lookalike / fair / elevated / dislocated / frozen) with unit tests.
    4. Routes: `/` (tape + search), `/s/[address]` (label), `/check?address=…|pair=…`, `/api/label/[address]`; snapshot worker + `snapshots` table.
    5. `contracts/LumenGuard.sol` + Foundry tests; deploy to Base mainnet; wire guarded swap UI with Base Account + 0x allowance-holder flow.
    6. MiniKit manifest, notifications, Basenames identity, geo-gate middleware, disclosures; README; Loom.

---

## 5. What I need from you before any code

1. **Approve LumenMarc** (or pick Heirloom / ask for changes). If approved, I move this into a Replit project and start step 1 immediately.
2. **The submission steps** from the X thread (x.com/buildonbase/status/2095105190663766466) — I can't read it from here.
3. Confirm you can provide, when asked: a 0x API key (free tier), a keyed Base RPC URL, ~$10 of Base ETH on a fresh deployer key, and your Base App/Farcaster account for the mini-app manifest signature.
4. Name preference: LumenMarc / Fairshare / Tape / your own.

---

## Appendix A — key addresses (Base mainnet)
B20 registry `0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD` · NVDAc `0xb20000000000000000000078ee7ce2fE4908108C` · AAPLc `0xb200000000000000000000C2e324d24d7eEcd1fb` · GOOGLc `0xb2000000000000000000002D0BA3164cc74f58B7` · METAc `0xb2000000000000000000008bC8786B856E61707C` · MSFTc `0xB200000000000000000000Ab99cFa739E253872B` · AMZNc `0xb200000000000000000000d9192b6B456483C2E8` · TSLAc `0xb2000000000000000000001e800a7f5189430cD0` · MSTRc `0xb2000000000000000000004884b426556b92883d` · SNDKc `0xb200000000000000000000397293Cb8cda9a10c5` · SPCXc `0xb2000000000000000000007b9fcbd005511aCBd5` · COINc `0xb200000000000000000000c85a31389D71F3ecfb` · CRCLc `0xB20000000000000000000019f6E7C675b73C2e4D` · INTCc `0xB2000000000000000000004AFF16039bA04bdFBc` · Chainlink NVDA `0x04689a41629776563E6822F76f2e57D148d28513` · AAPL `0x787f13dEa48Db0897CbCDD985de77809D837F988` · GOOGL `0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2` · META `0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D` · MSFT `0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c` · AMZN `0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295` · TSLA `0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4` · MSTR `0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a` · SNDK `0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA` · SPCX `0x6A634B235903C4ad6376892180d6fF8612e3Fa68` · COIN `0x408e44f504A7371a345F03a73dDC96A4b48e8aa7` · CRCL `0x0231cF2635D1E17bB5c2462cc7504Ba1fBd61f33` · INTC `0xAB657C39bac0D5886250D70849e2E3E008F2EECB` · USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` · Coinbase Verifications EAS `0x4200000000000000000000000000000000000021`, indexer `0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C`.

## Appendix B — source registry
See `research/sources.json` (27 entries, tiered, with local evidence paths) and the full subagent reports in `research/subagent-*.md`.
