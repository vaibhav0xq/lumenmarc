import { useRoute, Link } from "wouter";
import { apiErrorMessage } from "@/lib/utils";
import { useGetStock, getGetStockQueryKey } from "@workspace/api-client-react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

import { LabelHeader } from "@/components/label/label-header";
import { VerifyBand } from "@/components/label/verify-band";
import { PriceBand } from "@/components/label/price-band";
import { OwnBand } from "@/components/label/own-band";
import { IntegrateBand } from "@/components/label/integrate-band";

export default function Label() {
  const [, params] = useRoute("/s/:ticker");
  const ticker = params?.ticker || "";

  const { data: stock, isLoading, error } = useGetStock(
    ticker,
    { 
      query: { 
        enabled: !!ticker, 
        queryKey: getGetStockQueryKey(ticker),
        refetchInterval: 30000,
      } 
    }
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-px h-24 bg-border/40 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1/3 bg-cyan-glow/50 blur-[2px] animate-in slide-in-from-top-full duration-1000 repeat-infinite" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">Reading tape for {ticker}...</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <ShieldAlert className="size-12 text-destructive/50 mb-6" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">Token Not Found</h1>
        <p className="text-muted-foreground max-w-sm mb-8">
          {apiErrorMessage(error, "The requested tokenized stock could not be found.")}
        </p>
        <Link href="/">
          <Button variant="outline" className="font-mono text-xs uppercase tracking-widest">Return to Tape</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-16 animate-in fade-in duration-700 pb-20 pt-8">
      
      <div className="space-y-20">
        <LabelHeader stock={stock} />
        <VerifyBand verify={stock.verify} summary={stock.summary} />
        <PriceBand stock={stock} />
        <OwnBand stock={stock} />
        <IntegrateBand stock={stock} />
      </div>

      {/* Disclosures Footer */}
      <section className="pt-12 border-t border-border/40 text-[10px] uppercase tracking-widest font-mono text-muted-foreground/40 space-y-3">
        {stock.disclosures.map((disc, i) => <p key={i}>{disc}</p>)}
        <p className="text-muted-foreground/60">Data provided by LumenMarc. Verify all information onchain before acting. Block: {stock.blockNumber}</p>
      </section>

    </div>
  );
}
