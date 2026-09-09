import { useId } from "react";
import type { HistoryPoint } from "@workspace/api-client-react";
import { formatBpsBare, formatEt } from "@/lib/utils";
import { INK } from "./comparator";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/*
 * The last 24 hours of the reading as a strip trace: premium in basis points against
 * time, the fair band shaded, the reference feed's state (live or holding the last
 * print) drawn as a bar under the trace. Gaps in the pool price are left as gaps.
 */

type Props = {
  points: HistoryPoint[];
  height?: number;
  className?: string;
  dense?: boolean;
};

const W = 720;

export function PremiumTrace({ points, height = 200, className, dense = false }: Props) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const H = height;
  const padL = 8;
  const padR = dense ? 44 : 52;
  const padT = 14;
  const feedBar = 6;
  const padB = dense ? 30 : 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB - feedBar - 6;

  const sorted = [...points].sort((a, b) => Date.parse(a.tUtc) - Date.parse(b.tUtc));
  const priced = sorted.filter((pt) => pt.premiumBps != null);
  if (sorted.length < 2 || priced.length === 0) {
    return (
      <div className={className}>
        <p className="font-mono text-[12px] text-foreground/58">no priced history in the last 24 h</p>
      </div>
    );
  }

  const t0 = Date.parse(sorted[0].tUtc);
  const t1 = Date.parse(sorted[sorted.length - 1].tUtc);
  const span = Math.max(1, t1 - t0);
  const lo = Math.min(...priced.map((pt) => pt.premiumBps!));
  const hi = Math.max(...priced.map((pt) => pt.premiumBps!));
  const yMin = Math.floor(Math.min(-60, lo - 15) / 50) * 50;
  const yMax = Math.ceil(Math.max(60, hi + 15) / 50) * 50;
  const x = (t: number) => padL + ((t - t0) / span) * plotW;
  const y = (bps: number) => padT + ((yMax - bps) / (yMax - yMin)) * plotH;

  /* Trace segments, broken wherever the pool had no price. */
  const segments: string[] = [];
  let d = "";
  for (const pt of sorted) {
    if (pt.premiumBps == null) {
      if (d) segments.push(d);
      d = "";
      continue;
    }
    d += `${d ? " L" : "M"} ${x(Date.parse(pt.tUtc)).toFixed(2)} ${y(pt.premiumBps).toFixed(2)}`;
  }
  if (d) segments.push(d);

  /* Feed-state bar: runs of live vs held/stale. */
  const runs: { from: number; to: number; state: string }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i].feedState ?? "unknown";
    const t = Date.parse(sorted[i].tUtc);
    const last = runs[runs.length - 1];
    if (last && last.state === s) last.to = t;
    else runs.push({ from: t, to: t, state: s });
  }

  const gridStep = yMax - yMin > 400 ? 200 : yMax - yMin > 200 ? 100 : 50;
  const gridVals: number[] = [];
  for (let v = yMin; v <= yMax; v += gridStep) gridVals.push(v);
  const hours = 6;
  const timeTicks: number[] = [];
  for (let t = t0; t <= t1; t += hours * 3600 * 1000) timeTicks.push(t);
  const last = priced[priced.length - 1];
  const feedY = padT + plotH + 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Premium over the last 24 hours, from ${formatBpsBare(lo)} to ${formatBpsBare(hi)} basis points.`} data-testid="premium-trace">
      <defs>
        <clipPath id={`${uid}-plot`}>
          <rect x={padL} y={padT} width={plotW} height={plotH} />
        </clipPath>
      </defs>
      {/* fair band */}
      <rect x={padL} y={y(50)} width={plotW} height={Math.max(0, y(-50) - y(50))} fill={INK.ivory} fillOpacity="0.035" />
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={padL + plotW} y2={y(v)} stroke={INK.ivory} strokeOpacity={v === 0 ? 0.4 : 0.08} strokeWidth="1" strokeDasharray={v === 0 ? "3 3" : undefined} vectorEffect="non-scaling-stroke" />
          <text x={padL + plotW + 8} y={y(v)} className="font-mono tnum" fontSize={dense ? 10 : 11} fill={INK.ivory} fillOpacity="0.75" dominantBaseline="central">
            {v === 0 ? "0" : formatBpsBare(v)}
          </text>
        </g>
      ))}
      {(dense ? [] : [50, -50]).map((v) => (
        <text key={v} x={padL + plotW + 8} y={y(v)} className="font-mono tnum" fontSize={dense ? 9 : 10} fill={INK.ivory} fillOpacity="0.4" dominantBaseline="central">
          {formatBpsBare(v)}
        </text>
      ))}
      <g clipPath={`url(#${uid}-plot)`}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.g
            key={sorted[sorted.length - 1].tUtc}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {segments.map((seg, i) => (
              <path key={i} d={seg} fill="none" stroke={INK.blue} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
          </motion.g>
        </AnimatePresence>
      </g>
      <circle cx={x(Date.parse(last.tUtc))} cy={y(last.premiumBps!)} r="2" fill={INK.blue} />
      {/* feed state bar */}
      {runs.map((r, i) => (
        <rect key={i} x={x(r.from)} y={feedY} width={Math.max(1, x(r.to) - x(r.from))} height={feedBar} fill={INK.ivory} fillOpacity={r.state === "live" ? 0.85 : r.state === "held" ? 0.2 : r.state === "unknown" ? 0.1 : 0.4} />
      ))}
      <text x={padL + plotW + 8} y={feedY + feedBar / 2} className="font-mono" fontSize={dense ? 10 : 11} fill={INK.ivory} fillOpacity="0.55" dominantBaseline="central">
        feed
      </text>
      {/* time axis */}
      {timeTicks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={feedY + feedBar + 4} x2={x(t)} y2={feedY + feedBar + 9} stroke={INK.ivory} strokeOpacity="0.3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <text x={x(t)} y={H - (dense ? 6 : 10)} className="font-mono tnum" fontSize={dense ? 10 : 11} fill={INK.ivory} fillOpacity="0.75" textAnchor={t === t0 ? "start" : "middle"}>
            {formatEt(new Date(t).toISOString(), "time")}
          </text>
        </g>
      ))}
    </svg>
  );
}
