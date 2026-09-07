import { useRoute } from "wouter";
import { Link } from "wouter";
import { 
  useGetPortfolio, 
  getGetPortfolioQueryKey
} from "@workspace/api-client-react";
import { Search, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { formatUsd, formatNumber, truncateAddress } from "@/lib/utils";
import { FeedStateBadge } from "@/components/status-badges";

export default function Portfolio() {
  const [match, params] = useRoute("/portfolio/:account");
  const account = params?.account || "";
  
  const [inputVal, setInputVal] = useState(account);

  const { data: portfolio, isLoading, error } = useGetPortfolio(
    account,
    { 
      query: { 
        enabled: account.length > 0, 
        queryKey: getGetPortfolioQueryKey(account),
        retry: false
      } 
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      window.location.href = `/portfolio/${encodeURIComponent(inputVal.trim())}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          View share-equivalents and reference value for any address holding Coinbase Tokenized Stocks. Read-only, no connection required.
        </p>
        
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input 
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="0x... or Basename"
              className="pl-10 h-12 text-lg bg-card border-border/50 font-mono"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8">Load</Button>
        </form>
      </div>

      {!account && !isLoading && (
        <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-border/40 rounded-xl bg-card/20">
          <Wallet className="size-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Enter an address to view holdings.</p>
        </div>
      )}

      {isLoading && account && (
        <div className="h-64 flex items-center justify-center border border-border/50 rounded-xl bg-card/50">
          <p className="font-mono text-muted-foreground animate-pulse">Reading onchain balances...</p>
        </div>
      )}

      {error && !isLoading && account && (
        <div className="p-6 border border-destructive/30 bg-destructive/10 rounded-xl text-destructive-foreground">
          <h3 className="font-bold mb-2">Error loading portfolio</h3>
          <p className="text-sm opacity-90">{(error as any)?.error || "Invalid address or network error."}</p>
        </div>
      )}

      {portfolio && !isLoading && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col sm:flex-row justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</h2>
              <p className="text-xl font-mono flex items-center gap-2">
                {portfolio.basename || truncateAddress(portfolio.account)}
                <a href={`https://basescan.org/address/${portfolio.account}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink className="size-4" />
                </a>
              </p>
            </div>
            <div className="flex gap-8">
              <div className="space-y-1">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Reference Value</h2>
                <p className="text-2xl font-mono">{formatUsd(portfolio.totalValueUsd)}</p>
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Share Equivalents</h2>
                <p className="text-2xl font-mono">{formatNumber(portfolio.totalShareEquivalents)}</p>
              </div>
            </div>
          </div>

          {portfolio.positions.length === 0 ? (
            <div className="py-16 text-center border border-border/40 rounded-xl bg-secondary/20">
              <p className="text-muted-foreground">No Coinbase Tokenized Stocks found in this wallet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Positions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-border/40 rounded-lg overflow-hidden bg-card">
                  <thead className="bg-secondary/50">
                    <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 font-medium">Asset</th>
                      <th className="p-4 font-medium text-right">Tokens</th>
                      <th className="p-4 font-medium text-right">Multiplier</th>
                      <th className="p-4 font-medium text-right border-l border-border/30 bg-primary/5">Share Equiv</th>
                      <th className="p-4 font-medium text-right">Reference Price</th>
                      <th className="p-4 font-medium text-right">Value (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {portfolio.positions.map((p) => (
                      <tr key={p.ticker} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <Link href={`/s/${p.ticker}`} className="flex items-baseline gap-2 hover:text-primary transition-colors">
                            <span className="font-bold">{p.ticker}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline-block">{p.name}</span>
                          </Link>
                        </td>
                        <td className="p-4 text-right font-mono tabular-nums text-muted-foreground">
                          {formatNumber(p.rawBalance, 4)}
                        </td>
                        <td className="p-4 text-right font-mono tabular-nums text-muted-foreground text-xs">
                          × {p.multiplier.toFixed(4)}
                        </td>
                        <td className="p-4 text-right font-mono tabular-nums font-semibold border-l border-border/30 bg-primary/5">
                          {formatNumber(p.shareEquivalents, 4)}
                        </td>
                        <td className="p-4 text-right font-mono tabular-nums">
                          <div className="flex flex-col items-end gap-1">
                            <span>{formatUsd(p.referencePrice)}</span>
                            <FeedStateBadge state={p.feedState} />
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono tabular-nums font-bold">
                          {formatUsd(p.valueUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground/60 space-y-2 max-w-3xl">
            <p>{portfolio.note}</p>
            <p>Data reflects onchain balances and Chainlink oracle references. Excludes pending transactions or un-indexed blocks.</p>
          </div>
        </div>
      )}
    </div>
  );
}
