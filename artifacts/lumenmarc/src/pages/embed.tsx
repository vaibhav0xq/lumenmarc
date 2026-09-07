import { useRoute } from "wouter";
import { 
  useGetStock, 
  getGetStockQueryKey
} from "@workspace/api-client-react";
import { formatBps, formatUsd, formatAgo, apiErrorMessage } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";
import { DeviationStateBadge, FeedStateBadge, PremiumColorText } from "@/components/status-badges";
import { ReferenceLineInline } from "@/components/reference-line/reference-line-inline";

export default function Embed() {
  const [match, params] = useRoute("/embed/:ticker");
  const ticker = params?.ticker || "";

  const { data: stock, isLoading, error } = useGetStock(
    ticker,
    { 
      query: { 
        enabled: !!ticker, 
        queryKey: getGetStockQueryKey(ticker),
        refetchInterval: 30000 
      } 
    }
  );

  if (isLoading) {
    return (
      <div className="w-full min-h-[100dvh] bg-background text-foreground flex flex-col p-4 bg-grain">
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Scanning {ticker}</p>
        </div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="w-full min-h-[100dvh] bg-background text-foreground flex flex-col p-4 bg-grain border border-border">
        <div className="flex flex-col items-center gap-2 text-center mt-8">
          <ShieldAlert className="size-5 text-destructive mb-1" />
          <p className="font-mono text-xs text-destructive font-bold">Failed to load {ticker}</p>
          <p className="font-mono text-[10px] text-muted-foreground max-w-[250px] [overflow-wrap:anywhere]">{apiErrorMessage(error, "Data unavailable")}</p>
        </div>
      </div>
    );
  }

  const baseUrl = import.meta.env.BASE_URL || "/";
  const labelUrl = `${baseUrl}s/${stock.summary.ticker}`;

  return (
    <div className="w-full min-h-[100dvh] bg-background text-foreground flex flex-col font-sans overflow-hidden bg-grain">
      <div className="p-3 md:p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <a href={labelUrl} target="_blank" rel="noopener noreferrer" className="text-lg md:text-xl font-bold tracking-tight leading-none hover:text-primary transition-colors flex items-center gap-1.5">
                {stock.summary.ticker}
                <ExternalLink className="size-3 opacity-50 shrink-0" />
              </a>
              {stock.verify.verified ? (
                <span title="Verified by Coinbase" className="shrink-0"><ShieldCheck className="size-4 text-primary" /></span>
              ) : (
                <span title="Unverified" className="shrink-0"><ShieldAlert className="size-4 text-destructive" /></span>
              )}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate max-w-[150px] md:max-w-[220px]">{stock.summary.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <DeviationStateBadge state={stock.price.deviationState} />
            <FeedStateBadge state={stock.price.reference.state} />
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center gap-3">
          {/* Visual line */}
          <div className="shrink-0 flex items-center gap-1.5">
             <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest leading-none shrink-0">REF</span>
             <ReferenceLineInline 
                premiumBps={stock.price.premiumBps} 
                deviationState={stock.price.deviationState} 
                size="md" 
                className="w-16 md:w-20"
             />
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1 items-center">
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Reference</p>
              <p className="text-sm md:text-base font-mono leading-none tabular-nums font-semibold">
                {formatUsd(stock.price.reference.price)}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Pool Price</p>
              <p className="text-sm md:text-base font-mono leading-none tabular-nums font-semibold">
                {stock.price.primaryVenue ? formatUsd(stock.price.primaryVenue.priceUsd) : "Unpriced"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Details row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
           <div className="text-[10px] font-mono text-muted-foreground tabular-nums flex items-center gap-1">
             <div className="size-1.5 rounded-full bg-feed-live/50"></div>
             {formatAgo(stock.updatedAtUtc)}
           </div>
           <div className="text-right">
            {stock.price.premiumBps !== null ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest leading-none">PREM</span>
                <PremiumColorText bps={stock.price.premiumBps} state={stock.price.deviationState}>
                  <span className="font-mono text-xs md:text-sm font-bold tabular-nums">
                    {formatBps(stock.price.premiumBps)}
                  </span>
                </PremiumColorText>
              </div>
            ) : (
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Unpriced</span>
            )}
           </div>
        </div>
      </div>
      
      {/* Footer attribution */}
      <div className="bg-secondary/80 px-4 py-2.5 text-center border-y border-border/40 shrink-0">
        <a href={labelUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5">
          <div className="size-1.5 bg-primary rounded-full shadow-[0_0_6px_rgba(0,82,255,0.8)]"></div>
          LumenMarc
        </a>
      </div>
    </div>
  );
}
