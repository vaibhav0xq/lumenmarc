> Phase 1 design notes, kept for history. The approved and shipped visual system is described in `docs/design/instrument-style.md`.

# LumenMarc Design System (Phase 1)

**Concept**: "The Instrument". A precision optical instrument. The signature visual is "The Reference Line" — a luminous cyan horizon that represents the Chainlink reference price, with onchain pool prices measured against it. Pages are built like an instrument's spec sheet: numbered sections, hairline rules, rails, and readouts. Never a grid of cards.

## Tokens & Theme

**Fonts**:
- UI & Headings: `Geist` (`--font-sans`)
- Numbers & Monospaced: `Geist Mono` (`--font-mono`), `tabular-nums`
- Emphasized Hero Typography: `Instrument Serif` (`--font-serif`)

**Colors (HSL)**:
- Background: `225 30% 4%` (Extremely dark cinematic navy)
- Base Blue: `221 100% 50%`
- Primary/Cyan Glow: `188 86% 53%`
- Status (Deviation & Feeds):
  - `fair` / `live`: Mint (`152 69% 31%`)
  - `elevated` / `stale`: Amber (`38 92% 50%`)
  - `dislocated` / `unavailable`: Coral (`0 84% 60%`)
  - `unpriced` / `held`: Slate (`215 20% 65%`)

**Surfaces (Tiers)**:
- **Plate** (`.surface-plate`): Base tier. Near-transparent fill, hairline border, 1px inner top highlight, machined-metal feel.
- **Glass** (`.surface-glass`): Floating tier. Blurred, reserved for sticky bars, tooltips, and the mobile drawer.

## Shared Components

1. **`MarketMarquee`** (`src/components/layout/market-marquee.tsx`)
   - Animated ticker showing live premiums. Reduced-motion aware.
   - Sits flush beneath the Navbar.

2. **`ReferenceLineHero`** (`src/components/reference-line/reference-line-hero.tsx`)
   - The instrument interface.
   - Props: `{ stocks: StockSummary[], overview: Overview | undefined }`
   - Dynamically maps premium Bps onto a graduated scale (±400 bps).
   - Desktop: full-bleed horizontal beam over a perspective bench. Marks settle symmetrically.
   - Mobile: Vertical ladder, X-axis represents premium, Y-axis stacks tokens to avoid collisions.

3. **`ReferenceLineInline`** (`src/components/reference-line/reference-line-inline.tsx`)
   - Row-scale reference line mark to embed the visual identity in lists and cards.
   - Props: `{ premiumBps: number | null, deviationState: string, size?: "sm" | "md", scaleBps?: number, className?: string }`
   - Renders a horizontal beam, fair band, vertical stem, and state-colored dot.

4. **Status Badges** (`src/components/status-badges.tsx`)
   - `FeedStateBadge({ state, className })`
   - `DeviationStateBadge({ state, className })`
   - `PremiumColorText({ bps, state, children })`
   - `HealthDot({ isHealthy, className })`
   - Badges use `.surface-plate` to sit flush and crisp against the dark theme.

## Motion & Interaction
- `src/lib/motion.ts` exports shared Framer Motion variants (`revealBeam`, `markSettle`, `fadeUp`, `valueTick`, `pageTransition`).
- Page transitions occur on route change via `<AnimatePresence>` in `App.tsx`.
- Reduced motion: Always respect `useReducedMotion()`.
- Easing: `[0.16, 1, 0.3, 1]` for physical settling.

## Notes for Phase 2 (Rules)
- Phase 2 will restyle `label.tsx`, `check.tsx`, `portfolio.tsx`, `embed.tsx`, and `about.tsx`.
- Connect all features back to the instrument theme. Avoid generic SaaS cards or grid layouts. Use sections, hairlines (`border-border/40`), and rails.
- Use `ReferenceLineInline` in check results, portfolio positions, and label headers to connect the pages back to the signature visual.
- Maintain the exact data-testids as requested.
- Ensure all charts/visuals adhere to the minimal, data-first "Reference Line" aesthetic. No arbitrary charts — keep it tied to the exact numbers. Null premium means "Unpriced". 
- Data formatting must strictly use `src/lib/utils.ts` (e.g. `formatBps`, `formatUsd`, `formatEt`).
