import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useSpring } from "framer-motion";
import type { DeviationState, StockSummary } from "@workspace/api-client-react";
import { DEVIATION_LABEL, formatBpsBare, formatEt } from "@/lib/utils";

/*
 * The comparator: a dial gauge zeroed on the Chainlink reference that reads how far
 * the onchain price has strayed, in basis points.
 *
 * Scale: ±300 bps mapped to ±180° (1 bps = 0.6°). Zero sits at the top; the two
 * limits meet at the bottom in a hatched "dislocated" wedge. The fair band is
 * ±50 bps = ±30° of arc. Every mark on the face is a real value.
 */

export const DEG_PER_BPS = 0.6;
export const SCALE_LIMIT_BPS = 300;
export const FAIR_LIMIT_BPS = 50;

export const INK = {
  ivory: "#ECE7DA",
  blue: "#4C7DFF",
  bench: "#0A0C10",
  face: "#14161B",
  lamp: "#FFF5E4",
} as const;

export type ComparatorReading = {
  ticker: string;
  name: string;
  issuerVerified: boolean;
  premiumBps: number | null;
  deviationState: DeviationState;
  referencePrice: number;
  referenceDescription: string;
  referenceUpdatedAtUtc: string;
  referenceState: StockSummary["reference"]["state"];
  onchainPrice: number | null;
  dexLabel: string | null;
  quoteSymbol: string | null;
  liquidityUsd: number | null;
  /** Lowest and highest reading over the last 24 h, when history exists. */
  range24h: { lo: number; hi: number } | null;
};

/** The reference feed's state in words: "held since 20:45 ET", "live · 14:02 ET", "stale since …", "unavailable". */
export function feedStateText(r: Pick<ComparatorReading, "referenceState" | "referenceUpdatedAtUtc">): string {
  switch (r.referenceState) {
    case "live":
      return `live · ${formatEt(r.referenceUpdatedAtUtc, "time")}`;
    case "held":
      return `held since ${formatEt(r.referenceUpdatedAtUtc, "time")}`;
    case "stale":
      return `stale since ${formatEt(r.referenceUpdatedAtUtc, "time")}`;
    default:
      return "feed unavailable";
  }
}

export function readingFromStock(s: StockSummary, range24h: ComparatorReading["range24h"]): ComparatorReading {
  const v = s.primaryVenue;
  return {
    ticker: s.ticker,
    name: s.name,
    issuerVerified: s.issuer.verified,
    premiumBps: v?.premiumBps ?? null,
    deviationState: s.deviationState,
    referencePrice: s.reference.price,
    referenceDescription: s.reference.description,
    referenceUpdatedAtUtc: s.reference.updatedAtUtc,
    referenceState: s.reference.state,
    /* A pool quoted in a non-USD asset carries a converted USD figure from the venue data; it is not a reading, so it never leaves this function. */
    onchainPrice: v?.premiumBps == null ? null : v.priceUsd,
    dexLabel: v?.dexLabel ?? null,
    quoteSymbol: v?.quoteToken?.symbol ?? null,
    liquidityUsd: v?.liquidityUsd ?? null,
    range24h,
  };
}

export const bpsToDeg = (bps: number) => Math.max(-180, Math.min(180, bps * DEG_PER_BPS));

export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const p = (n: number) => n.toFixed(2);
const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${p(x1)} ${p(y1)} A ${p(r)} ${p(r)} 0 ${large} 1 ${p(x2)} ${p(y2)}`;
};

const TICKS = Array.from({ length: 61 }, (_, i) => -300 + i * 10);
const NUMERALS = [-200, -100, 0, 100, 200, 300];

/* Intro timing (seconds). Reduced motion collapses all of it to zero. */
const T = { face: 0.55, sweepDelay: 0.4, sweep: 0.85, band: 0.3, labels: 1.35, arm: 1.55 } as const;

type Props = {
  reading: ComparatorReading | null;
  status: "loading" | "failed" | "ready";
  radius: number;
  compact?: boolean;
  detail?: "full" | "focused";
  className?: string;
};

export function Comparator({ reading, status, radius: R, compact = false, detail = "full", className }: Props) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion() ?? false;
  const pad = R * 0.02 + 4;
  const S = 2 * (R + pad);
  const cx = R + pad;
  const cy = R + pad;

  /* The reading the face currently shows. A token change re-zeroes the needle before the labels swap. */
  const [shown, setShown] = useState<ComparatorReading | null>(reading);
  const [armed, setArmed] = useState(reduced);
  const bps = useSpring(0, { stiffness: 65, damping: 14, mass: 2 });
  const needleRef = useRef<SVGGElement | null>(null);
  const shadowRef = useRef<SVGGElement | null>(null);
  const figureRef = useRef<SVGTSpanElement | null>(null);

  useMotionValueEvent(bps, "change", (v) => {
    const deg = bpsToDeg(v);
    needleRef.current?.setAttribute("transform", `rotate(${deg} ${cx} ${cy})`);
    shadowRef.current?.setAttribute("transform", `translate(1.5, 2) rotate(${deg} ${cx} ${cy})`);
    if (figureRef.current) figureRef.current.textContent = formatBpsBare(v);
  });

  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setArmed(true), T.arm * 1000);
    return () => window.clearTimeout(t);
  }, [reduced]);

  /* The latest reading, readable from a timer without restarting it: the parent re-renders every second and hands over a fresh object each time. */
  const latest = useRef(reading);
  latest.current = reading;
  const go = (v: number) => (reduced ? bps.jump(v) : bps.set(v));

  /* Same token or not yet armed: show the latest reading and aim the needle at it. */
  useEffect(() => {
    if (!reading) return;
    if (!shown || shown.ticker === reading.ticker || !armed) {
      if (shown !== reading) setShown(reading);
      if (armed) go(reading.premiumBps ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, reading, shown, reduced]);

  /* Token change: needle back to the reference first, then the labels swap and the effect above swings it out. Keyed on tickers so a re-render mid-swing cannot restart the wait. */
  const incoming = reading?.ticker ?? null;
  const current = shown?.ticker ?? null;
  useEffect(() => {
    if (!armed || !incoming || !current || incoming === current) return;
    if (reduced) {
      setShown(latest.current);
      return;
    }
    go(0);
    const swap = window.setTimeout(() => setShown(latest.current), 620);
    return () => window.clearTimeout(swap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, incoming, current, reduced]);

  const small = Math.max(R * 0.032, compact ? 9.5 : 11);
  const numFs = Math.max(R * 0.058, 9.5);
  const numR = R * 0.7;
  const intro = (delay: number, duration = 0.5) =>
    reduced ? { initial: false as const } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration, ease: "easeOut" as const } };

  const stateWord = shown ? DEVIATION_LABEL[shown.deviationState] : null;
  const hasNeedle = shown?.premiumBps != null;
  /* Needle geometry scales with the face: a blade about one percent of the diameter wide at the hub, a tail with a counterweight. */
  const bladeW = Math.max(R * 0.011, 2.2);
  const tailW = Math.max(R * 0.009, 1.8);
  const weightR = Math.max(R * 0.02, 2.6);

  return (
    <svg
      viewBox={`0 0 ${p(S)} ${p(S)}`}
      width={S}
      height={S}
      className={className}
      style={{ maxWidth: "100%", height: "auto" }}
      role="img"
      aria-label={
        shown && shown.premiumBps != null
          ? `${shown.ticker} reads ${formatBpsBare(shown.premiumBps)} basis points from the Chainlink reference, ${stateWord}.`
          : shown
            ? `${shown.ticker} has no USD reading.`
            : "Comparator dial awaiting a reading."
      }
      data-testid="comparator"
    >
      <defs>
        <radialGradient id={`${uid}-lamp`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={INK.lamp} stopOpacity="0.08" />
          <stop offset="0.6" stopColor={INK.lamp} stopOpacity="0.02" />
          <stop offset="1" stopColor={INK.lamp} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-face`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor={INK.face} />
          <stop offset="1" stopColor="#0b0d10" />
        </radialGradient>
        <radialGradient id={`${uid}-inner-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.9" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INK.ivory} stopOpacity="0.3" />
          <stop offset="0.3" stopColor={INK.ivory} stopOpacity="0.06" />
          <stop offset="0.7" stopColor={INK.ivory} stopOpacity="0.02" />
          <stop offset="1" stopColor={INK.ivory} stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id={`${uid}-hub`} cx="0.3" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.4" stopColor={INK.ivory} stopOpacity="0.5" />
          <stop offset="1" stopColor={INK.ivory} stopOpacity="0.1" />
        </radialGradient>
        <pattern id={`${uid}-hatch`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK.ivory} strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </pattern>
        {/* The scale is revealed by a stroke that sweeps clockwise from the −300 limit round to +300. */}
        <mask id={`${uid}-sweep`} maskUnits="userSpaceOnUse" x="0" y="0" width={p(S)} height={p(S)}>
          <motion.path
            d={`M ${p(cx)} ${p(cy + R * 0.77)} A ${p(R * 0.77)} ${p(R * 0.77)} 0 0 1 ${p(cx)} ${p(cy - R * 0.77)} A ${p(R * 0.77)} ${p(R * 0.77)} 0 0 1 ${p(cx)} ${p(cy + R * 0.77)}`}
            fill="none"
            stroke="#fff"
            strokeWidth={p(R * 0.36)}
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: T.sweepDelay, duration: T.sweep, ease: [0.55, 0, 0.3, 1] }}
          />
        </mask>
      </defs>

      {/* Bezel and face */}
      <motion.g {...intro(0, T.face)}>
        <circle cx={cx} cy={cy} r={R} fill={`url(#${uid}-rim)`} stroke={INK.ivory} strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {/* the machined step: a lit inner edge on the rim, a recessed dark channel, then the face edge */}
        <circle cx={cx} cy={cy} r={p(R * 0.97)} fill="#07080a" stroke={INK.ivory} strokeOpacity="0.22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <circle cx={cx} cy={cy} r={p(R * 0.945)} fill="none" stroke={INK.ivory} strokeOpacity="0.12" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <circle cx={cx} cy={cy} r={p(R * 0.94)} fill={`url(#${uid}-face)`} />
        <circle cx={cx} cy={cy} r={p(R * 0.94)} fill={`url(#${uid}-inner-shadow)`} />
        <circle cx={cx} cy={cy} r={p(R * 0.94)} fill={`url(#${uid}-lamp)`} />
      </motion.g>

      {/* Scale */}
      <g mask={`url(#${uid}-sweep)`}>
        {(() => {
          const hr0 = R * 0.78;
          const hr1 = R * 0.88;
          const [h1x, h1y] = polar(cx, cy, hr1, 172);
          const [h2x, h2y] = polar(cx, cy, hr1, 188);
          const [h3x, h3y] = polar(cx, cy, hr0, 188);
          const [h4x, h4y] = polar(cx, cy, hr0, 172);
          return (
            <path
              d={`M ${p(h1x)} ${p(h1y)} A ${p(hr1)} ${p(hr1)} 0 0 1 ${p(h2x)} ${p(h2y)} L ${p(h3x)} ${p(h3y)} A ${p(hr0)} ${p(hr0)} 0 0 0 ${p(h4x)} ${p(h4y)} Z`}
              fill={`url(#${uid}-hatch)`}
              stroke={INK.ivory}
              strokeOpacity="0.4"
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
            />
          );
        })()}
        {TICKS.map((b) => {
          const deg = b * DEG_PER_BPS;
          const major = b % 100 === 0;
          const mid = b % 50 === 0 && !major;
          const [x1, y1] = polar(cx, cy, R * 0.88, deg);
          const [x2, y2] = polar(cx, cy, major ? R * 0.77 : mid ? R * 0.82 : R * 0.85, deg);
          return (
            <line
              key={b}
              x1={p(x1)}
              y1={p(y1)}
              x2={p(x2)}
              y2={p(y2)}
              stroke={INK.ivory}
              strokeOpacity={major ? 0.95 : mid ? 0.6 : 0.3}
              strokeWidth={major ? 1.5 : mid ? 1 : 0.75}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {NUMERALS.map((b) => {
          const isLimit = Math.abs(b) === 300;
          const nr = isLimit ? R * 0.64 : R * 0.69;
          const [x, y] = polar(cx, cy, nr, b * DEG_PER_BPS);
          return (
            <text key={b} x={p(x)} y={p(y)} className="font-mono tnum" fontSize={p(numFs)} fill={INK.ivory} fillOpacity={isLimit ? "0.6" : "0.88"} textAnchor="middle" dominantBaseline="central">
              {b === 0 ? "0" : b === 300 ? "300" : formatBpsBare(b)}
            </text>
          );
        })}
        <text x={cx} y={p(cy - R * 0.69 + numFs * 1.15)} className="font-mono" fontSize={p(numFs * 0.5)} fill={INK.ivory} fillOpacity="0.55" textAnchor="middle" dominantBaseline="central">
          bps from reference
        </text>
        {(() => {
          const [hx, hy] = polar(cx, cy, R * 0.72, 166);
          const [fx, fy] = polar(cx, cy, R * 0.62, 38);
          return (
            <>
              <text x={p(hx)} y={p(hy)} className="font-mono" fontSize={p(numFs * 0.5)} fill={INK.ivory} fillOpacity="0.6" dominantBaseline="central">
                dislocated
              </text>
              <text x={p(fx)} y={p(fy)} className="font-mono" fontSize={p(numFs * 0.5)} fill={INK.ivory} fillOpacity="0.55" dominantBaseline="central">
                fair to ±50
              </text>
            </>
          );
        })()}
      </g>

      {/* Fair band ±50 bps, drawn last, with its two tolerance markers */}
      <motion.path
        d={arc(cx, cy, R * 0.9, -30, 30)}
        fill="none"
        stroke={INK.ivory}
        strokeOpacity="0.8"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: T.sweepDelay + T.sweep, duration: T.band, ease: "easeOut" }}
      />
      <motion.g {...intro(T.sweepDelay + T.sweep + T.band, 0.25)}>
        {[-30, 30].map((deg) => {
          const [bx, by] = polar(cx, cy, R * 0.9, deg);
          const [lx, ly] = polar(cx, cy, R * 0.93, deg + (deg > 0 ? 2 : -2));
          const [rx, ry] = polar(cx, cy, R * 0.93, deg + (deg > 0 ? -2 : 2));
          return <polygon key={deg} points={`${p(lx)},${p(ly)} ${p(rx)},${p(ry)} ${p(bx)},${p(by)}`} fill={INK.ivory} fillOpacity="0.9" />;
        })}
      </motion.g>

      {/* Face: token labels, 24 h drag pointers, reading. Crossfades when the token changes. */}
      <AnimatePresence mode="wait" initial={!reduced}>
        {shown ? (
          <motion.g
            key={shown.ticker}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
            transition={{ delay: armed ? 0 : T.labels, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {shown.range24h &&
              [shown.range24h.lo, shown.range24h.hi].map((val, i) => {
                const deg = bpsToDeg(val);
                const [x1, y1] = polar(cx, cy, R * 0.79, deg);
                const [x2, y2] = polar(cx, cy, R * 0.885, deg);
                const [dx, dy] = polar(cx, cy, R * 0.9, deg);
                return (
                  <g key={i}>
                    <line x1={p(x1)} y1={p(y1)} x2={p(x2)} y2={p(y2)} stroke={INK.ivory} strokeOpacity="0.9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <circle cx={p(dx)} cy={p(dy)} r="2.2" fill={INK.ivory} />
                  </g>
                );
              })}

            <text x={cx} y={p(cy - R * 0.3)} className="font-display" fontWeight="500" fontSize={p(R * 0.095)} fill={INK.ivory} textAnchor="middle" dominantBaseline="central">
              {shown.ticker}
            </text>
            <text x={cx} y={p(cy - R * 0.215)} className="font-mono" fontSize={p(small)} fill={INK.ivory} fillOpacity="0.62" textAnchor="middle" dominantBaseline="central">
              {shown.name}
              {shown.issuerVerified ? " · Coinbase-issued" : ""}
            </text>
            {!compact && detail === "full" && (
              <text x={cx} y={p(cy - R * 0.165)} className="font-mono" fontSize={p(small)} fill={INK.ivory} fillOpacity="0.62" textAnchor="middle" dominantBaseline="central">
                {shown.referenceState === "unavailable" ? "reference unavailable" : `zeroed on Chainlink ${fmt(shown.referencePrice)}`} · {feedStateText(shown)}
              </text>
            )}

            {shown.premiumBps != null ? (
              <>
                <text x={cx} y={p(cy + R * 0.26)} className="font-mono tnum" fontSize={p(R * 0.18)} fill={INK.blue} textAnchor="middle" dominantBaseline="central">
                  <tspan ref={figureRef}>{formatBpsBare(bps.get())}</tspan>
                </text>
                <text x={cx} y={p(cy + R * 0.375)} className="font-mono" fontSize={p(Math.max(R * 0.045, 10.5))} fill={INK.ivory} fillOpacity="0.8" textAnchor="middle" dominantBaseline="central">
                  bps · {stateWord?.toLowerCase()}
                </text>
                {!compact && detail === "full" ? (
                  <>
                    <text x={cx} y={p(cy + R * 0.445)} className="font-mono" fontSize={p(Math.max(R * 0.035, 9.5))} fill={INK.ivory} fillOpacity="0.66" textAnchor="middle" dominantBaseline="central">
                      {shown.dexLabel} {shown.onchainPrice != null ? fmt(shown.onchainPrice) : "no price"} against reference {shown.referenceState === "unavailable" ? "unavailable" : fmt(shown.referencePrice)}
                    </text>
                  </>
                ) : detail === "full" ? (
                  <text x={cx} y={p(cy + R * 0.445)} className="font-mono" fontSize={p(Math.max(R * 0.035, 9.5))} fill={INK.ivory} fillOpacity="0.66" textAnchor="middle" dominantBaseline="central">
                    {shown.onchainPrice != null ? fmt(shown.onchainPrice) : "no price"} against {shown.referenceState === "unavailable" ? "unavailable" : fmt(shown.referencePrice)}
                  </text>
                ) : null}
              </>
            ) : (
              <>
                <text x={cx} y={p(cy + R * 0.27)} className="font-mono" fontSize={p(R * 0.07)} fill={INK.ivory} fillOpacity="0.9" textAnchor="middle" dominantBaseline="central">
                  unpriced
                </text>
                <text x={cx} y={p(cy + R * 0.375)} className="font-mono" fontSize={p(Math.max(R * 0.045, 10.5))} fill={INK.ivory} fillOpacity="0.6" textAnchor="middle" dominantBaseline="central">
                  no premium computed
                </text>
                {detail === "full" && (
                  <text x={cx} y={p(cy + R * 0.445)} className="font-mono" fontSize={p(Math.max(R * 0.035, 9.5))} fill={INK.ivory} fillOpacity="0.66" textAnchor="middle" dominantBaseline="central">
                    {shown.dexLabel ? `${shown.dexLabel} quotes ${shown.ticker} against ${shown.quoteSymbol ?? "a non-USD asset"}` : "no USD venue quotes this token"}
                  </text>
                )}
              </>
            )}
          </motion.g>
        ) : (
          <motion.g key={status} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ delay: T.labels, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
            <text x={cx} y={p(cy + R * 0.27)} className="font-mono" fontSize={p(R * 0.07)} fill={INK.ivory} fillOpacity={status === "failed" ? 1 : 0.7} textAnchor="middle" dominantBaseline="central">
              {status === "failed" ? "no reading" : "reading"}
            </text>
            <text x={cx} y={p(cy + R * 0.375)} className="font-mono" fontSize={p(Math.max(R * 0.045, 10.5))} fill={INK.ivory} fillOpacity="0.66" textAnchor="middle" dominantBaseline="central">
              {status === "failed" ? "the last snapshot could not be read" : "waiting for the current block"}
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Needle: rests on zero until armed, then springs to the reading. */}
      {hasNeedle && (
        <motion.g {...intro(T.labels, 0.3)}>
          <g ref={shadowRef} transform={`translate(1.5, 2) rotate(${bpsToDeg(bps.get())} ${cx} ${cy})`}>
            <polygon points={`${p(cx - bladeW)},${p(cy)} ${p(cx)},${p(cy - R * 0.88)} ${p(cx + bladeW)},${p(cy)}`} fill={INK.bench} fillOpacity="0.4" />
            <polygon points={`${p(cx - tailW)},${p(cy)} ${p(cx)},${p(cy + R * 0.19)} ${p(cx + tailW)},${p(cy)}`} fill={INK.bench} fillOpacity="0.4" />
            <circle cx={cx} cy={p(cy + R * 0.15)} r={p(weightR)} fill={INK.bench} fillOpacity="0.4" />
          </g>
          <g ref={needleRef} transform={`rotate(${bpsToDeg(bps.get())} ${cx} ${cy})`}>
            <polygon points={`${p(cx - bladeW)},${p(cy)} ${p(cx)},${p(cy - R * 0.88)} ${p(cx + bladeW)},${p(cy)}`} fill={INK.blue} />
            {/* the ridge along the blade catches the light */}
            <line x1={cx} y1={p(cy - R * 0.02)} x2={cx} y2={p(cy - R * 0.84)} stroke={INK.lamp} strokeOpacity="0.35" strokeWidth="0.5" />
            <polygon points={`${p(cx - tailW)},${p(cy)} ${p(cx)},${p(cy + R * 0.19)} ${p(cx + tailW)},${p(cy)}`} fill={INK.blue} fillOpacity="0.85" />
            {/* counterweight */}
            <circle cx={cx} cy={p(cy + R * 0.15)} r={p(weightR)} fill={INK.blue} stroke={INK.bench} strokeOpacity="0.6" strokeWidth="1" />
            <circle cx={cx} cy={p(cy + R * 0.15)} r={p(Math.max(weightR * 0.35, 1))} fill={INK.bench} fillOpacity="0.7" />
          </g>
        </motion.g>
      )}
      <motion.g {...intro(0.1, T.face)}>
        <circle cx={cx} cy={cy} r={p(Math.max(R * 0.03, 4.5))} fill={INK.bench} stroke={INK.ivory} strokeOpacity="0.6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <circle cx={cx} cy={cy} r={p(Math.max(R * 0.015, 2.5))} fill={`url(#${uid}-hub)`} />
      </motion.g>
    </svg>
  );
}
