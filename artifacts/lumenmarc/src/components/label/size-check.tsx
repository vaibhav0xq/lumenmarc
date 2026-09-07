import { useState, useEffect } from "react";
import { useGetSizeCheck, getGetSizeCheckQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatBps, apiErrorMessage } from "@/lib/utils";

export function SizeCheckModule({ ticker, hasVenue }: { ticker: string, hasVenue: boolean }) {
  const [amountUsd, setAmountUsd] = useState<string>("10000");
  const [side, setSide] = useState<'buy'|'sell'>('buy');
  const [debouncedAmount, setDebouncedAmount] = useState<number>(10000);

  useEffect(() => {
    const val = parseFloat(amountUsd);
    if (!isNaN(val) && val > 0) {
      const timer = setTimeout(() => setDebouncedAmount(val), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [amountUsd]);

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
    ? apiErrorMessage(error, "Size check unavailable for this pool.")
    : null;

  if (!hasVenue) return null;

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Size Check (Estimate)</h3>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
          <Input 
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            type="number"
            min="1"
            className="pl-8 font-mono text-lg h-12 bg-background border-border/50"
          />
        </div>
        <div className="flex rounded-xl border border-border/50 p-1 bg-background shrink-0">
          <Button 
            variant="ghost" 
            className={cn("h-10 px-6 rounded-lg font-mono text-xs uppercase tracking-widest", side === 'buy' && "bg-primary text-primary-foreground")}
            onClick={() => setSide('buy')}
          >Buy</Button>
          <Button 
            variant="ghost" 
            className={cn("h-10 px-6 rounded-lg font-mono text-xs uppercase tracking-widest", side === 'sell' && "bg-primary text-primary-foreground")}
            onClick={() => setSide('sell')}
          >Sell</Button>
        </div>
      </div>

      <div className="pt-4 border-t border-border/30 min-h-[120px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center pt-8">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground animate-pulse">Estimating impact...</p>
          </div>
        ) : errorMessage ? (
          <div className="h-full flex items-center justify-center pt-8">
            <p className="text-sm font-mono text-feed-stale" data-testid="text-size-check-error">{errorMessage}</p>
          </div>
        ) : data ? (
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Current Premium</span>
              <span className="text-base">{formatBps(data.currentPremiumBps)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-muted-foreground">Est. Price Impact</span>
              <span className="text-base text-feed-stale">{formatBps(data.estimatedImpactBps)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold">
              <span className="text-primary">Est. All-In vs Reference</span>
              <span className="text-lg text-primary">{formatBps(data.estimatedAllInVsReferenceBps)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/50 font-sans mt-4 leading-relaxed">{data.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
