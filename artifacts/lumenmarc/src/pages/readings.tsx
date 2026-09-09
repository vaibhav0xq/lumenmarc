import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useGetOverview,
  useListStocks,
  useGetStock,
  useGetStockHistory,
  getGetOverviewQueryKey,
  getListStocksQueryKey,
  getGetStockQueryKey,
  getGetStockHistoryQueryKey,
  type StockSummary,
} from "@workspace/api-client-react";
import { cn, apiErrorMessage, formatBpsBare, sessionSummary, truncateAddress } from "@/lib/utils";
import { useSize } from "@/lib/use-width";
import { Comparator, readingFromStock } from "@/components/instrument/comparator";
import { Rail, BY_WIDTH } from "@/components/instrument/rail";
import { SheetPanel } from "@/components/instrument/sheet-panel";
import { PremiumTrace } from "@/components/instrument/premium-trace";
import { Bands } from "@/components/instrument/bands";
import { IntegrityNotes } from "@/components/instrument/integrity-notes";
import { Figure, Tick } from "@/components/motion";

/*
 * The instrument. Rail of every token on the left, the comparator and its 24 h trace in the middle,
 * the sheet of supporting figures on the right, a status strip beneath. The URL carries the selection.
 */

const REFETCH_MS = 30000;
const EASE = [0.16, 1, 0.3, 1] as const;

export function pickWidest(stocks: StockSummary[] | undefined): StockSummary | null {
  if (!stocks?.length) return null;
  return [...stocks].sort(BY_WIDTH)[0] ?? null;
}

const utcStamp = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
};

export default function Readings() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const reduced = useReducedMotion();
  const { data: overview, error: overviewError, dataUpdatedAt } = useGetOverview({
    query: { queryKey: getGetOverviewQueryKey(), refetchInterval: REFETCH_MS },
  });
  const { data: stocks, error: stocksError } = useListStocks({
    query: { queryKey: getListStocksQueryKey(), refetchInterval: REFETCH_MS },
  });
  const error = overviewError ?? stocksError;

  /* Selection lives in the URL: ?t=TICKER when present and known, otherwise the widest live deviation. */
  const requested = new URLSearchParams(search).get("t");
  const ordered = useMemo(() => (stocks ? [...stocks].sort(BY_WIDTH) : []), [stocks]);
  const selected = useMemo(() => {
    if (!stocks) return null;
    return stocks.find((s) => s.ticker === requested) ?? pickWidest(stocks);
  }, [stocks, requested]);
  const ticker = selected?.ticker ?? "";

  /* Pin the default choice into the URL once, so a later refetch cannot silently swap the token being read. */
  useEffect(() => {
    if (ticker && requested !== ticker) navigate(`/readings?t=${ticker}`, { replace: true });
  }, [ticker, requested, navigate]);

  const select = (t: string) => navigate(`/readings?t=${t}`, { replace: true });

  /* Keep the chosen token in view on the small-screen strip. */
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-testid="strip-${ticker}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [ticker, reduced]);

  /* Arrow keys walk the rail, widest first. */
  useEffect(() => {
    if (!ordered.length || !ticker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable || target.closest("[role=dialog],[role=menu],[role=listbox]"))) return;
      const step = e.key === "ArrowDown" || e.key === "j" ? 1 : e.key === "ArrowUp" || e.key === "k" ? -1 : 0;
      if (!step) return;
      const i = ordered.findIndex((s) => s.ticker === ticker);
      const next = ordered[(i + step + ordered.length) % ordered.length];
      if (next) {
        e.preventDefault();
        select(next.ticker);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered, ticker]);

  const { data: detail, error: detailError } = useGetStock(ticker, {
    query: { enabled: !!ticker, queryKey: getGetStockQueryKey(ticker), refetchInterval: REFETCH_MS, retry: false },
  });
  const { data: history, error: historyError } = useGetStockHistory(
    { ticker, window: "24h" },
    { query: { enabled: !!ticker, queryKey: getGetStockHistoryQueryKey({ ticker, window: "24h" }), refetchInterval: 60000, retry: false } },
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const points = history && history.ticker === ticker ? history.points : [];
  const range24h = useMemo(() => {
    const v = points.filter((pt) => pt.premiumBps != null).map((pt) => pt.premiumBps!);
    return v.length ? { lo: Math.min(...v), hi: Math.max(...v) } : null;
  }, [points]);

  const reading = useMemo(() => (selected ? readingFromStock(selected, range24h) : null), [selected, range24h]);
  const status: "loading" | "failed" | "ready" = stocks ? "ready" : error ? "failed" : "loading";
  /* A refresh that failed after data arrived: the figures stay (last successful snapshot) and the strip says so. */
  const refreshFailure = error && (stocks || overview) ? apiErrorMessage(error) : null;

  /* Stage: the dial is drawn at whatever radius the middle column allows (SVG side = 2.04 R + 8). */
  const [stageRef, stage] = useSize<HTMLDivElement>();
  const radius = stage.width ? Math.max(140, Math.min(430, Math.floor((stage.width - 40) / 2.04), stage.height > 0 ? Math.floor((stage.height - 24) / 2.04) : 430)) : 0;
  const compact = radius < 250;

  const priced = stocks?.filter((s) => typeof s.primaryVenue?.premiumBps === "number").length ?? 0;
  const session = overview ? sessionSummary(overview.market) : null;
  const refreshedAgo = dataUpdatedAt ? Math.max(0, Math.round((now - dataUpdatedAt) / 1000)) : null;
  const widest = pickWidest(stocks);
  const v = selected?.primaryVenue ?? null;

  return (
    <div className="flex w-full flex-col" data-testid="page-readings">
      {/* Instrument */}
      <div className="grid grid-cols-1 border-b border-foreground/15 lg:h-[calc(100dvh-4rem-2.25rem)] lg:min-h-[660px] lg:grid-cols-[248px_minmax(0,1fr)_336px] xl:grid-cols-[300px_minmax(0,1fr)_400px] 2xl:grid-cols-[340px_minmax(0,1fr)_440px]">
        {/* Rail */}
        <aside className="hidden min-h-0 flex-col border-r border-foreground/15 lg:flex" aria-label="All readings">
          <div className="flex items-baseline justify-between border-b border-foreground/15 px-4 py-3 font-mono text-[11px] text-foreground/58">
            <span>{stocks ? `${stocks.length} tokens` : "tokens"}</span>
            <span>widest first</span>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            {stocks ? <Rail stocks={stocks} selected={ticker} onSelect={select} /> : <p className="px-4 py-6 font-mono text-[12px] text-foreground/58">{error ? apiErrorMessage(error) : "waiting for the current block"}</p>}
          </div>
          <p className="hidden shrink-0 border-t border-foreground/10 px-4 py-2 font-mono text-[10.5px] text-foreground/52 xl:block">↑ ↓ move between tokens</p>
        </aside>

        {/* Mobile token strip */}
        <div ref={stripRef} className="rail flex overflow-x-auto border-b border-foreground/15 lg:hidden" role="group" aria-label="All readings">
          {ordered.map((s) => {
            const bps = s.primaryVenue?.premiumBps ?? null;
            const active = s.ticker === ticker;
            return (
              <button
                key={s.ticker}
                type="button"
                aria-pressed={active}
                onClick={() => select(s.ticker)}
                className={cn("relative flex shrink-0 flex-col items-start gap-1 border-r border-foreground/10 px-5 py-3.5 text-left transition-colors duration-300", active ? "bg-foreground/[0.02]" : "hover:bg-foreground/[0.02]")}
                data-testid={`strip-${s.ticker}`}
              >
                <span className={cn("absolute inset-x-0 bottom-0 h-[2px] transition-colors duration-300", active ? "bg-foreground" : "bg-transparent")} aria-hidden />
                <span className="font-display text-[17px] leading-none text-foreground">{s.ticker}</span>
                <span className={cn("font-mono text-[11.5px] tnum", bps != null ? "text-primary" : "text-foreground/52")}>{bps != null ? formatBpsBare(bps) : s.status === "no-supply" ? "no supply" : "unpriced"}</span>
              </button>
            );
          })}
        </div>

        {/* Stage */}
        <div className="relative flex min-h-[440px] flex-col lg:min-h-0 stage-field" data-testid="dial-stage">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-foreground/10 px-5 py-2.5 font-mono text-[11px] text-foreground/58 tnum">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={ticker || "none"}
                className="min-w-0 truncate"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {selected ? (
                  <>
                    {selected.name} · {selected.issuer.verified ? "Coinbase-issued" : "issuer unverified"} · {truncateAddress(selected.address)}
                  </>
                ) : status === "failed" ? (
                  "No reading"
                ) : (
                  "Waiting for the current block"
                )}
              </motion.span>
            </AnimatePresence>
            <span className="hidden shrink-0 sm:inline">
              {selected && widest && selected.ticker === widest.ticker ? `widest of ${priced} priced` : v ? `${v.dexLabel} · ${selected?.ticker}/${v.quoteToken.symbol}` : ""}
            </span>
          </div>

          <div ref={stageRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-3">
            {radius > 0 && <Comparator reading={reading} status={status} radius={radius} compact={compact} detail="full" />}
          </div>

          {/* The last 24 hours, drawn under the face on wide screens */}
          <div className="hidden shrink-0 border-t border-foreground/10 xl:block" data-testid="stage-trace">
            <div className="flex items-baseline justify-between px-5 pt-2.5 font-mono text-[11px] text-foreground/58 tnum">
              <span className="min-w-0 truncate">
                {range24h ? (
                  <>
                    low <Figure key={`${ticker}-lo`} value={range24h.lo} format={formatBpsBare} /> · high <Figure key={`${ticker}-hi`} value={range24h.hi} format={formatBpsBare} />
                  </>
                ) : history ? (
                  "no priced history yet"
                ) : historyError ? null : (
                  "loading history"
                )}
                {historyError ? <span className="text-dev-dislocated">{range24h ? " · " : ""}refresh failed: {apiErrorMessage(historyError)}{range24h ? " · showing the last successful read" : ""}</span> : null}
              </span>
            </div>
            <div className="h-[150px] px-5 pb-2 pt-1.5">
              {points.length > 1 ? (
                <PremiumTrace points={points} height={132} dense className="block h-[132px] w-full" />
              ) : (
                <div className="h-full border-b border-foreground/10" aria-hidden />
              )}
            </div>
          </div>
        </div>

        {/* Sheet */}
        <aside className="min-h-0 border-t border-foreground/15 lg:border-l lg:border-t-0" aria-label="Sheet">
          <div className="scroll-thin lg:h-full lg:overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={ticker || "none"}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {selected ? (
                  <SheetPanel
                    stock={selected}
                    detail={detail}
                    detailError={detailError ? apiErrorMessage(detailError) : null}
                    history={history}
                    historyError={historyError ? apiErrorMessage(historyError) : null}
                    blockNumber={overview?.blockNumber ?? null}
                    now={now}
                    traceOnStage
                  />
                ) : (
                  <p className="px-5 py-6 font-mono text-[12px] text-foreground/58">{status === "failed" ? "the last snapshot could not be read" : "waiting for the current block"}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>

      {/* Status strip */}
      <div className="flex flex-col gap-1 border-b border-foreground/15 px-5 py-2 font-mono text-[10.5px] text-foreground/58 sm:px-8 lg:h-10 lg:flex-row lg:items-center lg:justify-between lg:py-0 tnum" data-testid="status-strip">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {overview ? (
            <>
              <span>Block</span>
              <Tick text={overview.blockNumber.toLocaleString("en-US")} className="text-foreground/80" />
              <span className="hidden sm:inline">· {utcStamp(overview.snapshotAtUtc)}</span>
              {refreshedAgo != null ? <span className="hidden md:inline">· read {refreshedAgo} s ago</span> : null}
            </>
          ) : error ? (
            apiErrorMessage(error)
          ) : (
            "waiting for the current block"
          )}
          {session ? <span className="hidden lg:inline">· {session.label}</span> : null}
          {session?.detail ? <span className="hidden 2xl:inline">· {session.detail}</span> : null}
          {refreshFailure ? (
            <span className="text-dev-dislocated" data-testid="refresh-failure">
              · refresh failed: {refreshFailure} · showing the last successful snapshot
            </span>
          ) : null}
        </span>
        <span className="shrink-0">
          {stocks ? `${priced} priced · ` : ""}Built by vaibhav0xq
        </span>
      </div>

      <Bands stocks={stocks} />

      <section className="border-t border-foreground/15" data-testid="section-notes">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-16 sm:px-8 lg:py-20 xl:px-12">
          <IntegrityNotes alerts={overview?.alerts} className="max-w-[960px]" />
        </div>
      </section>
    </div>
  );
}
