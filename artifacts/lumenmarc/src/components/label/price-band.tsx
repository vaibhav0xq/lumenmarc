import { StockLabel } from "@workspace/api-client-react";
import { formatUsd, formatBps, cn, formatEt } from "@/lib/utils";
import { HealthDot, FeedStateBadge, DeviationStateBadge, PremiumColorText } from "@/components/status-badges";
import { ReferenceLineInline } from "@/components/reference-line/reference-line-inline";
import { lazy, Suspense } from "react";

// recharts is only needed on the label page; load it on demand so the home instrument stays light.
const HistoryChart = lazy(() => import("./history-chart").then((m) => ({ default: m.HistoryChart })));
import { SizeCheckModule } from "./size-check";
import { ExternalLink } from "lucide-react";


export function PriceBand({ stock }: { stock: StockLabel }) {
  return (
    <section className="space-y-6 relative">
      <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent hidden md:block" />
      <div className="flex items-baseline gap-4 border-b border-border/40 pb-4">
        <h2 className="text-2xl font-serif italic tracking-wide">Price</h2>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">Fair Value & Onchain Liquidity</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Readings */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 space-y-12">
          
          {/* Reference Price */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Chainlink Reference <HealthDot isHealthy={stock.price.reference.state === 'live'} />
            </h3>
            <div className="flex items-end gap-4">
              <p className="text-5xl font-mono tracking-tighter">{formatUsd(stock.price.reference.price)}</p>
              <FeedStateBadge state={stock.price.reference.state} className="mb-2" />
            </div>
            <div className="flex flex-col gap-1 text-xs font-mono text-muted-foreground">
              <p>Updated: {formatEt(stock.price.reference.updatedAtUtc)}</p>
              <p className="font-sans leading-relaxed">{stock.price.reference.note}</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-border/40" />

          {/* Primary Pool Price */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
              <span>Primary Pool Price</span>
              {stock.price.primaryVenue && <span className="text-muted-foreground/50">{stock.price.primaryVenue.dexLabel}</span>}
            </h3>
            <div className="flex items-end gap-4">
              <p className="text-5xl font-mono tracking-tighter">
                {stock.price.primaryVenue ? formatUsd(stock.price.primaryVenue.priceUsd) : "Unpriced"}
              </p>
              <DeviationStateBadge state={stock.price.deviationState} className="mb-2" />
            </div>
            <p className="text-sm font-medium leading-relaxed max-w-md">
              <PremiumColorText bps={stock.price.premiumBps} state={stock.price.deviationState}>
                {stock.price.statement}
              </PremiumColorText>
            </p>
          </div>
        </div>

        {/* Dynamic Tools */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 flex flex-col">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-6">Premium History (24h, bps)</h3>
            <div className="flex-1 min-h-[192px]">
              <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/20" data-testid="loading-history-chart" />}>
                <HistoryChart ticker={stock.summary.ticker} />
              </Suspense>
            </div>
          </div>
          
          <SizeCheckModule ticker={stock.summary.ticker} hasVenue={!!stock.price.primaryVenue} />
        </div>
      </div>

      {/* Venues Table */}
      {stock.venues.length > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[600px] text-left border-collapse text-sm">
            <thead className="bg-secondary/20">
              <tr className="border-b border-border/40 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                <th className="p-4 w-12"></th>
                <th className="p-4 font-bold">Venue</th>
                <th className="p-4 font-bold">Pair</th>
                <th className="p-4 font-bold text-right">Price</th>
                <th className="p-4 font-bold text-right">Premium</th>
                <th className="p-4 font-bold text-right">Liquidity</th>
                <th className="p-4 font-bold text-right hidden sm:table-cell">24h Vol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono tabular-nums">
              {stock.venues.map((v, i) => (
                <tr key={`${v.dex}:${v.pairAddress}:${i}`} className={cn("hover:bg-secondary/40 transition-colors", v.isPrimary && "bg-primary/5")}>
                  <td className="p-4 w-12 border-r border-border/10">
                    <ReferenceLineInline 
                      premiumBps={v.premiumBps} 
                      deviationState={v.deviationState} 
                      size="sm" 
                    />
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <a href={v.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1 font-bold">
                      {v.dexLabel} <ExternalLink className="size-3 opacity-50" />
                    </a>
                    {v.isPrimary && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Primary</span>}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {v.baseToken.symbol}/{v.quoteToken.symbol}
                  </td>
                  <td className="p-4 text-right text-base">{formatUsd(v.priceUsd)}</td>
                  <td className="p-4 text-right text-base">
                    <PremiumColorText bps={v.premiumBps} state={v.deviationState}>{formatBps(v.premiumBps)}</PremiumColorText>
                  </td>
                  <td className="p-4 text-right">{formatUsd(v.liquidityUsd, 0)}</td>
                  <td className="p-4 text-right hidden sm:table-cell">{formatUsd(v.volume24hUsd, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
