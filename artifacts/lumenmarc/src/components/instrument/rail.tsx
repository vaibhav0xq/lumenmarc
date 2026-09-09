import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import type { StockSummary } from "@workspace/api-client-react";
import { cn, formatBpsBare, unpricedReason, DEVIATION_LABEL } from "@/lib/utils";
import { Figure } from "@/components/motion";
import { INK } from "./comparator";

/*
 * The rail: every token as one row, each with its own small scale, the comparator's
 * ±300 bps unrolled to a rule, fair band drawn heavy, the reading as a blue tick that
 * slides to its new place when the block changes.
 */

export const BY_WIDTH = (a: StockSummary, b: StockSummary) => {
  const av = a.primaryVenue?.premiumBps;
  const bv = b.primaryVenue?.premiumBps;
  const aPriced = typeof av === "number";
  const bPriced = typeof bv === "number";
  if (aPriced && bPriced) return Math.abs(bv!) - Math.abs(av!);
  if (aPriced !== bPriced) return aPriced ? -1 : 1;
  if (a.status !== b.status) return a.status === "live" ? -1 : 1;
  return a.ticker.localeCompare(b.ticker);
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function MiniScale({ bps, className }: { bps: number | null; className?: string }) {
  const reduced = useReducedMotion();
  const W = 200;
  const xOf = (v: number) => 4 + ((Math.max(-300, Math.min(300, v)) + 300) / 600) * (W - 8);
  const pinned = bps != null && Math.abs(bps) > 300;
  return (
    <svg viewBox={`0 0 ${W} 12`} preserveAspectRatio="none" className={cn("block h-[12px] w-full", className)} aria-hidden>
      <line x1={4} y1={6} x2={W - 4} y2={6} stroke={INK.ivory} strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={xOf(-50)} y1={6} x2={xOf(50)} y2={6} stroke={INK.ivory} strokeOpacity="0.75" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line x1={xOf(0)} y1={3} x2={xOf(0)} y2={9} stroke={INK.ivory} strokeOpacity="0.5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {bps != null && (
        <motion.line
          x1={xOf(bps)}
          x2={xOf(bps)}
          y1={0}
          y2={12}
          stroke={INK.blue}
          strokeWidth={pinned ? 2.5 : 1.5}
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{ x1: xOf(bps), x2: xOf(bps) }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: EASE }}
        />
      )}
    </svg>
  );
}

type Props = {
  stocks: StockSummary[];
  selected: string | null;
  onSelect?: (ticker: string) => void;
  /** Rows link to the readings page for their token (used where the rail is a preview). */
  linkTo?: boolean;
  limit?: number;
  dense?: boolean;
  /** Show the company name under the ticker (wide rails). */
  names?: boolean;
  className?: string;
};

export function Rail({ stocks, selected, onSelect, linkTo = false, limit, dense = false, names = false, className }: Props) {
  const ordered = [...stocks].sort(BY_WIDTH).slice(0, limit ?? stocks.length);
  return (
    <ol className={cn("flex flex-col", className)} data-testid="rail">
      {ordered.map((s) => {
        const bps = s.primaryVenue?.premiumBps ?? null;
        const active = selected === s.ticker;
        const reason = unpricedReason(s);
        const interactive = !!onSelect || linkTo;
        const inner = (
          <>
            {active && (
              <motion.span
                layoutId="rail-active-rule"
                className="absolute inset-y-0 left-0 w-[2px] bg-primary"
                initial={false}
                transition={{ type: "spring", stiffness: 380, damping: 40 }}
                aria-hidden
              />
            )}
            <span className={cn("flex items-baseline justify-between gap-3 hover-quiet", active ? "opacity-100" : interactive ? "opacity-60 group-hover:opacity-100" : "opacity-60")}>
              <span className="flex min-w-0 items-baseline gap-2">
                <span className={cn("font-display leading-none hover-quiet", active ? "text-foreground" : "text-foreground/70 group-hover:text-foreground", dense ? "text-[16px]" : "text-[17px]")}>{s.ticker}</span>
                {names && <span className="hidden truncate font-mono text-[10.5px] text-foreground/58 xl:inline">{s.name}</span>}
              </span>
              <span className="flex shrink-0 items-baseline gap-2 font-mono tnum">
                {bps != null ? (
                  <>
                    <Figure value={bps} format={formatBpsBare} className={cn(active ? "text-primary" : "text-primary/70", dense ? "text-[13px]" : "text-[14px]")} />
                    <span className="w-[4.8rem] text-right text-[10.5px] text-foreground/58">{DEVIATION_LABEL[s.deviationState].toLowerCase()}</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true" />
                    <span className="w-[4.8rem] text-right text-[10.5px] text-foreground/58">{s.status === "no-supply" ? "no supply" : "unpriced"}</span>
                  </>
                )}
              </span>
            </span>
            {/* Unpriced rows carry their reason where the scale would sit, so every row keeps the same height and the whole list fits. */}
            {!dense && bps == null && reason ? (
              <span className={cn("mt-1.5 block h-[12px] truncate font-mono text-[10.5px] leading-[12px]", active ? "text-foreground/60" : "text-foreground/48")}>{reason}</span>
            ) : (
              <MiniScale bps={bps} className={cn("mt-1.5 hover-quiet", active ? "opacity-100" : interactive ? "opacity-40 group-hover:opacity-80" : "opacity-40")} />
            )}
          </>
        );
        const cls = cn(
          "group relative block w-full text-left hover-quiet",
          dense ? "px-3 py-2" : "px-4 py-[5px]",
          active ? "bg-foreground/[0.04]" : interactive ? "hover:bg-foreground/[0.03]" : "",
          interactive && "focus-visible:bg-foreground/[0.05] focus-visible:outline-1 focus-visible:outline-foreground/70 focus-visible:-outline-offset-2",
        );
        return (
          <li key={s.ticker} className="border-b border-foreground/10">
            {onSelect ? (
              <button type="button" onClick={() => onSelect(s.ticker)} className={cls} aria-pressed={active} data-testid={`rail-${s.ticker}`}>
                {inner}
              </button>
            ) : linkTo ? (
              <Link href={`/readings?t=${s.ticker}`} className={cls} aria-current={active ? "true" : undefined} data-testid={`rail-${s.ticker}`}>
                {inner}
              </Link>
            ) : (
              <div className={cls} data-testid={`rail-${s.ticker}`}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
