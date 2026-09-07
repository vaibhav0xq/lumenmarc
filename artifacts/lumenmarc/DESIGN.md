# LumenMarc Design System (Phase 1)

**Concept**: A precision optical instrument in a dark observatory. The signature visual is "The Reference Line" — a luminous cyan horizon that represents the Chainlink reference price, with onchain pool prices measured against it.

## Tokens & Theme

**Fonts**:
- UI & Headings: `Geist` (`--font-sans`)
- Numbers & Monospaced: `Geist Mono` (`--font-mono`)
- Emphasized Hero Typography: `Instrument Serif` (`--font-serif`)

**Colors (HSL)**:
- Background: `225 30% 4%` (Extremely dark cinematic navy)
- Primary/Accents: Base Blue (`221 100% 50%`) and Cyan Glow (`188 86% 53%`)
- Deviation States:
  - `fair`: Mint (`152 69% 31%`)
  - `elevated`: Amber (`38 92% 50%`)
  - `dislocated`: Coral (`0 84% 60%`)
  - `unpriced`: Slate (`215 20% 65%`)
- Feed States: matched mapping (live = mint, held = slate, stale = amber, unavailable = coral)

## Shared Components

1. **`MarketMarquee`** (`src/components/layout/market-marquee.tsx`)
   - Animated ticker showing live premiums.
   - Used globally in the `Shell`.

2. **`ReferenceLineHero`** (`src/components/reference-line/reference-line-hero.tsx`)
   - The signature visual for the home page.
   - Props: `{ stocks: StockSummary[], overview: Overview | undefined }`
   - Dynamically maps Bps onto a ±400 bps grid, drawing marks above or below the line, with `deviationState` coloring.
   - Extremely high premiums are visually clamped at ±400 bps with a chevron indicator inside the dot.
   - On narrow screens (mobile), labels for non-extreme dots are hidden (tap-to-reveal) to prevent collisions. Marks are ordered horizontally by premium.

3. **`ReferenceLineInline`** (`src/components/reference-line/reference-line-inline.tsx`)
   - Row-scale reference line mark to embed the visual identity in lists and cards.
   - Props: `{ premiumBps: number | null, deviationState: string, size?: "sm" | "md", scaleBps?: number }`
   - Maps the premium onto a fixed scale (default 400 bps) drawing a vertical stem and state-colored dot. Use `size="sm"` for tables and `size="md"` for large cards.

4. **Status Badges** (`src/components/status-badges.tsx`)
   - `FeedStateBadge({ state })`
   - `DeviationStateBadge({ state })`
   - `PremiumColorText({ bps, state, children })`
   - `HealthDot({ isHealthy })`
   - Note: The visual language uses dark transparent backgrounds with solid borders to match the cinematic vibe.

## Motion & Interaction
- Uses `framer-motion` for transitions.
- Global entrance: `animate-in fade-in duration-700`.
- Reduced motion: Always respect `useReducedMotion()`.
- Easing: `[0.16, 1, 0.3, 1]` for smooth, physical settling motions.

## Notes for Phase 2
- Phase 2 will restyle `label.tsx`, `check.tsx`, `portfolio.tsx`, and `embed.tsx`.
- Use the shared status badges and `PremiumColorText` wherever numbers or states are shown.
- Use `ReferenceLineInline` in the check route results, portfolio positions, and label headers to connect the pages back to the signature visual.
- Maintain the exact data-testids as requested.
- Ensure all charts/visuals adhere to the minimal, data-first "Reference Line" aesthetic. No arbitrary charts — keep it tied to the exact numbers returned by the API hooks.
- Use `Geist Mono` with `tabular-nums` for all dynamic data.