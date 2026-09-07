export default function About() {
  return (
    <div className="max-w-3xl mx-auto w-full space-y-12 animate-in fade-in duration-500 pb-20">
      
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">About LumenMarc</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          LumenMarc is a fair-value and integrity layer for Coinbase Tokenized Stocks (B20 tokens) on the Base network. It provides eligible non-US traders and integrators with a neutral, verifiable read on market state before they act.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b border-border/40 pb-2">How It Works</h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            When a user searches for an asset, LumenMarc evaluates three pillars of factual data:
          </p>
          <ul className="list-disc pl-5 space-y-2 marker:text-primary">
            <li><strong>Verify:</strong> Is this token genuinely issued by Coinbase, or is it a lookalike imitating the B20 prefix and ticker?</li>
            <li><strong>Price:</strong> How far does the onchain liquidity pool price sit from the official Chainlink total-return reference?</li>
            <li><strong>Own:</strong> What does one token actually represent in terms of share-equivalents and multiplier adjustments?</li>
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b border-border/40 pb-2">State Dictionary</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider mb-3 text-foreground">Deviation State</h3>
            <p className="text-sm text-muted-foreground mb-4">The difference between the pool price and the Chainlink reference price.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StateCard name="fair" color="text-dev-fair bg-dev-fair/10 border-dev-fair/30" desc="Within 50 basis points (bps) of the reference." />
              <StateCard name="elevated" color="text-dev-elevated bg-dev-elevated/10 border-dev-elevated/30" desc="Between 50 and 300 bps distance." />
              <StateCard name="dislocated" color="text-dev-dislocated bg-dev-dislocated/10 border-dev-dislocated/30" desc="More than 300 bps distance. High friction." />
              <StateCard name="unpriced" color="text-dev-unpriced bg-dev-unpriced/10 border-dev-unpriced/30" desc="No premium can be computed: no pool, no readable reference, or the only pool is quoted against an asset that is not USD-comparable (not USDC, ETH/WETH or a Coinbase-issued stock)." />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider mb-3 text-foreground">Feed State</h3>
            <p className="text-sm text-muted-foreground mb-4">The status and freshness of the underlying Chainlink oracle feed.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StateCard name="live" color="text-feed-live bg-feed-live/10 border-feed-live/30" desc="Updating normally during market hours." />
              <StateCard name="held" color="text-feed-held bg-feed-held/10 border-feed-held/30" desc="US market closed; the feed holds the last regular-session print. Expected, not an error." />
              <StateCard name="stale" color="text-feed-stale bg-feed-stale/10 border-feed-stale/30" desc="US market has been open for over 20 minutes with no new print. Treat gaps with caution." />
              <StateCard name="unavailable" color="text-feed-unavailable bg-feed-unavailable/10 border-feed-unavailable/30" desc="The feed could not be read or returned a non-positive answer." />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b border-border/40 pb-2">For Integrators</h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            LumenMarc is infrastructure. The exact same data powering this interface is available as a public JSON API for aggregators, wallets, and dashboards. No API key required for light usage.
          </p>
          <div className="bg-card border border-border/50 rounded-lg p-4 font-mono text-sm space-y-2">
            <p className="text-foreground">GET /api/overview</p>
            <p className="text-foreground">GET /api/stocks</p>
            <p className="text-foreground">GET /api/stocks/&#123;ticker&#125;</p>
            <p className="text-foreground">GET /api/history?ticker=&window=</p>
            <p className="text-foreground">GET /api/size-check?ticker=&amountUsd=&side=</p>
            <p className="text-foreground">GET /api/check?q=</p>
            <p className="text-foreground">GET /api/portfolio/&#123;account&#125;</p>
            <p className="text-foreground">GET /api/market</p>
          </div>
          <p className="text-sm">
            Embeddable cards are also available at <code>/embed/&#123;ticker&#125;</code>
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b border-border/40 pb-2">Disclosures</h2>
        <div className="space-y-3 text-sm text-muted-foreground/80">
          <p>Not available to US persons. Not an offer, solicitation or investment advice.</p>
          <p>LumenMarc is an independent data provider and is not affiliated with Coinbase, Base, or Chainlink.</p>
          <p>Onchain pricing is derived from decentralized exchanges. These pools are permissionless and subject to high volatility and low liquidity. LumenMarc does not guarantee execution at the prices shown.</p>
          <p>Data may be delayed. Always verify directly onchain before taking action.</p>
        </div>
      </section>

    </div>
  );
}

function StateCard({ name, color, desc }: { name: string, color: string, desc: string }) {
  return (
    <div className="p-4 border border-border/40 bg-card rounded-lg flex flex-col gap-2">
      <span className={`self-start inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${color}`}>
        {name}
      </span>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
