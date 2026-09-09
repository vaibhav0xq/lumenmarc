import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatBpsBare } from "@/lib/utils";
import { INK, feedStateText, type ComparatorReading } from "./comparator";

/*
 * The dimension figure: the two prices drawn as parallel lines with the deviation
 * dimensioned between them, the way a drawing calls out a gap. Not to scale (NTS):
 * the gap is fixed so the callouts stay legible whatever the reading.
 */

type Props = {
  reading: ComparatorReading | null;
  blockNumber: number | null;
  status: "loading" | "failed" | "ready";
  /** Draw at once instead of after the comparator's intro. */
  immediate?: boolean;
  /** Narrow variant without the venue and feed notes. */
  compact?: boolean;
  className?: string;
};

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DimensionFigure({ reading, blockNumber, status, immediate = false, compact = false, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion() ?? false;

  const W = compact ? 340 : 520;
  const H = compact ? 104 : 124;
  const top = compact ? 22 : 26;
  const bottom = compact ? 78 : 98;
  const x0 = 50;
  const x1 = compact ? 220 : 380;
  const ax = 28;
  const base = 0;

  const priced = reading && reading.premiumBps != null && reading.onchainPrice != null;
  const onchainAbove = priced && reading.onchainPrice! >= reading.referencePrice;
  const upper = priced
    ? onchainAbove
      ? { price: reading.onchainPrice!, kind: "onchain" as const }
      : { price: reading.referencePrice, kind: "reference" as const }
    : null;
  const lower = priced
    ? onchainAbove
      ? { price: reading.referencePrice, kind: "reference" as const }
      : { price: reading.onchainPrice!, kind: "onchain" as const }
    : null;

  const onchainNote = reading
    ? compact
      ? `onchain · ${reading.dexLabel ?? "no venue"}`
      : `onchain · ${reading.dexLabel ?? "no venue"} ${reading.ticker}${reading.quoteSymbol ? `/${reading.quoteSymbol}` : ""}${blockNumber ? ` · block ${blockNumber.toLocaleString("en-US")}` : ""}`
    : "";
  const referenceNote = reading
    ? compact
      ? `reference · Chainlink`
      : `reference · Chainlink ${reading.referenceDescription} · ${feedStateText(reading)}`
    : "";
  const note = (kind: "onchain" | "reference") => (kind === "onchain" ? onchainNote : referenceNote);

  const diff = priced ? reading.onchainPrice! - reading.referencePrice : null;
  const diffLabel = diff != null ? `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${fmt(Math.abs(diff))} USD${compact ? "" : " · NTS"}` : "";

  const draw = (delay: number) =>
    reduced
      ? { initial: false as const }
       : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { delay: base + Math.min(delay, 0.08), duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } };
  const fade = (delay: number) =>
    reduced
      ? { initial: false as const }
       : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: base + Math.min(delay, 0.08), duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? (compact ? "block h-auto w-full max-w-[340px] font-mono text-[12px]" : "block h-auto w-full max-w-[520px] font-mono text-[11.5px]")}
      role="img"
      aria-label={
        priced
          ? `${reading.ticker}: onchain ${fmt(reading.onchainPrice!)} against reference ${fmt(reading.referencePrice)}, ${formatBpsBare(reading.premiumBps)} basis points.`
          : "Dimension figure awaiting a priced reading."
      }
      data-testid="dimension-figure"
    >
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={INK.ivory} />
        </marker>
      </defs>

      {priced && upper && lower ? (
        <g key={`${reading.ticker}-${upper.kind}`} fill={INK.ivory}>
          <motion.line x1={x0} y1={top} x2={x1} y2={top} stroke={INK.ivory} strokeOpacity="0.85" strokeWidth="1" vectorEffect="non-scaling-stroke" {...draw(0)} />
          <motion.line x1={x0} y1={bottom} x2={x1} y2={bottom} stroke={INK.ivory} strokeOpacity="0.85" strokeWidth="1" vectorEffect="non-scaling-stroke" {...draw(0)} />
          <motion.g {...fade(0.3)}>
            <line x1={ax} y1={top} x2={ax} y2={bottom} stroke={INK.ivory} strokeOpacity="0.85" strokeWidth="1" vectorEffect="non-scaling-stroke" markerStart={`url(#${uid}-arrow)`} markerEnd={`url(#${uid}-arrow)`} />
            <line x1={ax} y1={top} x2={x0 - 6} y2={top} stroke={INK.ivory} strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1={ax} y1={bottom} x2={x0 - 6} y2={bottom} stroke={INK.ivory} strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={8} y={(top + bottom) / 2} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 8 ${(top + bottom) / 2})`} fillOpacity="0.9">
              {formatBpsBare(reading.premiumBps)} bps
            </text>
          </motion.g>
          <motion.g {...fade(0.45)}>
            <text x={x0} y={top - 9} fillOpacity="0.9">
              {fmt(upper.price)}
              <tspan fillOpacity="0.6" dx="8">
                {note(upper.kind)}
              </tspan>
            </text>
            <text x={x0} y={bottom + 17} fillOpacity="0.9">
              {fmt(lower.price)}
              <tspan fillOpacity="0.6" dx="8">
                {note(lower.kind)}
              </tspan>
            </text>
            <text x={x1 + 12} y={(top + bottom) / 2} fillOpacity="0.6" dominantBaseline="central">
              {diffLabel}
            </text>
          </motion.g>
        </g>
      ) : (
        <g fill={INK.ivory}>
          <motion.line x1={x0} y1={top} x2={x1} y2={top} stroke={INK.ivory} strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" {...draw(0)} />
          <motion.line x1={x0} y1={bottom} x2={x1} y2={bottom} stroke={INK.ivory} strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" {...draw(0)} />
          <motion.text x={x0} y={(top + bottom) / 2} fillOpacity="0.55" dominantBaseline="central" {...fade(0.35)}>
            {status === "failed"
              ? "no dimension · the last snapshot could not be read"
              : reading
                ? compact
                  ? `no dimension · ${reading.dexLabel ? `quoted in ${reading.quoteSymbol ?? "a non-USD asset"}` : "no venue"}`
                  : `no dimension · ${reading.dexLabel ?? "no venue"} quotes ${reading.ticker} against ${reading.quoteSymbol ?? "a non-USD asset"}`
                : "no dimension · waiting for the current block"}
          </motion.text>
        </g>
      )}
    </svg>
  );
}
