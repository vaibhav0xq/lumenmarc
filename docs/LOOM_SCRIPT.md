# LumenMarc — Loom demo script (target 2:30, hard stop 3:00)

**Setup before recording**
- Desktop browser at 1440 px wide, dark OS theme, one clean window, no other tabs visible.
- Open these tabs in order (the live app URL, not the workspace preview):
  1. `/`
  2. `/s/NVDAc`
  3. `/s/TSLAc`
  4. `/check?q=0xB20000000000000000000004255E0c2A4B401401`
  5. `/portfolio/jesse.base.eth`
  6. `/api/stocks/NVDAc` (browser JSON view or a terminal with `curl … | jq`)
- Reload the Tape 30 seconds before recording so the snapshot is fresh.
- Read the live numbers on the Tape first and say **those** numbers — never numbers from this script. The bracketed values below are what the app showed on Mon Sep 7, 2026 (US holiday, feeds held); on Tue/Wed during US hours the feeds will read `live` and premiums will differ.
- Tone: calm, factual, one idea per sentence. Say "shows", "measures", "verifies". Do not say "buy", "sell", "opportunity", "cheap", "profit", "should".

---

## 0:00 – 0:20 · Cold open (Tape, `/`)

> "This is LumenMarc — a clear market mark for tokenized stocks. Coinbase Tokenized Stocks launched on Base two weeks ago as B20 tokens. LumenMarc is a read-only integrity layer that answers three questions before anyone touches one of them onchain: is this token really Coinbase-issued, is this pool price fair against the real stock, and what does one token actually represent."

*Screen: let the reference-line instrument in the hero settle (marks are the 13 tokens, coloured by deviation state, ordered by premium, hollow marks are unpriced / no-supply tokens), hover one mark to show pool vs reference, then scroll slowly to the session strip.*

## 0:20 – 0:50 · The problem, with live evidence (Tape)

> "Everything here is measured live on Base — no mocks. The reference line is the whole product in one picture: the official Chainlink price is the line, every mark is a pool trading above or below it. The session strip tells you the US session state, because the Chainlink reference feeds only print while the US market trades. Right now they're **[held: last Friday's close]**."

*Screen: Integrity Alerts.*

> "The integrity alerts are the reason this exists. These are real tokens trading on Base today: **[a token called 'NVIDIA Curenncy' with the symbol NVDAc, a 'GOOGLc', a 'microstrategy' MSTR]**. Every one of them passes the B20 factory check and uses the same 0xB200 prefix as the real stocks. None of them is Coinbase-issued."

*Screen: scroll the Tape rows.*

> "And the real tokens themselves trade at very different distances from the reference — **[AMZNc more than ten percent above it in a very small pool, NVDAc about one percent above in the deep Aerodrome pool]**."

## 0:50 – 1:35 · The label (`/s/NVDAc`)

> "Open any stock and you get the label. **Verify**: five independent checks — the address is on Coinbase's published list, the factory confirms it's a B20 token, the onchain symbol matches, the Chainlink feed responds, nothing is paused. The address is the identity; the prefix and the name prove nothing on their own."

*Screen: scroll to Price.*

> "**Price**: the Chainlink reference on the left with its freshness state, the primary pool on the right with the premium in basis points and a plain-language explanation. Below it, every venue, and a 24-hour premium history."

*Screen: type 10000 in Size Check, toggle Buy → Sell.*

> "The size check estimates price impact for a given amount on the primary pool and combines it with the current premium into an all-in distance from the reference. It's labelled an estimate, because that's what it is."

*Screen: scroll to Own.*

> "**Own**: one token equals **[1.0]** share-equivalents today. Coinbase converts cash dividends into share-equivalents by raising the multiplier, and the total-return reference already reflects that — so this panel is where dividends and splits will show up."

## 1:35 – 2:00 · Refusing a fake number (`/s/TSLAc`)

> "This is the case I'm proudest of. The only TSLAc pool on Base is quoted against a third-party token, not USDC or ETH. A naive tool infers a dollar price from that and reports a **[three hundred percent]** premium. LumenMarc shows the inferred price, explains why it isn't comparable to the reference, flags the counter-asset, and declines to compute a premium or a size check. Unpriced is an honest state."

## 2:00 – 2:25 · Check anything (`/check?q=0xB2000…1401`)

> "Paste any address, ticker, pool, or Basename into Check. This is that 'MSTR' token: the verdict is a lookalike, and it points you to the official MSTRc address. Pools get a verdict too — the Aerodrome NVDAc pool comes back verified, with its premium."

*Optional if time allows — `/portfolio/jesse.base.eth`:*

> "Portfolio shows share-equivalents and reference-priced value for any wallet or Basename, read-only."

## 2:25 – 2:50 · It's infrastructure (`/api/stocks/NVDAc`)

> "Everything on screen is a public JSON API on the same host — overview, labels, history, size check, check, portfolio — with no key, plus an embeddable card. Wallets, aggregators and dashboards can put this label next to any tokenized-stock quote."

## 2:50 – 3:00 · Close

> "LumenMarc is informational: no custody, no routing, no advice. Coinbase issues the stocks for eligible non-US users; Base settles them; LumenMarc makes them legible. The next step is LumenGuard — a small onchain guard so a user can bound a swap by its distance from the reference. Thanks."

---

## If something is different on recording day

- **Feeds read `live` (US market open):** say "the feeds are printing live right now — during the US session the label compares two current prices; outside it, it tells you the reference is the last close."
- **TSLAc has gained a USDC/ETH pool:** use whichever row shows `UNPRICED` or a non-USD counter warning; if none, skip section 1:35 and spend the time on the AMZNc thin-pool alert instead ("a ten-percent premium in a four-thousand-dollar pool is a liquidity fact, not a price").
- **A lookalike has disappeared:** the `/check` example still works because the token exists onchain even if it is no longer trading.
- **An API call is slow:** `/check` reads the chain on demand; say "this reads the chain live" and wait. Do not refresh mid-sentence.
