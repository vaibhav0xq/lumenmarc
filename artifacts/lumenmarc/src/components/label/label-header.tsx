import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Copy, Share2 } from "lucide-react";
import { StockLabel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ReferenceLineInline } from "@/components/reference-line/reference-line-inline";
import { PremiumColorText } from "@/components/status-badges";
import { formatBps } from "@/lib/utils";

export function LabelHeader({ stock }: { stock: StockLabel }) {
  const { toast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(stock.shareText);
    toast({ title: "Copied to clipboard", description: "Ready to paste." });
  };

  const handleShare = () => {
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(stock.shareText)}`, '_blank');
  };

  const premiumBps = stock.price.primaryVenue?.premiumBps ?? null;
  const devState = stock.price.deviationState;

  return (
    <section className="space-y-8">
      <Link href="/" className="inline-flex items-center text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3 mr-2" /> Tape
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-5xl md:text-7xl font-sans tracking-tight font-bold">
              {stock.summary.ticker}
            </h1>
            {stock.verify.verified && (
              <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
                <ShieldCheck className="size-6 md:size-8 text-primary shadow-[0_0_12px_rgba(0,82,255,0.4)] rounded-full" />
              </div>
            )}
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground font-serif italic tracking-wide">{stock.summary.name}</p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4">
          <div className="flex items-center gap-4 bg-card/40 border border-border/50 p-4 rounded-2xl shadow-xl">
            <ReferenceLineInline 
              premiumBps={premiumBps} 
              deviationState={devState} 
              size="md" 
            />
            <div className="flex flex-col">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Live Premium</span>
              <div className="text-3xl md:text-4xl font-mono tabular-nums tracking-tighter">
                {premiumBps !== null ? (
                  <PremiumColorText bps={premiumBps} state={devState}>
                    {formatBps(premiumBps)}
                  </PremiumColorText>
                ) : (
                  <span className="text-muted-foreground">Unpriced</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 font-mono text-xs uppercase tracking-widest h-8 bg-card">
              <Copy className="size-3" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 font-mono text-xs uppercase tracking-widest h-8 bg-card">
              <Share2 className="size-3" /> Post
            </Button>
          </div>
        </div>
      </div>

      <p className="text-lg md:text-xl font-medium text-foreground/80 leading-relaxed max-w-3xl">
        {stock.summary.headline}
      </p>
    </section>
  );
}
