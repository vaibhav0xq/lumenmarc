# LumenMarc: the instrument style (page restyle brief)

LumenMarc is a read-only fair-value and integrity layer for Coinbase Tokenized Stocks (B20) on Base.
Tone: informational, factual, never investment advice. Coinbase issues the tokens (not Base, not LumenMarc).
Author credit everywhere it fits: "Built by vaibhav0xq · github.com/vaibhav0xq".

The approved look is a dark, engineering-drawing "market instrument". Reference implementations you must match
(read them before writing anything):

- `artifacts/lumenmarc/src/pages/readings.tsx`: the instrument page (rail / dial / sheet / status strip)
- `artifacts/lumenmarc/src/pages/landing.tsx` + `artifacts/lumenmarc/src/components/landing/sections.tsx`: landing chapters
- `artifacts/lumenmarc/src/components/instrument/sheet-panel.tsx`: how facts are laid out (label / figure / note rows)
- `artifacts/lumenmarc/src/components/instrument/comparator.tsx`: the dial (`Comparator`, `readingFromStock`, `INK`)
- `artifacts/lumenmarc/src/components/instrument/premium-trace.tsx`: 24 h SVG trace (`PremiumTrace`)
- `artifacts/lumenmarc/src/components/instrument/dimension-figure.tsx`: dimensioned gap (`DimensionFigure`)
- `artifacts/lumenmarc/src/components/instrument/rail.tsx`: `Rail`, `MiniScale`, `BY_WIDTH`
- `artifacts/lumenmarc/src/components/layout/Shell.tsx`: navbar/footer (edit only if your task assigns it)
- `artifacts/lumenmarc/src/index.css`: theme tokens (do not edit)

## Vocabulary

- Background bench `#0A0C10` (`bg-background`), panel face `#0D0F14` / `#14161B`, ivory ink `#ECE7DA` (`text-foreground`),
  accent blue `#4C7DFF` (`text-primary`), dislocated red via `text-dev-dislocated`.
- Type: display serif = Newsreader (`font-display` on Tailwind, headings are serif by default via h1/h2 styles),
  body = Inter (default), figures/labels = IBM Plex Mono (`font-mono`, add `tnum` for tabular numerals).
- Mono labels are lowercase-or-sentence-case, small (10.5–12px), `text-foreground/45..58`. **Never uppercase tracked labels.**
- Structure is drawn with hairlines: `border-foreground/10..20`, sections separated by `border-t/border-b`, rows are
  `grid` or `flex` with `border-b border-foreground/20 py-3.5`. Page containers: `mx-auto w-full max-w-[1600px] px-5 sm:px-8 xl:px-12`.
- Figures: mono, large (20–46px), ivory; the premium in basis points in blue; states in words ("fair", "elevated", "dislocated",
  "unpriced", "held", "live") set in mono or serif: never a coloured pill.
- Buttons: square (no radius), `h-11/h-12`, mono 13px; primary = `border border-foreground bg-foreground text-background`,
  secondary = `border border-foreground/40 text-foreground hover:border-foreground`. Inputs: square, `border-foreground/30`,
  `focus-within:border-foreground`, transparent background.
- Links inside prose: `underline underline-offset-4`.
- Charts: only the SVG components above (PremiumTrace, DimensionFigure, MiniScale, Comparator). No recharts.
- Motion: the object's own behaviour, never decoration. Use the primitives in `src/components/motion.tsx`: `Reveal` (one soft rise per block, once, in view), `Figure` (a number that glides to its new value and jumps straight to the first one: never counts up from zero), `Tick` (one-line slide swap for block numbers/labels), `Arrow` (nudges on `group` hover): plus `pageTransition` from `src/lib/motion.ts`. The needle is a spring; the rail tick and band-scale pointers slide; the sheet crossfades on token change. No entrance cascades, no staggered lists. Reduced motion is respected by every primitive; for framer SVG attribute animation put `initial={false}` on the element itself.

## Hard no-gos (rejected by the user in earlier rounds)

Rounded "cards" with tinted backgrounds, gradient text, glow/bloom/neon, glassmorphism, pill badges, uppercase tracked
mono labels ("terminal cosplay"), emoji or decorative icons, tile grids of stats, fake charts or placeholder data,
big flat blue blocks, receipts, generic SaaS light theme, screenshot-in-a-frame, particles/dot grids/globes/marquees,
italic serif display, entrance cascades. Icons only where they carry meaning (external link arrows are fine as text "→").

## Language rules (visible copy, aria labels, titles, alt text)

- No em dashes or en dashes anywhere in copy. Use a period, a colon, parentheses or a short hyphen instead. The only
  allowed dash-like glyph is the true minus sign in signed figures ("−21").
- No comma before "and" or "or" in a list ("A, B and C", never "A, B, and C").
- No emojis, no decorative unicode. No AI-sounding slogans, aphorisms or contrast pairs ("X, not Y." / "It's not A. It's B.").
  Write short, factual, human sentences. No hype words (revolutionary, seamless, powerful, unlock, elevate, effortless).
- Empty values are never a dash. Say what is true: "loading" (query pending), "unavailable" (read failed), "unpriced",
  "no supply", "no reading", "history building". The reason must come from the data, never be invented.
- Every number on screen is live (from the API) or is a labelled methodology constant (the ±50 / ±300 bps band
  thresholds, the 20-minute stale rule, the 360×240 embed frame, "1 bps = 0.6°" dial scale). Never type a number that
  looks like a live value.

## Data rules

Real data only, straight from the generated hooks in `@workspace/api-client-react`. Failed reads show the error text
(`apiErrorMessage`), never a silent fallback. Non-USD-quoted pools are "unpriced", never zero. Held Chainlink prints are
labelled "held" with the ET time of the last print (`formatEt(iso, "time")`). Keep every piece of information the current
page shows unless it is decorative; you may re-order and re-group it.

## Process

- Work only in the files you were assigned. Do not edit shared components, `Shell.tsx`, `App.tsx`, `index.css`, or the
  generated API client. Do not delete files (the main agent will clean up unused legacy components afterwards).
- Keep `data-testid` attributes on interactive and key informational elements.
- Typecheck with `pnpm --filter @workspace/lumenmarc run typecheck` from the repo root; it must pass.
- Verify visually with `node docs/research/tools/shoot-url.mjs "http://127.0.0.1:80/<path>" <out.png> 1440 900 1 4000`
  and at `390 844` (mobile). Look at the PNG you produced and fix what is wrong before reporting. The dev server is already
  running behind `http://127.0.0.1:80/` (do not restart workflows). Save screenshots under `screenshots/`.
