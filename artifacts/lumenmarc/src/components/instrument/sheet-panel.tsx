import { Link } from "wouter";
import type { PremiumHistory, StockLabel, StockSummary } from "@workspace/api-client-react";
import { useEffect, useRef, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatAgo, formatBpsBare, formatEt, formatUsd, referencePrice, truncateAddress, unpricedReason, DEVIATION_LABEL } from "@/lib/utils";
import { Figure } from "@/components/motion";
import { DimensionFigure } from "./dimension-figure";
import { PremiumTrace } from "./premium-trace";
import { readingFromStock } from "./comparator";

/*
 * The sheet: the supporting figures for the token the comparator is reading,
 * reference, venue, the dimensioned gap, the last 24 hours and the verification checks.
 */

type Props = {
  stock: StockSummary;
  detail: StockLabel | undefined;
  detailError: string | null;
  history: PremiumHistory | undefined;
  historyError?: string | null;
  blockNumber: number | null;
  now: number;
  /** The stage already draws the 24 h trace on wide screens; the sheet then shows it only below xl. */
  traceOnStage?: boolean;
  className?: string;
};

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function SheetPanel({ stock, detail, detailError, history, historyError = null, blockNumber, now, traceOnStage = false, className }: Props) {
  const v = stock.primaryVenue;
  const feed = stock.reference;
  const points = history?.ticker === stock.ticker ? history.points : [];
  const priced = points.filter((pt) => pt.premiumBps != null).map((pt) => pt.premiumBps!);
  const range24h = priced.length ? { lo: Math.min(...priced), hi: Math.max(...priced) } : null;
  const reading = readingFromStock(stock, range24h);
  const reason = unpricedReason(stock);
  const checks = detail?.summary.ticker === stock.ticker ? detail.verify.checks : [];
  const passedChecks = checks.filter(c => c.passed).length;
  const unavailableChecks = checks.filter((c) => c.passed == null).length;
  const venues = detail?.summary.ticker === stock.ticker ? detail.venues : [];

  return (
    <div className={cn("relative", className)} data-testid="sheet-panel">
      <AnimatePresence mode="wait">
        <motion.div
          key={stock.ticker}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col"
        >
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-[30px] leading-none text-foreground">{stock.ticker}</p>
          <p className="flex shrink-0 gap-4 font-mono text-[11.5px]">
            <Link href={`/s/${stock.ticker}`} className="text-foreground/80 underline underline-offset-4 hover:text-foreground" data-testid="link-open-sheet">
              Open sheet
            </Link>
            <Link href={`/check?q=${stock.address}`} className="text-foreground/80 underline underline-offset-4 hover:text-foreground" data-testid="link-verify-address">
              Verify address
            </Link>
          </p>
        </div>
        <p className="mt-2 font-mono text-[11.5px] leading-[1.5] text-foreground/58">
          {stock.name} · {stock.issuer.verified ? "Coinbase-issued · address verified" : "issuer unverified"}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr] items-baseline gap-4 px-5 py-4 border-b border-foreground/10">
        <div>
          <p className="font-mono text-[10.5px] text-foreground/52 mb-1">Reference</p>
          <p className="font-mono text-[20px] leading-none text-foreground tnum">
            {referencePrice(feed) != null ? <Figure value={feed.price} format={(n) => fmt(n)} /> : <span className="text-[16px] text-dev-dislocated">Unavailable</span>}
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] text-foreground/58">
            Chainlink, {feed.state === "held" ? `held since ${formatEt(feed.updatedAtUtc, "time")}` : feed.state === "live" ? "live" : feed.state === "stale" ? "stale" : "unavailable"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10.5px] text-foreground/52 mb-1">Onchain</p>
          <p className="font-mono text-[20px] leading-none text-foreground tnum">
            {v?.premiumBps == null || v.priceUsd == null ? "Unpriced" : <Figure value={v.priceUsd} format={(n) => fmt(n)} />}
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] text-foreground/58">
            {v ? `${v.dexLabel}, ${v.quoteToken.symbol} pool` : reason ?? "no venue found"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10.5px] text-foreground/52 mb-1">Premium</p>
          <p className="font-mono text-[20px] leading-none tnum text-primary">
            {v?.premiumBps == null ? "Unpriced" : <Figure value={v.premiumBps} format={formatBpsBare} />}
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] text-foreground/58">
            {v?.premiumBps == null ? "no reading" : `${DEVIATION_LABEL[stock.deviationState].toLowerCase()}`}
          </p>
        </div>
      </div>

      <Section title={`Verification, ${checks.length ? `${passedChecks} of ${checks.length} pass${unavailableChecks ? `, ${unavailableChecks} unavailable` : ""}` : detailError ? "unavailable" : "loading checks"}`}>
        {checks.length ? (
          <ul className="flex flex-col gap-1.5">
            {checks.map((c) => (
              <li key={c.id} className="grid grid-cols-[2.6rem_minmax(0,1fr)] items-baseline gap-2 font-mono text-[11.5px]">
                <span className={c.passed === true ? "text-foreground" : c.passed === false ? "text-dev-dislocated" : "text-foreground/52"}>
                  {c.passed === true ? "pass" : c.passed === false ? "fail" : "n/a"}
                </span>
                <span className="text-foreground/70">{c.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn("font-mono text-[11.5px]", detailError ? "text-dev-dislocated" : "text-foreground/58")}>{detailError ?? "loading checks"}</p>
        )}
        {checks.length > 0 && detailError && <p className="mt-2 font-mono text-[11.5px] text-dev-dislocated">refresh failed: {detailError} · showing the last successful read</p>}
      </Section>

      <Section title="Reference feed">
        <p className="font-mono text-[11.5px] leading-[1.5] text-foreground/58">
          Chainlink {feed.description} ·{" "}
          <span className={cn(feed.state === "live" ? "text-feed-live" : feed.state === "held" ? "text-feed-held" : "text-dev-dislocated")}>
          {feed.state === "held"
            ? `holding the last print since ${formatEt(feed.updatedAtUtc, "time")}`
            : feed.state === "live"
              ? `live · updated ${formatAgo(feed.updatedAtUtc, now)}`
              : feed.state === "stale"
                ? `stale · last update ${formatEt(feed.updatedAtUtc, "datetime")} ET`
                : "unavailable"}
          </span>
          <br />
          feed {truncateAddress(feed.feedAddress)}
        </p>
      </Section>

      {v && (
        <Section title="Dimension">
          <DimensionFigure reading={reading} blockNumber={blockNumber} status="ready" immediate compact />
        </Section>
      )}

      <Section title="24 h" className={traceOnStage ? "xl:hidden" : undefined}>
        {points.length > 1 ? (
          <>
            <PremiumTrace points={points} height={150} dense className="block h-auto w-full" />
            {range24h && (
              <p className="mt-2 font-mono text-[11.5px] text-foreground/58 tnum">
                low {formatBpsBare(range24h.lo)} · high {formatBpsBare(range24h.hi)} · {points.length} readings
              </p>
            )}
            <p className="mt-1 font-mono text-[10.5px] leading-[1.6] text-foreground/52">
              Bright feed bar: reference live. Dim: holding last print.
            </p>
            {historyError && <p className="mt-1 font-mono text-[11.5px] text-dev-dislocated">refresh failed: {historyError} · showing the last successful read</p>}
          </>
        ) : (
          <p className={cn("font-mono text-[11.5px]", historyError ? "text-dev-dislocated" : "text-foreground/58")}>{historyError ?? (history ? "no priced history yet" : "loading history")}</p>
        )}
      </Section>

      {venues.length > 1 && (
        <Section title={`Venues, ${venues.length}`}>
          <ul className="flex flex-col">
            {venues.map((q) => (
              <li key={q.pairAddress} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 border-b border-foreground/10 py-2 font-mono text-[11.5px] tnum last:border-b-0">
                <span className="min-w-0 truncate text-foreground/72">
                  <a href={q.url} target="_blank" rel="noreferrer" className="text-foreground/85 underline underline-offset-4 hover:text-foreground">
                    {q.dexLabel}
                  </a>{" "}
                  · {q.baseToken.symbol}/{q.quoteToken.symbol}
                  {q.isPrimary ? " · primary" : ""}
                </span>
                <span className="text-foreground/58">{formatUsd(q.liquidityUsd, 0)}</span>
                <span className={cn("w-[4.2rem] text-right", q.premiumBps == null ? "text-foreground/48" : "text-primary")}>{q.premiumBps == null ? "unpriced" : formatBpsBare(q.premiumBps)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Contract">
        <p className="break-all font-mono text-[11.5px] leading-[1.6] text-foreground/85">{stock.address}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-foreground/58">
          <CopyButton text={stock.address} />
          <a href={`https://basescan.org/token/${stock.address}`} target="_blank" rel="noreferrer" className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
            Basescan
          </a>
          <span>{stock.decimals} decimals</span>
          <span>{stock.status === "live" ? "minted" : stock.status.replace("-", " ")}</span>
        </p>
      </Section>

      <Section title="Share" last>
        <p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px]">
          <Link href={`/s/${stock.ticker}`} className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
            Full sheet
          </Link>
          <Link href={`/embed/${stock.ticker}`} className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
            Embed card
          </Link>
          <CopyButton
            text={
              v && typeof v.premiumBps === "number" && typeof v.priceUsd === "number"
                ? `${stock.ticker} reads ${formatBpsBare(v.premiumBps)} bps from its Chainlink reference (${DEVIATION_LABEL[stock.deviationState].toLowerCase()}) · ${v.dexLabel} ${fmt(v.priceUsd)} vs ${fmt(feed.price)}${blockNumber ? ` · block ${blockNumber.toLocaleString("en-US")}` : ""} · LumenMarc`
                : `${stock.ticker} has no USD reading at this block${blockNumber ? ` (block ${blockNumber.toLocaleString("en-US")})` : ""} · LumenMarc`
            }
            label="Copy summary"
          />
        </p>
      </Section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children, last = false, className }: { title: string; children: React.ReactNode; last?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  return (
    <section className={cn("px-5 py-3", !last && "border-b border-foreground/10", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left group hover-quiet"
        aria-expanded={open}
        aria-controls={uid}
      >
        <span className="font-mono text-[10.5px] text-foreground/52 group-hover:text-foreground/70 transition-colors">{title}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className={cn("text-foreground/30 group-hover:text-foreground/60 transition-transform duration-300", open && "rotate-180")} aria-hidden>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={uid}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CopyButton({ text, label = "Copy address" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const settle = (next: "done" | "failed") => {
    setState(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  };
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          settle("done");
        } catch {
          settle("failed");
        }
      }}
      className={cn("underline underline-offset-4", state === "failed" ? "text-dev-dislocated" : "text-foreground/80 hover:text-foreground")}
      aria-live="polite"
      data-testid="button-copy"
    >
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
