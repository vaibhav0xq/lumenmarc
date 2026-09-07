import { Link } from "wouter";
import { AlertCircle, CheckCircle2, ShieldAlert, FileSearch, ArrowRight, ExternalLink, Info } from "lucide-react";
import { 
  useCheckAddress, 
  getCheckAddressQueryKey,
  type CheckVerdict
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn, formatBps, formatUsd, truncateAddress } from "@/lib/utils";
import { DeviationStateBadge } from "@/components/status-badges";

export default function Check() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialQ = searchParams.get("q") || "";
  
  const [inputVal, setInputVal] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

  const { data: result, isLoading, error } = useCheckAddress(
    { q },
    { 
      query: { 
        enabled: q.length > 0, 
        queryKey: getCheckAddressQueryKey({ q }),
        retry: false
      } 
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setQ(inputVal.trim());
      // Update URL without reload
      window.history.replaceState(null, '', `/check?q=${encodeURIComponent(inputVal.trim())}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Verify Asset</h1>
        <p className="text-muted-foreground">
          Paste any token or pool address, ticker, or Basename to check its authenticity.
        </p>
        
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input 
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="0x... or NVDAc"
            className="h-12 text-lg bg-card border-border/50 font-mono"
          />
          <Button type="submit" size="lg" className="h-12 px-8">Check</Button>
        </form>
      </div>

      {isLoading && (
        <div className="h-40 flex items-center justify-center border border-border/50 rounded-xl bg-card/50">
          <p className="font-mono text-muted-foreground animate-pulse flex items-center gap-2">
            <FileSearch className="size-4" /> Analyzing onchain data...
          </p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-6 border border-destructive/30 bg-destructive/10 rounded-xl text-destructive-foreground">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <AlertCircle className="size-5" /> Error resolving input
          </h3>
          <p className="text-sm opacity-90">{(error as any)?.error || "Invalid input or network error."}</p>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <VerdictHeader verdict={result.verdict} headline={result.headline} details={result.details} />

          {result.stockTicker && (
            <Link href={`/s/${result.stockTicker}`} className="block">
              <div className="p-4 border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl flex items-center justify-between cursor-pointer group">
                <div>
                  <h3 className="font-semibold text-primary">View Full Stock Label</h3>
                  <p className="text-sm text-muted-foreground">See comprehensive pricing, liquidity, and ownership facts for {result.stockTicker}.</p>
                </div>
                <ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )}

          {result.token && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Token Fingerprint</h3>
              <div className="bg-card border border-border/50 rounded-xl p-5 font-mono text-sm space-y-3">
                <div className="flex justify-between border-b border-border/30 pb-3">
                  <span className="text-muted-foreground">Address</span>
                  <a href={`https://basescan.org/address/${result.token.address}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {truncateAddress(result.token.address)} <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-3">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-right max-w-[200px] truncate">{result.token.name || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-3">
                  <span className="text-muted-foreground">Symbol</span>
                  <span>{result.token.symbol || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">B20 Prefix</span>
                  <span>{result.token.prefixLooksOfficial ? "Yes (0xB200...)" : "No"}</span>
                </div>
              </div>
            </div>
          )}

          {result.pool && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Pool Pricing</h3>
              <div className="bg-card border border-border/50 rounded-xl p-5 font-mono text-sm space-y-3">
                <div className="flex justify-between border-b border-border/30 pb-3">
                  <span className="text-muted-foreground">Venue</span>
                  <span className="flex items-center gap-2">
                    {result.pool.dexLabel}
                    <a href={result.pool.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="size-3" />
                    </a>
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-3">
                  <span className="text-muted-foreground">Pair</span>
                  <span>{result.pool.baseToken.symbol} / {result.pool.quoteToken.symbol}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-3">
                  <span className="text-muted-foreground">{result.pool.premiumBps === null && result.pool.matchedTicker ? "Inferred Price" : "Pool Price"}</span>
                  <span>{formatUsd(result.pool.priceUsd)}</span>
                </div>
                {result.pool.matchedTicker && (
                  <div className="flex justify-between items-center border-b border-border/30 pb-3">
                    <span className="text-muted-foreground">Premium vs Ref</span>
                    <div className="flex items-center gap-2">
                      <DeviationStateBadge state={result.pool.deviationState} />
                      <span>{result.pool.premiumBps === null ? "—" : formatBps(result.pool.premiumBps)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidity</span>
                  <span>{formatUsd(result.pool.liquidityUsd, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {result.checks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Verification Checks</h3>
              <div className="space-y-2">
                {result.checks.map((check) => (
                  <div key={check.id} className="p-4 bg-secondary/50 border border-border/30 rounded-lg flex items-start gap-3">
                    <CheckIcon passed={check.passed} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{check.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictHeader({ verdict, headline, details }: { verdict: CheckVerdict, headline: string, details: string[] }) {
  const styles = {
    verified: "bg-feed-live/10 border-feed-live/30 text-feed-live",
    caution: "bg-feed-stale/10 border-feed-stale/30 text-feed-stale",
    danger: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
    info: "bg-secondary border-border/50 text-foreground"
  };

  const icons = {
    verified: <CheckCircle2 className="size-8" />,
    caution: <AlertCircle className="size-8" />,
    danger: <ShieldAlert className="size-8" />,
    info: <FileSearch className="size-8" />
  };

  return (
    <div className={cn("p-6 rounded-xl border flex flex-col sm:flex-row gap-5", styles[verdict])}>
      <div className="shrink-0">{icons[verdict]}</div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">{headline}</h2>
        <div className="space-y-1 text-sm opacity-90">
          {details.map((d, i) => <p key={i}>{d}</p>)}
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ passed, className }: { passed: boolean | null, className?: string }) {
  if (passed === true) return <CheckCircle2 className={cn("size-5 text-feed-live", className)} />;
  if (passed === false) return <AlertCircle className={cn("size-5 text-destructive", className)} />;
  return <Info className={cn("size-5 text-muted-foreground", className)} />;
}
