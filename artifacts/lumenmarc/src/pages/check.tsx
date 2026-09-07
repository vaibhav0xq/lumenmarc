import { useLocation, Link } from "wouter";
import { AlertCircle, CheckCircle2, ShieldAlert, FileSearch, ArrowRight, ExternalLink, Info, Search } from "lucide-react";
import { 
  useCheckAddress, 
  getCheckAddressQueryKey,
  type CheckVerdict
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { cn, formatBps, formatUsd, truncateAddress, formatNumber, apiErrorMessage } from "@/lib/utils";
import { DeviationStateBadge, PremiumColorText } from "@/components/status-badges";
import { ReferenceLineInline } from "@/components/reference-line/reference-line-inline";
import { motion, useReducedMotion } from "framer-motion";

export default function Check() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQ = searchParams.get("q") || "";
  
  const [inputVal, setInputVal] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

  const prefersReducedMotion = useReducedMotion();

  // Keep internal state in sync if URL changes
  useEffect(() => {
    const currentQ = new URLSearchParams(window.location.search).get("q") || "";
    if (currentQ !== q) {
      setQ(currentQ);
      setInputVal(currentQ);
    }
  }, [window.location.search]);

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
      setLocation(`/check?q=${encodeURIComponent(inputVal.trim())}`, { replace: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-12 animate-in fade-in duration-700 pb-20 pt-8">
      <div className="space-y-4">
        <h1 className="font-sans text-3xl md:text-5xl tracking-tight font-bold">Verify Asset</h1>
        <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed">
          Paste any token or pool address, ticker, or Basename to check its authenticity and pricing facts.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full relative mt-6 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input 
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="0x... or NVDAc"
            className="pl-12 pr-24 h-14 text-lg bg-card/50 backdrop-blur-sm border-border focus-visible:ring-1 focus-visible:ring-primary rounded-xl font-mono shadow-xl shadow-black/20 w-full"
          />
          <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 font-semibold rounded-lg shadow-md">
            Verify
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="h-48 flex items-center justify-center border border-border/50 rounded-xl bg-card/20 shadow-inner">
          <p className="font-mono text-muted-foreground animate-pulse flex items-center gap-3">
            <FileSearch className="size-5" /> Analyzing onchain data...
          </p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-8 border border-destructive/30 bg-destructive/10 rounded-xl text-destructive-foreground font-mono shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <h3 className="font-bold flex items-center gap-3 mb-3 text-sm uppercase tracking-widest">
            <AlertCircle className="size-5" /> Error resolving input
          </h3>
          <p className="text-sm opacity-90 leading-relaxed [overflow-wrap:anywhere] break-words">{apiErrorMessage(error, "Invalid input or network error.")}</p>
        </div>
      )}

      {result && !isLoading && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-10"
        >
          <VerdictHeader verdict={result.verdict} headline={result.headline} details={result.details} />

          {result.stockTicker && (
            <Link href={`/s/${result.stockTicker}`} className="block">
              <div className="p-6 border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl flex items-center justify-between cursor-pointer group shadow-[0_0_15px_rgba(0,82,255,0.05)]">
                <div>
                  <h3 className="font-semibold text-primary font-sans text-lg tracking-tight">View Full Stock Label for {result.stockTicker}</h3>
                  <p className="text-sm font-mono text-muted-foreground mt-1">See comprehensive pricing, liquidity, and ownership facts.</p>
                </div>
                <ArrowRight className="size-6 text-primary group-hover:translate-x-1.5 transition-transform" />
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {result.token && (
              <div className="space-y-4 lg:col-span-2">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                  Token Fingerprint
                  <div className="h-px bg-border flex-1 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
                </h3>
                <div className="bg-card border border-border/50 rounded-xl p-6 font-mono text-sm shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">Address</span>
                      <a href={`https://basescan.org/address/${result.token.address}`} target="_blank" rel="noreferrer" className="text-primary hover:text-cyan-glow transition-colors flex items-center gap-2 font-medium">
                        <span className="[overflow-wrap:anywhere] break-words">{truncateAddress(result.token.address)}</span> <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">Name / Symbol</span>
                      <span className="font-medium [overflow-wrap:anywhere] break-words block">{result.token.name || "—"} / {result.token.symbol || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">B20 Prefix</span>
                      <span className={cn("font-medium", result.token.prefixLooksOfficial ? "text-primary" : "text-muted-foreground")}>
                        {result.token.prefixLooksOfficial ? "Yes (0xB200...)" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">Coinbase Issuer</span>
                      <span className={cn("font-medium", result.token.matchedTicker ? "text-feed-live" : "text-muted-foreground")}>
                        {result.token.matchedTicker ? `Matched: ${result.token.matchedTicker}` : "Unverified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">Token Kind</span>
                      <span className="font-medium">{result.token.isB20 ? "Tokenized Stock (B20)" : "Standard ERC-20"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">Supply</span>
                      <span className="font-medium tabular-nums">{result.token.totalSupply !== null ? formatNumber(result.token.totalSupply, 0) : "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-xs tracking-widest block mb-1">Decimals</span>
                      <span className="font-medium tabular-nums">{result.token.decimals !== null ? result.token.decimals : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.pool && (
              <div className="space-y-4 lg:col-span-2">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                  Pool Pricing
                  <div className="h-px bg-border flex-1 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
                </h3>
                <div className="bg-card border border-border/50 rounded-xl p-6 md:p-8 font-mono text-sm space-y-6 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/30 pb-6">
                    <div className="flex items-center gap-4">
                      <ReferenceLineInline 
                        premiumBps={result.pool.premiumBps} 
                        deviationState={result.pool.deviationState} 
                        size="md" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Premium vs Ref</span>
                          <DeviationStateBadge state={result.pool.deviationState} />
                        </div>
                        <div className="text-3xl font-bold mt-1 tracking-tight">
                          <PremiumColorText bps={result.pool.premiumBps} state={result.pool.deviationState}>
                            {result.pool.premiumBps === null ? "Unpriced" : formatBps(result.pool.premiumBps)}
                          </PremiumColorText>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="text-muted-foreground uppercase text-[10px] tracking-widest block">Pool Price</span>
                      <span className="text-2xl tabular-nums font-bold block mt-1">{formatUsd(result.pool.priceUsd)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <span className="text-muted-foreground uppercase text-[10px] tracking-widest block mb-1.5">Venue</span>
                      <span className="flex items-center gap-2 font-medium text-base">
                        {result.pool.dexLabel}
                        <a href={result.pool.url} target="_blank" rel="noreferrer" className="text-primary hover:text-cyan-glow transition-colors">
                          <ExternalLink className="size-4" />
                        </a>
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-[10px] tracking-widest block mb-1.5">Pair</span>
                      <span className="font-medium text-base">{result.pool.baseToken.symbol} / {result.pool.quoteToken.symbol}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-[10px] tracking-widest block mb-1.5">Liquidity</span>
                      <span className="font-medium text-base tabular-nums">{formatUsd(result.pool.liquidityUsd, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {result.checks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                Verification Checks
                <div className="h-px bg-border flex-1 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.checks.map((check) => (
                  <div key={check.id} className="p-5 bg-card border border-border/50 rounded-xl flex items-start gap-4 shadow-xl">
                    <CheckIcon passed={check.passed} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-semibold text-[15px]">{check.label}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-2 leading-relaxed opacity-90">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function VerdictHeader({ verdict, headline, details }: { verdict: CheckVerdict, headline: string, details: string[] }) {
  const styles = {
    verified: "bg-feed-live/5 border-feed-live/30 text-feed-live shadow-[inset_0_0_20px_rgba(20,184,106,0.05),0_0_15px_rgba(20,184,106,0.1)]",
    caution: "bg-feed-stale/5 border-feed-stale/30 text-feed-stale shadow-[inset_0_0_20px_rgba(245,158,11,0.05),0_0_15px_rgba(245,158,11,0.1)]",
    danger: "bg-destructive/5 border-destructive/30 text-destructive-foreground shadow-[inset_0_0_20px_rgba(239,68,68,0.05),0_0_15px_rgba(239,68,68,0.1)]",
    info: "bg-secondary border-border/50 text-foreground shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
  };

  const icons = {
    verified: <CheckCircle2 className="size-10 text-feed-live drop-shadow-[0_0_12px_rgba(20,184,106,0.6)]" />,
    caution: <AlertCircle className="size-10 text-feed-stale drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />,
    danger: <ShieldAlert className="size-10 text-destructive drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]" />,
    info: <FileSearch className="size-10 text-primary drop-shadow-[0_0_12px_rgba(0,82,255,0.6)]" />
  };

  return (
    <div className={cn("p-8 rounded-xl border flex flex-col sm:flex-row gap-6 items-start sm:items-center transition-all backdrop-blur-sm", styles[verdict])}>
      <div className="shrink-0">{icons[verdict]}</div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight font-sans">{headline}</h2>
        <div className="space-y-1.5 text-sm opacity-90 font-mono">
          {details.map((d, i) => <p key={i} className="[overflow-wrap:anywhere] break-words">{d}</p>)}
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ passed, className }: { passed: boolean | null, className?: string }) {
  if (passed === true) return <CheckCircle2 className={cn("size-5 text-feed-live", className)} />;
  if (passed === false) return <AlertCircle className={cn("size-5 text-destructive", className)} />;
  return <Info className={cn("size-5 text-primary", className)} />;
}
