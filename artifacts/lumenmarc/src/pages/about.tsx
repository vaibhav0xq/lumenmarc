import { ExternalLink, Database, Shield, Activity, Scale, Zap, Info, ArrowRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function About() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const safeBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const embedCode = `<iframe src="${origin}${safeBase}/embed/NVDAc" width="400" height="200" style="border:none;"></iframe>`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-16 md:space-y-20 animate-in fade-in duration-700 pb-24 pt-4 md:pt-8 px-2 md:px-0">
      
      {/* Hero */}
      <section className="space-y-4 md:space-y-6 text-center max-w-2xl mx-auto">
        <h1 className="font-serif italic text-4xl md:text-5xl lg:text-6xl tracking-wide">
          The Reference Line
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed">
          LumenMarc is a precision fair-value and integrity instrument for Coinbase Tokenized Stocks (B20 tokens) on the Base network. It provides eligible non-US users and integrators with a neutral, verifiable read on market state.
        </p>
      </section>

      {/* How it Works */}
      <section className="space-y-6 md:space-y-8 relative">
        <div className="absolute -inset-x-2 md:-inset-x-4 inset-y-0 bg-secondary/20 rounded-2xl md:rounded-3xl -z-10 border border-border/20"></div>
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          <h2 className="text-xs md:text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Database className="size-4" /> Three Pillars of Data
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-2 md:space-y-3">
              <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 md:mb-4">
                <Shield className="size-5" />
              </div>
              <h3 className="font-bold text-base md:text-lg">Verify</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Is this token genuinely issued by Coinbase, or is it a lookalike imitating the B20 prefix and ticker? We verify Base RPC reads against the official pinned address list.
              </p>
            </div>
            <div className="space-y-2 md:space-y-3">
              <div className="size-10 rounded-full bg-cyan-glow/10 border border-cyan-glow/20 flex items-center justify-center text-cyan-glow mb-3 md:mb-4">
                <Scale className="size-5" />
              </div>
              <h3 className="font-bold text-base md:text-lg">Price</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                How far does the onchain liquidity pool price sit from the official Chainlink total-return reference? The reference line measures this distance using public DexScreener pool data, refreshed about once a minute.
              </p>
            </div>
            <div className="space-y-2 md:space-y-3">
              <div className="size-10 rounded-full bg-muted border border-border flex items-center justify-center text-foreground mb-3 md:mb-4">
                <Activity className="size-5" />
              </div>
              <h3 className="font-bold text-base md:text-lg">Own</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                What does one token actually represent in terms of share-equivalents and multiplier adjustments? We fetch the real multiplier directly from the token contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* State Dictionary */}
      <section className="space-y-6 md:space-y-8">
        <h2 className="text-xl md:text-2xl font-serif italic tracking-wide border-b border-border/40 pb-3 md:pb-4">State Dictionary</h2>
        
        <div className="space-y-10 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <div>
              <h3 className="text-xs md:text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-1 md:mb-2">
                Deviation States
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">The difference between the pool price and the Chainlink reference price. The distance is measured in basis points (bps).</p>
            </div>
            
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
              <StateCard name="fair" color="text-dev-fair bg-dev-fair/10 border-dev-fair/30" desc="Within 50 basis points (bps) of the reference." />
              <StateCard name="elevated" color="text-dev-elevated bg-dev-elevated/10 border-dev-elevated/30" desc="Between 50 and 300 bps distance." />
              <StateCard name="dislocated" color="text-dev-dislocated bg-dev-dislocated/10 border-dev-dislocated/30" desc="More than 300 bps distance. High friction." />
              <StateCard name="unpriced" color="text-dev-unpriced bg-dev-unpriced/10 border-dev-unpriced/30" desc="No premium can be computed: no pool, no readable reference, or the only pool is quoted against an asset that is not USD-comparable." />
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div>
              <h3 className="text-xs md:text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-1 md:mb-2">
                Feed States
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">The status and freshness of the underlying Chainlink oracle feed relative to US market hours.</p>
            </div>
            
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
              <StateCard name="live" color="text-feed-live bg-feed-live/10 border-feed-live/30" desc="Updating normally during market hours." />
              <StateCard name="held" color="text-feed-held bg-feed-held/10 border-feed-held/30" desc="US market closed; the feed holds the last regular-session print. Expected, not an error." />
              <StateCard name="stale" color="text-feed-stale bg-feed-stale/10 border-feed-stale/30" desc="US market has been open for over 20 minutes with no new print. Treat gaps with caution." />
              <StateCard name="unavailable" color="text-feed-unavailable bg-feed-unavailable/10 border-feed-unavailable/30" desc="The feed could not be read or returned a non-positive answer." />
            </div>
          </div>
        </div>
      </section>

      {/* For Integrators */}
      <section className="space-y-6 md:space-y-8">
        <h2 className="text-xl md:text-2xl font-serif italic tracking-wide border-b border-border/40 pb-3 md:pb-4 flex items-center gap-2 md:gap-3">
          <Zap className="size-5 md:size-6 text-primary" /> API & Integrations
        </h2>
        
        <div className="space-y-6 text-muted-foreground">
          <p className="text-sm md:text-base leading-relaxed">
            LumenMarc is infrastructure. The exact same data powering this interface is available as a public JSON API for aggregators, wallets, and dashboards. No API key required.
          </p>
          
          <div className="bg-card border border-border/50 rounded-xl p-4 md:p-6 shadow-lg shadow-black/20 overflow-hidden">
            <h3 className="text-xs md:text-sm font-mono font-bold text-foreground uppercase tracking-widest mb-3 md:mb-4">REST Endpoints</h3>
            <div className="space-y-1 font-mono text-[10px] md:text-xs lg:text-sm">
              <EndpointLink displayPath="api/overview" examplePath="api/overview" method="GET" />
              <EndpointLink displayPath="api/stocks" examplePath="api/stocks" method="GET" />
              <EndpointLink displayPath="api/stocks/{ticker}" examplePath="api/stocks/NVDAc" method="GET" />
              <EndpointLink displayPath="api/history?ticker=&window=" examplePath="api/history?ticker=NVDAc&window=24h" method="GET" />
              <EndpointLink displayPath="api/size-check?ticker=&amountUsd=&side=" examplePath="api/size-check?ticker=NVDAc&amountUsd=10000&side=buy" method="GET" />
              <EndpointLink displayPath="api/check?q=" examplePath="api/check?q=NVDAc" method="GET" />
              <EndpointLink displayPath="api/portfolio/{account}" examplePath="api/portfolio/jesse.base.eth" method="GET" />
              <EndpointLink displayPath="api/market" examplePath="api/market" method="GET" />
              <EndpointLink displayPath="api/healthz" examplePath="api/healthz" method="GET" />
            </div>
          </div>
          
          <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 md:p-6">
            <h3 className="text-xs md:text-sm font-mono font-bold text-foreground uppercase tracking-widest mb-3 md:mb-4">Embeddable Widgets</h3>
            <p className="text-xs md:text-sm mb-3 md:mb-4 leading-relaxed">
              Embeddable pricing cards are available for any supported ticker. Render them in an iframe to display live premiums and oracle health on your own site.
            </p>
            <div className="relative group">
              <pre className="block bg-background border border-border/50 p-3 md:p-4 rounded-lg text-[10px] md:text-xs font-mono text-primary overflow-x-auto whitespace-pre-wrap break-all">
                {embedCode}
              </pre>
              <button 
                onClick={handleCopy}
                className="absolute right-2 top-2 p-1.5 md:p-2 bg-secondary/80 hover:bg-secondary text-foreground rounded-md border border-border/50 transition-colors"
                title="Copy embed code"
              >
                {copied ? <Check className="size-3 md:size-4 text-dev-fair" /> : <Copy className="size-3 md:size-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Disclosures & Credits */}
      <section className="space-y-6 pt-8 md:pt-12 border-t border-border/40">
        <div className="flex items-start gap-2 md:gap-3 text-muted-foreground/60 p-4 md:p-6 bg-card/30 rounded-xl border border-border/20">
          <Info className="size-4 md:size-5 shrink-0 mt-0.5" />
          <div className="space-y-2 md:space-y-3 text-[10px] md:text-xs lg:text-sm leading-relaxed">
            <p className="font-medium text-foreground/80">Not available to US persons. Not an offer, solicitation or investment advice.</p>
            <p>LumenMarc is an independent data provider and is not affiliated with Coinbase, Base, or Chainlink. Onchain pricing is derived from decentralized exchanges (DexScreener). These pools are permissionless and subject to high volatility and low liquidity. LumenMarc does not guarantee execution at the prices shown.</p>
            <p>Data may be delayed. Always verify directly onchain before taking action. Thresholds are LumenMarc's conventions.</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center pt-6 md:pt-8">
          <a href="https://github.com/vaibhav0xq/lumenmarc" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-mono text-muted-foreground hover:text-primary transition-colors group">
            Built by vaibhav0xq
            <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

    </div>
  );
}

function StateCard({ name, color, desc }: { name: string, color: string, desc: string }) {
  return (
    <div className="p-4 md:p-5 border border-border/40 bg-card/50 hover:bg-card transition-colors rounded-xl flex flex-col gap-2 md:gap-3 group">
      <span className={cn("self-start inline-flex items-center px-2 py-0.5 rounded text-[9px] md:text-[10px] uppercase font-bold tracking-widest border", color)}>
        {name}
      </span>
      <p className="text-xs md:text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors leading-relaxed">{desc}</p>
    </div>
  );
}

function EndpointLink({ displayPath, examplePath, method }: { displayPath: string, examplePath: string, method: string }) {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const safeBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const fullUrl = `${safeBase}/${examplePath}`;

  return (
    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 md:gap-3 py-1.5 md:py-2 px-2 hover:bg-secondary/40 rounded-md group break-all">
      <span className="font-bold text-primary shrink-0 w-8 md:w-10">{method}</span>
      <span className="text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-1.5 flex-1">
        <span className="truncate md:whitespace-normal">{safeBase}/{displayPath}</span>
        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto md:ml-2" />
      </span>
    </a>
  );
}
