import { useRoute } from "wouter";
import { 
  useGetStock, 
  getGetStockQueryKey
} from "@workspace/api-client-react";
import { cn, formatBps, formatUsd } from "@/lib/utils";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { DeviationStateBadge, FeedStateBadge } from "@/components/status-badges";

export default function Embed() {
  const [match, params] = useRoute("/embed/:ticker");
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
    return <div className="w-full h-full min-h-[160px] bg-background border border-border flex items-center justify-center p-4">
      <p className="font-mono text-xs text-muted-foreground animate-pulse">Loading {ticker}...</p>
    </div>;
  }

  if (error || !stock) {
    return <div className="w-full h-full min-h-[160px] bg-background border border-border flex items-center justify-center p-4">
      <p className="font-mono text-xs text-destructive">Failed to load {ticker}</p>
    </div>;
  }

  return (
    <div className="w-full bg-background border border-border rounded-xl overflow-hidden flex flex-col font-sans">
      <div className="p-4 border-b border-border/50 flex items-start justify-between bg-card">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold tracking-tight leading-none">{stock.summary.ticker}</h2>
            {stock.verify.verified ? <ShieldCheck className="size-4 text-primary" /> : <ShieldAlert className="size-4 text-destructive" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{stock.summary.name}</p>
        </div>
        <div className="text-right">
          <DeviationStateBadge state={stock.price.deviationState} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Pool Price</p>
            <p className="text-xl font-mono leading-none">
              {stock.price.primaryVenue ? formatUsd(stock.price.primaryVenue.priceUsd) : "Unpriced"}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Premium</p>
            <p className={cn("text-sm font-mono font-bold", 
              stock.price.deviationState === 'fair' ? "text-dev-fair" : 
              stock.price.deviationState === 'elevated' ? "text-dev-elevated" : 
              stock.price.deviationState === 'dislocated' ? "text-dev-dislocated" : "text-dev-unpriced"
            )}>
              {formatBps(stock.price.premiumBps)}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border/30 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Reference</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-muted-foreground">{formatUsd(stock.price.reference.price)}</p>
            </div>
          </div>
          <FeedStateBadge state={stock.price.reference.state} />
        </div>
      </div>
      
      <div className="bg-secondary/40 p-2 text-center border-t border-border/30">
        <a href={`/s/${stock.summary.ticker}`} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
          Powered by LumenMarc
        </a>
      </div>
    </div>
  );
}
