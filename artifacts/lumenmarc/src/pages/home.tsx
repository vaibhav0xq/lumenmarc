import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Search, AlertTriangle, Info, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { 
  useGetOverview, 
  useListStocks, 
  getGetOverviewQueryKey, 
  getListStocksQueryKey,
  StockSummary
} from "@workspace/api-client-react";
import { cn, formatBps, formatUsd, formatAgo, formatEt } from "@/lib/utils";
import { FeedStateBadge, DeviationStateBadge, PremiumColorText, HealthDot } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReferenceLineHero } from "@/components/reference-line/reference-line-hero";
import { ReferenceLineInline } from "@/components/reference-line/reference-line-inline";

type SortKey = keyof StockSummary | 'premium' | 'poolPrice' | 'liquidity';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;


export default function Home() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

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

  const sortedStocks = useMemo(() => {
    if (!stocks) return [];
    let sortableStocks = [...stocks];
    if (sortConfig !== null) {
      sortableStocks.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'ticker':
            aValue = a.ticker;
            bValue = b.ticker;
            break;
          case 'reference':
            aValue = a.reference.price;
            bValue = b.reference.price;
            break;
          case 'poolPrice':
            aValue = a.primaryVenue?.priceUsd ?? -Infinity;
            bValue = b.primaryVenue?.priceUsd ?? -Infinity;
            break;
          case 'premium':
            aValue = a.primaryVenue?.premiumBps ?? -Infinity;
            bValue = b.primaryVenue?.premiumBps ?? -Infinity;
            break;
          case 'liquidity':
            aValue = a.primaryVenue?.liquidityUsd ?? -Infinity;
            bValue = b.primaryVenue?.liquidityUsd ?? -Infinity;
            break;
          default:
            aValue = a[sortConfig.key as keyof StockSummary];
            bValue = b[sortConfig.key as keyof StockSummary];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableStocks;
  }, [stocks, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      {/* Hero */}
      <section className="flex flex-col items-center text-center space-y-6 pt-10">
        <h1 className="font-sans text-3xl md:text-5xl tracking-tight max-w-4xl leading-tight font-bold">
          LumenMarc reveals <span className="font-serif italic text-4xl md:text-6xl font-normal">the difference</span> between official stock reference prices and always-on onchain tokenized-stock markets.
        </h1>
        
        <form onSubmit={handleCheck} className="w-full max-w-xl flex flex-col sm:flex-row gap-3 mt-4 relative z-20">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input 
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Address, ticker or Basename" 
              className="pl-12 h-14 text-lg bg-card/50 backdrop-blur-sm border-border focus-visible:ring-1 focus-visible:ring-primary rounded-xl font-mono shadow-xl shadow-black/20 w-full"
            />
          </div>
          <Button type="submit" size="lg" className="h-14 px-8 font-semibold rounded-xl shadow-md w-full sm:w-auto">
            Verify
          </Button>
        </form>
      </section>

      {/* Cinematic Luminous Line */}
      <div className="mt-12 md:mt-16 w-full">
        {stocks && stocks.length > 0 && <ReferenceLineHero stocks={stocks} overview={overview} />}
      </div>

      {/* Tight Overview Strip */}
      {overview && (
        <section className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 items-start">
              
              <div className="space-y-2">
                <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <HealthDot isHealthy={overview.market.state === 'open'} />
                  Session State
                </h2>
                <div>
                  <p className="text-xl font-bold tracking-tight">{overview.market.state.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{overview.market.reason}</p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/80 mt-2 space-y-0.5">
                  <p>NY: {overview.market.localTime}</p>
                  {overview.market.nextOpenUtc && <p>Next open: {formatEt(overview.market.nextOpenUtc)}</p>}
                  {overview.market.nextCloseUtc && <p>Next close: {formatEt(overview.market.nextCloseUtc)}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Coverage</h3>
                <div>
                  <p className="text-xl font-mono">{overview.tokensLive} <span className="text-sm font-sans text-muted-foreground font-medium">live · {overview.tokensTotal} issued</span></p>
                </div>
                <div className="flex flex-col gap-1 mt-2 text-[10px] font-mono font-bold">
                  <span className="text-feed-live">{overview.feeds.live} Live feeds</span>
                  <span className="text-feed-held">{overview.feeds.held} Held feeds</span>
                  {overview.feeds.stale > 0 && <span className="text-feed-stale">{overview.feeds.stale} Stale feeds</span>}
                  {overview.feeds.unavailable > 0 && <span className="text-feed-unavailable">{overview.feeds.unavailable} Unavailable</span>}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Market Size</h3>
                <div>
                  <p className="text-xl font-mono">{formatUsd(overview.floatUsd, 0)} <span className="text-sm font-sans text-muted-foreground font-medium">float</span></p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/80 mt-2 space-y-0.5">
                  <p>Liq: {formatUsd(overview.liquidityUsd, 0)}</p>
                  <p>24h Vol: {formatUsd(overview.volume24hUsd, 0)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Snapshot</h3>
                <div className="text-sm font-mono" data-testid="text-snapshot-meta">
                  <p>Block {overview.blockNumber.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs mt-1">{formatAgo(overview.snapshotAtUtc)}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Integrity Alerts Full Width */}
          {overview.alerts.length > 0 && (
            <div className="flex flex-col gap-3">
              {overview.alerts.map((alert, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-xl flex flex-col md:flex-row md:items-start gap-2 md:gap-4 text-sm font-mono border",
                  alert.severity === 'danger' ? "bg-destructive/10 border-destructive/20 text-destructive-foreground" :
                  alert.severity === 'caution' ? "bg-feed-stale/10 border-feed-stale/20 text-feed-stale" :
                  "bg-secondary/50 border-border text-foreground"
                )}>
                  <div className="flex items-start gap-2 shrink-0 md:w-1/3">
                    {alert.severity === 'danger' ? <ShieldAlert className="size-4 shrink-0 mt-0.5" /> :
                     alert.severity === 'caution' ? <AlertTriangle className="size-4 shrink-0 mt-0.5" /> :
                     <Info className="size-4 shrink-0 mt-0.5" />}
                    <span className="font-bold break-words [overflow-wrap:anywhere]">{alert.title}</span>
                  </div>
                  <div className="opacity-90 break-words [overflow-wrap:anywhere] md:w-2/3">
                    {alert.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* The Tape Table */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl tracking-wide italic flex items-center gap-3">
          The Tape
          <div className="h-px bg-border flex-1 ml-4 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
        </h2>
        
        {isStocksLoading ? (
          <div className="h-96 flex items-center justify-center border border-border rounded-xl bg-card">
            <p className="text-muted-foreground font-mono animate-pulse">Scanning the tape...</p>
          </div>
        ) : stocks ? (
          <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/80 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 w-12"></th>
                    <th className="p-4 font-bold cursor-pointer hover:text-foreground transition-colors group select-none" onClick={() => requestSort('ticker')}>
                      <div className="flex items-center gap-1">Stock <SortIcon active={sortConfig?.key === 'ticker'} direction={sortConfig?.direction} /></div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:text-foreground transition-colors group select-none hidden md:table-cell">
                      Venue
                    </th>
                    <th className="p-4 font-bold text-right cursor-pointer hover:text-foreground transition-colors group select-none hidden sm:table-cell" onClick={() => requestSort('reference')}>
                      <div className="flex items-center justify-end gap-1"><SortIcon active={sortConfig?.key === 'reference'} direction={sortConfig?.direction} /> Reference</div>
                    </th>
                    <th className="p-4 font-bold text-right cursor-pointer hover:text-foreground transition-colors group select-none" onClick={() => requestSort('poolPrice')}>
                      <div className="flex items-center justify-end gap-1"><SortIcon active={sortConfig?.key === 'poolPrice'} direction={sortConfig?.direction} /> Pool Price</div>
                    </th>
                    <th className="p-4 font-bold text-right cursor-pointer hover:text-foreground transition-colors group select-none" onClick={() => requestSort('premium')}>
                      <div className="flex items-center justify-end gap-1"><SortIcon active={sortConfig?.key === 'premium'} direction={sortConfig?.direction} /> Premium</div>
                    </th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 font-bold text-right cursor-pointer hover:text-foreground transition-colors group select-none hidden lg:table-cell" onClick={() => requestSort('liquidity')}>
                      <div className="flex items-center justify-end gap-1"><SortIcon active={sortConfig?.key === 'liquidity'} direction={sortConfig?.direction} /> Liquidity</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedStocks.map((s, i) => (
                    <tr key={s.ticker} 
                        className="hover:bg-secondary/30 transition-all duration-300 group hover:shadow-[inset_0_0_15px_rgba(255,255,255,0.03)] cursor-pointer relative" 
                        style={{ animationDelay: `${i * 30}ms` }}
                        data-testid={`row-stock-${s.ticker}`}
                        onClick={() => setLocation(`/s/${s.ticker}`)}>
                      <td className="p-4 w-12 border-r border-border/20">
                        <ReferenceLineInline 
                          premiumBps={s.primaryVenue?.premiumBps ?? null} 
                          deviationState={s.deviationState} 
                          size="sm" 
                        />
                      </td>
                      <td className="p-4 relative">
                        <Link href={`/s/${s.ticker}`} data-testid={`link-stock-${s.ticker}`} className="absolute inset-0 z-10" aria-label={`View ${s.ticker}`}></Link>
                        <div className="flex flex-col relative z-20 pointer-events-none gap-0.5">
                          <span className="font-mono font-bold text-base w-fit group-hover:text-primary transition-colors">{s.ticker}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-[200px]">{s.name}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell relative z-20">
                        {s.primaryVenue ? (
                          <a href={s.primaryVenue.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs hover:text-primary transition-colors flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {s.primaryVenue.dexLabel} <ExternalLink className="size-3 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono tabular-nums hidden sm:table-cell">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold text-[13px]">{formatUsd(s.reference.price)}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div><FeedStateBadge state={s.reference.state} /></div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="font-mono text-xs z-50">
                              Updated: {formatAgo(s.reference.updatedAtUtc)}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono tabular-nums">
                        {s.primaryVenue ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold text-[13px]">{formatUsd(s.primaryVenue.priceUsd)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs uppercase tracking-widest">Unpriced</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono tabular-nums">
                        {s.primaryVenue && s.primaryVenue.premiumBps !== null ? (
                          <div className="flex flex-col items-end">
                            <PremiumColorText bps={s.primaryVenue.premiumBps} state={s.deviationState}>
                              {formatBps(s.primaryVenue.premiumBps)}
                            </PremiumColorText>
                            {s.primaryVenue.premiumPct !== null && (
                              <span className="text-[10px] text-muted-foreground">{s.primaryVenue.premiumPct > 0 ? "+" : ""}{s.primaryVenue.premiumPct.toFixed(2)}%</span>
                            )}
                          </div>
                        ) : s.primaryVenue && s.primaryVenue.premiumBps === null ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[9px] text-feed-stale uppercase tracking-widest cursor-help border-b border-dashed border-feed-stale/50 pb-0.5">
                                Unpriced
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="font-mono text-xs max-w-xs z-50">
                              <p>Quoted in {s.primaryVenue.quoteToken.symbol}; the USD price is inferred and not comparable to the reference.</p>
                              {s.primaryVenue.warnings.map((w, j) => <p key={j} className="text-muted-foreground mt-1">{w}</p>)}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <DeviationStateBadge state={s.deviationState} />
                      </td>
                      <td className="p-4 text-right font-mono tabular-nums text-xs text-muted-foreground hidden lg:table-cell">
                        {s.primaryVenue ? formatUsd(s.primaryVenue.liquidityUsd, 0) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
      
      {overview && overview.disclosures.length > 0 && (
        <section className="text-xs text-muted-foreground/40 space-y-2 border-t border-border/30 pt-8 pb-4 font-mono max-w-4xl mx-auto text-center">
          {overview.disclosures.map((disc, i) => <p key={i}>{disc}</p>)}
        </section>
      )}
    </div>
  );
}

function SortIcon({ active, direction }: { active?: boolean, direction?: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="size-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
  return direction === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />;
}