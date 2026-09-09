import { useId } from "react";
import type { StockSummary } from "@workspace/api-client-react";
import { formatBpsBare } from "@/lib/utils";
import { INK } from "./comparator";
import { motion, useReducedMotion } from "framer-motion";

/*
 * The comparator's scale unrolled: −300 to +300 bps on a straight rule, the fair
 * band drawn heavy, every priced reading set on it as a pointer. Readings beyond
 * the limits pin at the hatched ends, as they do on the dial.
 */

const W = 1000;
const H = 150;
const X0 = 60;
const X1 = 940;
const AXIS = 78;
const PX_PER_BPS = (X1 - X0) / 600;
const xOf = (bps: number) => X0 + (Math.max(-300, Math.min(300, bps)) + 300) * PX_PER_BPS;

export function BandScale({ stocks }: { stocks: StockSummary[] }) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] as const };
  const priced = stocks
    .filter((s) => typeof s.primaryVenue?.premiumBps === "number")
    .map((s) => ({ ticker: s.ticker, bps: s.primaryVenue!.premiumBps! }))
    .sort((a, b) => a.bps - b.bps);

  /* Pointer labels alternate between two rows; labels sharing a row are nudged apart when readings crowd. */
  const labels = priced.map((r) => ({ ...r, x: xOf(r.bps) }));
  const spread = (step: number, need: number) => {
    for (let pass = 0; pass < 12; pass++) {
      for (let i = step; i < labels.length; i++) {
        const gap = labels[i].x - labels[i - step].x;
        if (gap < need) {
          const push = (need - gap) / 2;
          labels[i - step].x -= push;
          labels[i].x += push;
        }
      }
    }
  };
  spread(2, 88);
  spread(1, 26);
  for (const l of labels) l.x = Math.max(X0 - 30, Math.min(X1 + 30, l.x));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full font-mono" role="img" aria-label={`${priced.length} readings on a straight scale from −300 to +300 basis points.`} data-testid="band-scale">
      <defs>
        <pattern id={`${uid}-hatch`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK.ivory} strokeOpacity="0.5" strokeWidth="1" />
        </pattern>
      </defs>

      {/* dislocated ends */}
      <rect x={X0 - 22} y={AXIS - 9} width="22" height="18" fill={`url(#${uid}-hatch)`} stroke={INK.ivory} strokeOpacity="0.45" strokeWidth="0.8" />
      <rect x={X1} y={AXIS - 9} width="22" height="18" fill={`url(#${uid}-hatch)`} stroke={INK.ivory} strokeOpacity="0.45" strokeWidth="0.8" />

      {/* rule */}
      <line x1={X0} y1={AXIS} x2={X1} y2={AXIS} stroke={INK.ivory} strokeOpacity="0.6" strokeWidth="1" />
      <line x1={xOf(-50)} y1={AXIS} x2={xOf(50)} y2={AXIS} stroke={INK.ivory} strokeOpacity="1" strokeWidth="4.5" />
      {Array.from({ length: 61 }, (_, i) => -300 + i * 10).map((b) => {
        const major = b % 100 === 0;
        const mid = b % 50 === 0;
        const h = major ? 14 : mid ? 10 : 6;
        return <line key={b} x1={xOf(b)} y1={AXIS} x2={xOf(b)} y2={AXIS + h} stroke={INK.ivory} strokeOpacity={major ? 0.9 : mid ? 0.7 : 0.45} strokeWidth={major ? 1.6 : mid ? 1.2 : 1} />;
      })}
      {[-300, -200, -100, 0, 100, 200, 300].map((b) => (
        <text key={b} x={xOf(b)} y={AXIS + 32} fontSize="12" fill={INK.ivory} fillOpacity="0.8" textAnchor="middle">
          {b === 0 ? "0" : formatBpsBare(b)}
        </text>
      ))}
      {[-50, 50].map((b) => (
        <polygon key={b} points={`${xOf(b) - 5},${AXIS - 14} ${xOf(b) + 5},${AXIS - 14} ${xOf(b)},${AXIS - 5}`} fill={INK.ivory} fillOpacity="0.9" />
      ))}
      <text x={xOf(0)} y={AXIS + 54} fontSize="11" fill={INK.ivory} fillOpacity="0.5" textAnchor="middle">
        fair to ±50 · bps from reference
      </text>
      <text x={X0 - 11} y={AXIS + 54} fontSize="11" fill={INK.ivory} fillOpacity="0.5" textAnchor="middle">
        dislocated
      </text>
      <text x={X1 + 11} y={AXIS + 54} fontSize="11" fill={INK.ivory} fillOpacity="0.5" textAnchor="middle">
        dislocated
      </text>

      {/* readings */}
      {labels.map((r, i) => {
        const x = xOf(r.bps);
        const row = i % 2 === 0 ? 0 : 1;
        const ly = row === 0 ? 22 : 44;
        return (
          <motion.g key={r.ticker} initial={false} animate={{ x: x - X0 }} transition={transition}>
            <line x1={X0} y1={AXIS - 2} x2={X0} y2={AXIS - 22 - row * 22 + 12} stroke={INK.blue} strokeWidth="1.6" strokeLinecap="round" />
            <motion.line x1={X0} y1={AXIS - 22 - row * 22 + 12} x2={r.x - x + X0} y2={ly + 8} stroke={INK.ivory} strokeOpacity="0.35" strokeWidth="0.8" initial={false} animate={{ x2: r.x - x + X0 }} transition={transition} />
            <motion.text x={X0} y={ly} fontSize="11.5" fill={INK.ivory} fillOpacity="0.85" textAnchor="middle" initial={false} animate={{ x: r.x - x }} transition={transition}>
              {r.ticker} <tspan fill={INK.blue}>{formatBpsBare(r.bps)}</tspan>
            </motion.text>
          </motion.g>
        );
      })}
    </svg>
  );
}
