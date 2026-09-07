import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { 
  useGetOverview, 
  useListStocks, 
  getGetOverviewQueryKey, 
  getListStocksQueryKey
} from "@workspace/api-client-react";
import { cn, formatBps, formatUsd, formatAgo } from "@/lib/utils";
import { FeedStateBadge, DeviationStateBadge, PremiumColorText, HealthDot } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");

  const { data: overview, isLoading: isOverviewLoading } = useGetOverview({
    query: {
      queryKey: getGetOverviewQueryKey(),
      refetchInterval: 30000,
    }
  });

  const { data: stocks, isLoading: isStocksLoading } = useListStocks({
    query: {
      queryKey: getListStocksQueryKey(),
      refetchInterval: 30000,
    }
  });

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      setLocation(`/check?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Hero / Check Input */}
      <section className="space-y-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          A clear market mark for <br className="hidden md:block"/>tokenized stocks.
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Factual, non-custodial reads on Coinbase-issued B20 tokens across the Base network.
        </p>
        
        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input 
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Paste any 0x address, ticker, or Basename..." 
              className="pl-10 h-12 text-lg bg-card border-border/50"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8 font-semibold">Verify & Price</Button>
        </form>
      </section>

      {/* Market Overview */}
      {overview && (
        <section className="bg-card border border-border/50 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-8 justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <HealthDot isHealthy={overview.market.state === 'open'} />
                US Market Status
              </h2>
              <p className="text-2xl font-bold">{overview.market.state.toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">{overview.market.reason}</p>
              <p className="text-xs text-muted-foreground/70 tabular-nums">Local: {overview.market.localTime}</p>
              <p className="text-xs text-muted-foreground/70 tabular-nums" data-testid="text-snapshot-meta">
                Base block {overview.blockNumber.toLocaleString()} · snapshot {formatAgo(overview.snapshotAtUtc)}
              </p>
            </div>
            
            <div className="flex gap-12">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Tokens / Feeds</h3>
                <p className="text-xl font-mono">{overview.tokensLive} live</p>
                <div className="text-xs text-muted-foreground space-x-2">
                  <span className="text-feed-live">{overview.feeds.live} live</span>
                  <span className="text-feed-held">{overview.feeds.held} held</span>
                  {overview.feeds.stale > 0 && <span className="text-feed-stale">{overview.feeds.stale} stale</span>}
                  {overview.feeds.unavailable > 0 && <span className="text-feed-unavailable">{overview.feeds.unavailable} unavail</span>}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Market Float</h3>
                <p className="text-xl font-mono">{formatUsd(overview.floatUsd, 0)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">Liq: {formatUsd(overview.liquidityUsd, 0)}</p>
              </div>
            </div>
          </div>
          
          {overview.alerts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/40 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Integrity Alerts</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.alerts.map((alert, i) => (
                  <div key={i} className={cn(
                    "p-3 rounded-md flex gap-3 text-sm border min-w-0",
                    alert.severity === 'danger' ? "bg-destructive/10 border-destructive/20 text-destructive-foreground" :
                    alert.severity === 'caution' ? "bg-feed-stale/10 border-feed-stale/20 text-feed-stale" :
                    "bg-secondary border-border/40"
                  )}>
                    {alert.severity === 'danger' ? <ShieldAlert className="size-4 shrink-0 mt-0.5" /> :
                     alert.severity === 'caution' ? <AlertTriangle className="size-4 shrink-0 mt-0.5" /> :
                     <Info className="size-4 shrink-0 mt-0.5" />}
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p className="font-semibold">{alert.title}</p>
                      <p className="opacity-80">{alert.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* The Tape */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">The Tape</h2>
        
        {isStocksLoading ? (
          <div className="h-64 flex items-center justify-center border border-border/40 rounded-xl bg-card">
            <p className="text-muted-foreground font-mono animate-pulse">Loading tape...</p>
          </div>
        ) : stocks ? (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-3 font-medium">Stock</th>
                  <th className="p-3 font-medium text-right">Reference</th>
                  <th className="p-3 font-medium text-right">Pool Price</th>
                  <th className="p-3 font-medium text-right">Premium</th>
                  <th className="p-3 font-medium text-center">Status</th>
                  <th className="p-3 font-medium text-right">Liquidity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {stocks.map((s, i) => (
                  <tr key={s.ticker} className="hover:bg-secondary/40 transition-colors group" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="p-3">
                      <Link href={`/s/${s.ticker}`} className="flex items-baseline gap-2 group-hover:text-primary transition-colors">
                        <span className="font-bold text-lg">{s.ticker}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">{s.name}</span>
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      <div className="flex flex-col items-end">
                        <span>{formatUsd(s.reference.price)}</span>
                        <FeedStateBadge state={s.reference.state} className="mt-1" />
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      {s.primaryVenue ? (
                        <div className="flex flex-col items-end">
                          <span>{formatUsd(s.primaryVenue.priceUsd)}</span>
                          {s.primaryVenue.premiumBps === null && (
                            <span className="text-[10px] text-feed-stale mt-0.5" title="Inferred through a non-USD counter-asset; not comparable to the reference">
                              inferred via {s.primaryVenue.baseToken.address.toLowerCase() === s.address.toLowerCase() ? s.primaryVenue.quoteToken.symbol : s.primaryVenue.baseToken.symbol}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unpriced</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      {s.primaryVenue && s.primaryVenue.premiumBps !== null ? (
                        <PremiumColorText bps={s.primaryVenue.premiumBps} state={s.deviationState}>
                          {formatBps(s.primaryVenue.premiumBps)}
                        </PremiumColorText>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <DeviationStateBadge state={s.deviationState} />
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm text-muted-foreground">
                      {s.primaryVenue ? formatUsd(s.primaryVenue.liquidityUsd, 0) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      
      {overview && overview.disclosures.length > 0 && (
        <section className="text-xs text-muted-foreground/60 space-y-2 pt-8">
          {overview.disclosures.map((disc, i) => <p key={i}>{disc}</p>)}
        </section>
      )}
    </div>
  );
}
