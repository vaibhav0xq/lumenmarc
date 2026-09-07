import { useState } from "react";
import { useRoute } from "wouter";
import { 
  useGetStock, 
  getGetStockQueryKey,
  useGetStockHistory,
  getGetStockHistoryQueryKey,
  useGetSizeCheck,
  getGetSizeCheckQueryKey
} from "@workspace/api-client-react";
import { 
  ShieldCheck, ShieldAlert, ArrowLeft, 
  Info, ExternalLink, Copy, Share2
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn, formatBps, formatUsd, formatNumber, truncateAddress } from "@/lib/utils";
import { FeedStateBadge, DeviationStateBadge, PremiumColorText, HealthDot } from "@/components/status-badges";
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

export default function Label() {
  const [match, params] = useRoute("/s/:ticker");
  const ticker = params?.ticker || "";

  const { data: stock, isLoading, error } = useGetStock(
    ticker,
    { 
      query: { 
        enabled: !!ticker, 
        queryKey: getGetStockQueryKey(ticker) 
      } 
    }
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <p className="font-mono text-muted-foreground animate-pulse">Fetching label for {ticker}...</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <ShieldAlert className="size-16 text-destructive/50 mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Token Not Found</h1>
        <p className="text-muted-foreground max-w-sm mb-8">
          {(error as any)?.error || "The requested tokenized stock could not be found."}
        </p>
        <Link href="/">
          <Button variant="outline">Return to Tape</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <section className="space-y-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="size-4 mr-2" /> Back to Tape
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3">
              {stock.summary.ticker}
              {stock.verify.verified && <ShieldCheck className="size-8 text-primary" />}
            </h1>
            <p className="text-xl text-muted-foreground mt-2">{stock.summary.name}</p>
          </div>
          <ShareActions shareText={stock.shareText} />
        </div>
        <p className="text-lg font-medium bg-secondary/40 border border-border/50 p-4 rounded-xl leading-relaxed">
          {stock.summary.headline}
        </p>
      </section>

      {/* VERIFY BAND */}
      <section className="space-y-4">
        <BandHeader title="Verify" subtitle="Issuer & Contract Authenticity" />
        <div className={cn(
          "p-6 rounded-xl border",
          stock.verify.verified ? "bg-primary/5 border-primary/20" : "bg-destructive/10 border-destructive/30"
        )}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <h3 className={cn("text-xl font-bold [overflow-wrap:anywhere]", stock.verify.verified ? "text-primary" : "text-destructive")}>
                {stock.verify.statement}
              </h3>
              <div className="font-mono text-sm space-y-2">
                <div className="flex justify-between border-b border-border/30 pb-2">
                  <span className="text-muted-foreground">Contract Address</span>
                  <a href={`https://basescan.org/address/${stock.verify.address}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                    {truncateAddress(stock.verify.address)} <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6 border-b border-border/30 pb-2">
                  <span className="text-muted-foreground shrink-0">Issuer Source</span>
                  <span className="sm:text-right [overflow-wrap:anywhere]">{stock.summary.issuer.source}</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              {stock.verify.checks.map(check => (
                <div key={check.id} className="p-3 bg-card border border-border/50 rounded-lg text-sm flex gap-3">
                  <div className="mt-0.5">
                    {check.passed === true ? <ShieldCheck className="size-4 text-feed-live" /> :
                     check.passed === false ? <ShieldAlert className="size-4 text-destructive" /> :
                     <Info className="size-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICE BAND */}
      <section className="space-y-4">
        <BandHeader title="Price" subtitle="Fair Value & Onchain Liquidity" />
        <div className="grid md:grid-cols-2 gap-6">
          
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                Reference Price <HealthDot isHealthy={stock.price.reference.state === 'live'} />
              </h3>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-mono">{formatUsd(stock.price.reference.price)}</p>
                <FeedStateBadge state={stock.price.reference.state} className="mb-1" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{stock.price.reference.note}</p>
            </div>
            
            <div className="pt-6 border-t border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Primary Pool Price
              </h3>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-mono">
                  {stock.price.primaryVenue ? formatUsd(stock.price.primaryVenue.priceUsd) : "Unpriced"}
                </p>
                <DeviationStateBadge state={stock.price.deviationState} className="mb-1" />
              </div>
              <p className="text-sm font-medium mt-2">
                <PremiumColorText bps={stock.price.premiumBps} state={stock.price.deviationState}>
                  {stock.price.statement}
                </PremiumColorText>
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Premium History (24h, bps)</h3>
              <HistoryChart ticker={stock.summary.ticker} />
            </div>
            
            <SizeCheckModule ticker={stock.summary.ticker} hasVenue={!!stock.price.primaryVenue} />
          </div>
        </div>

        {stock.venues.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl overflow-x-auto mt-4">
            <table className="w-full min-w-[560px] text-left border-collapse text-sm">
              <thead className="bg-secondary/30">
                <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-medium">Venue</th>
                  <th className="p-4 font-medium text-right">Price</th>
                  <th className="p-4 font-medium text-right">Premium</th>
                  <th className="p-4 font-medium text-right">Liquidity</th>
                  <th className="p-4 font-medium text-right hidden sm:table-cell">24h Vol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {stock.venues.map((v, i) => (
                  <tr key={i} className={cn("hover:bg-secondary/20", v.isPrimary && "bg-primary/5")}>
                    <td className="p-4 flex items-center gap-2">
                      <a href={v.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{v.dexLabel}</a>
                      {v.isPrimary && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded uppercase font-bold">Primary</span>}
                    </td>
                    <td className="p-4 text-right font-mono">{formatUsd(v.priceUsd)}</td>
                    <td className="p-4 text-right font-mono">
                      <PremiumColorText bps={v.premiumBps} state={v.deviationState}>{formatBps(v.premiumBps)}</PremiumColorText>
                    </td>
                    <td className="p-4 text-right font-mono">{formatUsd(v.liquidityUsd, 0)}</td>
                    <td className="p-4 text-right font-mono hidden sm:table-cell">{formatUsd(v.volume24hUsd, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* OWN BAND */}
      <section className="space-y-4">
        <BandHeader title="Own" subtitle="Share Equivalents & Metadata" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Multiplier</h3>
              <p className="text-3xl font-mono">{stock.own.multiplier.toFixed(4)}</p>
              <p className="text-sm mt-1">1 token = {stock.own.sharesPerToken} share-equivalents</p>
              <p className="text-xs text-muted-foreground mt-2">
                Last changed: {stock.own.lastMultiplierChangeUtc ? new Date(stock.own.lastMultiplierChangeUtc).toLocaleDateString() : "Never"}
              </p>
            </div>
            
            <div className="pt-6 border-t border-border/40 font-mono text-sm space-y-3">
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground">Total Supply</span>
                <span>{formatNumber(stock.supply.totalSupply, 4)} tokens</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground">Share Equivalents</span>
                <span>{formatNumber(stock.supply.shareEquivalents, 4)} share-equiv.</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Float Value</span>
                <span>{formatUsd(stock.supply.floatUsd)}</span>
              </div>
              <p className="text-xs text-muted-foreground/80 font-sans mt-2">{stock.supply.holdersNote}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-6 font-mono text-sm space-y-3">
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground">Underlying</span>
                <span>{stock.summary.underlying}</span>
              </div>
              <div className="flex flex-col gap-1.5 border-b border-border/30 pb-3">
                <span className="text-muted-foreground">Dividend Policy</span>
                <span className="font-sans text-sm leading-relaxed">{stock.own.dividendPolicy}</span>
              </div>
              <div className="flex flex-col gap-1.5 border-b border-border/30 pb-3">
                <span className="text-muted-foreground">Custodian</span>
                <span className="font-sans text-sm leading-relaxed">{stock.own.custodian}</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground">ISIN</span>
                <span>{stock.metadata.isin || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract Pauses</span>
                <span className="flex gap-2 text-xs">
                  {stock.pauses.mint && <span className="text-destructive bg-destructive/10 px-1 rounded">Mint</span>}
                  {stock.pauses.burn && <span className="text-destructive bg-destructive/10 px-1 rounded">Burn</span>}
                  {stock.pauses.transfer && <span className="text-destructive bg-destructive/10 px-1 rounded">Transfer</span>}
                  {[stock.pauses.mint, stock.pauses.burn, stock.pauses.transfer].some((p) => p === null) ? (
                    <span className="text-muted-foreground">Unknown (unreadable)</span>
                  ) : (
                    !stock.pauses.mint && !stock.pauses.burn && !stock.pauses.transfer && <span className="text-feed-live">None</span>
                  )}
                </span>
              </div>
            </div>

            {stock.corporateActions.length > 0 && (
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Corporate Actions</h3>
                <div className="space-y-4">
                  {stock.corporateActions.map((ca, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{ca.title}</p>
                        <span className={cn(
                          "text-[10px] uppercase font-bold tracking-wider px-1.5 rounded",
                          ca.status === 'executed' ? "bg-feed-live/10 text-feed-live" : 
                          ca.status === 'scheduled' ? "bg-feed-stale/10 text-feed-stale" : "bg-secondary"
                        )}>{ca.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{ca.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Disclosures Footer */}
      <section className="pt-8 border-t border-border/40 text-xs text-muted-foreground/60 space-y-2">
        {stock.disclosures.map((disc, i) => <p key={i}>{disc}</p>)}
        <p>Data provided by LumenMarc. Verify all information onchain before acting. Block: {stock.blockNumber}</p>
      </section>

    </div>
  );
}

function BandHeader({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="border-b border-border/40 pb-2 mb-4">
      <h2 className="text-2xl font-bold tracking-tight">
        {title} <span className="text-muted-foreground font-normal ml-2 text-lg">{subtitle}</span>
      </h2>
    </div>
  );
}

function ShareActions({ shareText }: { shareText: string }) {
  const { toast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    toast({ title: "Copied to clipboard", description: "Ready to paste." });
  };

  const handleShare = () => {
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleCopy} className="gap-2">
        <Copy className="size-4" /> Copy
      </Button>
      <Button variant="outline" onClick={handleShare} className="gap-2">
        <Share2 className="size-4" /> Post
      </Button>
    </div>
  );
}

function HistoryChart({ ticker }: { ticker: string }) {
  const { data, error } = useGetStockHistory(
    { ticker, window: '24h' },
    { query: { queryKey: getGetStockHistoryQueryKey({ ticker, window: '24h' }), retry: false } }
  );

  if (error) {
    const detail = (error as { data?: { error?: string } | null }).data?.error ?? error.message;
    return (
      <div className="h-32 flex items-center justify-center px-4 text-center text-sm text-muted-foreground" data-testid="text-history-error">
        {detail}
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">No history available</div>;
  }

  // Format data for Recharts
  const chartData = data.points
    .filter(p => p.premiumBps !== null)
    .map(p => ({
      time: new Date(p.tUtc).toLocaleTimeString(),
      bps: p.premiumBps
    }));

  if (chartData.length === 0) return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">No priced history</div>;

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
            tickFormatter={(val: number) => `${val > 0 ? '+' : ''}${Math.round(val).toLocaleString()}`}
            domain={['auto', 'auto']}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Area 
            type="monotone" 
            dataKey="bps" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorBps)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SizeCheckModule({ ticker, hasVenue }: { ticker: string, hasVenue: boolean }) {
  const [amountUsd, setAmountUsd] = useState<string>("10000");
  const [side, setSide] = useState<'buy'|'sell'>('buy');
  const [debouncedAmount, setDebouncedAmount] = useState<number>(10000);

  // Debounce the input for the query
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountUsd(e.target.value);
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      // simple timeout
      setTimeout(() => setDebouncedAmount(val), 500);
    }
  };

  const { data, isLoading, error } = useGetSizeCheck(
    { ticker, amountUsd: debouncedAmount, side },
    { 
      query: { 
        enabled: hasVenue && debouncedAmount >= 1,
        retry: false,
        queryKey: getGetSizeCheckQueryKey({ ticker, amountUsd: debouncedAmount, side })
      } 
    }
  );
  const errorMessage = error
    ? ((error as { data?: { error?: string } }).data?.error ?? "Size check unavailable for this pool.")
    : null;

  if (!hasVenue) return null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Size Check (Estimate)</h3>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input 
            value={amountUsd}
            onChange={handleAmountChange}
            type="number"
            min="1"
            className="pl-7 font-mono"
          />
        </div>
        <div className="flex rounded-md border border-input p-0.5 bg-background">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 rounded-sm text-xs font-semibold", side === 'buy' && "bg-primary text-primary-foreground")}
            onClick={() => setSide('buy')}
          >Buy</Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 rounded-sm text-xs font-semibold", side === 'sell' && "bg-primary text-primary-foreground")}
            onClick={() => setSide('sell')}
          >Sell</Button>
        </div>
      </div>

      <div className="pt-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground font-mono">Estimating...</p>
        ) : errorMessage ? (
          <p className="text-sm text-feed-stale" data-testid="text-size-check-error">{errorMessage}</p>
        ) : data ? (
          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Premium</span>
              <span>{formatBps(data.currentPremiumBps)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Price Impact</span>
              <span className="text-feed-stale">{formatBps(data.estimatedImpactBps)}</span>
            </div>
            <div className="flex justify-between border-t border-border/30 pt-2 font-bold">
              <span>Est. All-In vs Reference</span>
              <span>{formatBps(data.estimatedAllInVsReferenceBps)}</span>
            </div>
            <p className="text-xs text-muted-foreground/70 font-sans mt-2">{data.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
