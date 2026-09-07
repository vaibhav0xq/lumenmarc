import { StockLabel } from "@workspace/api-client-react";
import { formatUsd, formatNumber, cn, formatEt } from "@/lib/utils";


export function OwnBand({ stock }: { stock: StockLabel }) {
  return (
    <section className="space-y-6 relative">
      <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent hidden md:block" />
      <div className="flex items-baseline gap-4 border-b border-border/40 pb-4">
        <h2 className="text-2xl font-serif italic tracking-wide">Own</h2>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">Share Equivalents & Metadata</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 space-y-8 flex flex-col">
          <div>
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4">Multiplier</h3>
            <p className="text-4xl font-mono tracking-tighter">{stock.own.multiplier.toFixed(4)}</p>
            <p className="text-sm font-medium mt-2">1 token = {stock.own.sharesPerToken} share-equivalents</p>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Last changed: {stock.own.lastMultiplierChangeUtc ? formatEt(stock.own.lastMultiplierChangeUtc) : "Never"}
            </p>
          </div>
          
          <div className="font-mono tabular-nums text-sm space-y-4 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/30 pb-3 gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Supply</span>
              <span className="text-base">{formatNumber(stock.supply.totalSupply, 4)} tokens</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/30 pb-3 gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Share Equivalents</span>
              <span className="text-base">{formatNumber(stock.supply.shareEquivalents, 4)} sh-eq</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-2 gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Float Value</span>
              <span className="text-lg">{formatUsd(stock.supply.floatUsd)}</span>
            </div>
            <p className="text-xs text-muted-foreground/60 font-sans leading-relaxed pt-2">{stock.supply.holdersNote}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 font-mono text-sm space-y-5">
            <div className="flex flex-col gap-1 border-b border-border/30 pb-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Underlying</span>
              <span className="text-base">{stock.summary.underlying}</span>
            </div>
            <div className="flex flex-col gap-2 border-b border-border/30 pb-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Dividend Policy</span>
              <span className="font-sans text-sm leading-relaxed text-foreground/80">{stock.own.dividendPolicy}</span>
            </div>
            <div className="flex flex-col gap-2 border-b border-border/30 pb-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Custodian</span>
              <span className="font-sans text-sm leading-relaxed text-foreground/80">{stock.own.custodian}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ISIN</span>
              <span className="text-base">{stock.metadata.isin || "—"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Contract Pauses</span>
              <span className="flex gap-2">
                {stock.pauses.mint && <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded text-xs uppercase tracking-widest font-bold border border-destructive/20">Mint</span>}
                {stock.pauses.burn && <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded text-xs uppercase tracking-widest font-bold border border-destructive/20">Burn</span>}
                {stock.pauses.transfer && <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded text-xs uppercase tracking-widest font-bold border border-destructive/20">Transfer</span>}
                {[stock.pauses.mint, stock.pauses.burn, stock.pauses.transfer].some((p) => p === null) ? (
                  <span className="text-muted-foreground text-xs uppercase tracking-widest">Unknown</span>
                ) : (
                  !stock.pauses.mint && !stock.pauses.burn && !stock.pauses.transfer && <span className="text-feed-live text-xs uppercase tracking-widest font-bold">None</span>
                )}
              </span>
            </div>
          </div>

          {stock.corporateActions.length > 0 && (
            <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8">
              <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-6">Corporate Actions</h3>
              <div className="space-y-6">
                {stock.corporateActions.map((ca, i) => (
                  <div key={`${ca.kind}:${ca.txHash ?? ca.scheduledForUtc ?? ca.title}:${i}`} className="space-y-2 relative pl-4 before:absolute before:left-0 before:top-1.5 before:bottom-0 before:w-px before:bg-border">
                    <div className="absolute left-[-3px] top-1.5 size-1.5 rounded-full bg-primary" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="font-bold text-sm">{ca.title}</p>
                      <span className={cn(
                        "text-[9px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded border inline-flex self-start",
                        ca.status === 'executed' ? "bg-feed-live/10 text-feed-live border-feed-live/20" : 
                        ca.status === 'scheduled' ? "bg-feed-stale/10 text-feed-stale border-feed-stale/20" : "bg-secondary border-border"
                      )}>{ca.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ca.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
