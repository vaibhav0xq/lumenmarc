import { StockLabel } from "@workspace/api-client-react";
import { ShieldCheck, ShieldAlert, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifyBand({ verify, summary }: { verify: StockLabel['verify'], summary: StockLabel['summary'] }) {
  return (
    <section className="space-y-6 relative">
      <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent hidden md:block" />
      <div className="flex items-baseline gap-4 border-b border-border/40 pb-4">
        <h2 className="text-2xl font-serif italic tracking-wide">Verify</h2>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">Issuer & Contract Authenticity</span>
      </div>

      <div className={cn(
        "p-6 md:p-8 rounded-2xl border backdrop-blur-sm relative overflow-hidden",
        verify.verified ? "bg-primary/5 border-primary/20 shadow-[inset_0_0_40px_rgba(0,82,255,0.03)]" : "bg-destructive/5 border-destructive/20"
      )}>
        {verify.verified && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        )}
        
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
          <div className="flex-1 min-w-0 space-y-8">
            <div className="space-y-2">
              <div className="flex items-start gap-3 min-w-0">
                {verify.verified ? <ShieldCheck className="size-6 text-primary shrink-0" /> : <ShieldAlert className="size-6 text-destructive shrink-0" />}
                <h3 className={cn("text-xl md:text-2xl font-bold tracking-tight min-w-0 [overflow-wrap:anywhere] break-words", verify.verified ? "text-primary" : "text-destructive")}>
                  {verify.statement}
                </h3>
              </div>
            </div>
            
            <div className="font-mono text-sm space-y-4 max-w-md">
              <div className="flex flex-col gap-1 border-b border-border/30 pb-3 min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Contract Address</span>
                <a href={`https://basescan.org/address/${verify.address}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-2 [overflow-wrap:anywhere] leading-relaxed min-w-0">
                  <span className="break-all">{verify.address}</span> <ExternalLink className="size-3 opacity-50 shrink-0" />
                </a>
              </div>
              <div className="flex flex-col gap-1 border-b border-border/30 pb-3 min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Issuer Source</span>
                <span className="[overflow-wrap:anywhere] break-words leading-relaxed">{summary.issuer.source}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            {verify.checks.map(check => (
              <div key={check.id} className="p-4 bg-background/50 border border-border/40 rounded-xl flex gap-4 backdrop-blur-md">
                <div className="mt-0.5 shrink-0">
                  {check.passed === true ? <ShieldCheck className="size-5 text-feed-live" /> :
                   check.passed === false ? <ShieldAlert className="size-5 text-destructive" /> :
                   <Info className="size-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base break-words">{check.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
