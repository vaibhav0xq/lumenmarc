import { useLocation, useRoute, Link } from "wouter";
import { 
  useGetPortfolio, 
  getGetPortfolioQueryKey,
  useListStocks,
  getListStocksQueryKey
} from "@workspace/api-client-react";
import { Search, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { cn, formatUsd, formatNumber, truncateAddress, formatBps, apiErrorMessage } from "@/lib/utils";
import { FeedStateBadge, DeviationStateBadge, PremiumColorText } from "@/components/status-badges";
import { motion, useReducedMotion } from "framer-motion";
import { ReferenceLineInline } from "@/components/reference-line/reference-line-inline";

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/portfolio/:account");
  const account = params?.account ? decodeURIComponent(params.account) : "";
  
  const [inputVal, setInputVal] = useState(account);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (account !== inputVal) {
      setInputVal(account);
    }
  }, [account]);

  const { data: portfolio, isLoading, error } = useGetPortfolio(
    account,
    { 
      query: { 
        enabled: account.length > 0, 
        queryKey: getGetPortfolioQueryKey(account),
        retry: false,
        refetchInterval: 30000,
      } 
    }
  );

  const { data: stocks } = useListStocks({
    query: {
      queryKey: getListStocksQueryKey(),
      refetchInterval: 30000,
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setLocation(`/portfolio/${encodeURIComponent(inputVal.trim())}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-12 animate-in fade-in duration-700 pb-20 pt-8">
      <div className="space-y-4">
        <h1 className="font-sans text-3xl md:text-5xl tracking-tight font-bold">Portfolio</h1>
        <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed">
          View share-equivalents and reference value for any address holding Coinbase Tokenized Stocks. Read-only, no connection required.
        </p>
        
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input 
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="0x... or Basename"
              className="pl-12 pr-4 h-14 text-lg bg-card/50 backdrop-blur-sm border-border focus-visible:ring-1 focus-visible:ring-primary rounded-xl font-mono shadow-xl shadow-black/20 w-full"
            />
          </div>
          <Button type="submit" size="lg" className="h-14 px-8 font-semibold rounded-xl shadow-md">
            Load
          </Button>
        </form>
      </div>

      {!account && !isLoading && (
        <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-border/40 rounded-xl bg-card/20 shadow-inner">
          <Wallet className="size-16 text-muted-foreground/30 mb-6 drop-shadow-md" />
          <p className="text-muted-foreground font-mono text-sm">Enter an address to view holdings.</p>
        </div>
      )}

      {isLoading && account && (
        <div className="h-64 flex items-center justify-center border border-border/50 rounded-xl bg-card/20 shadow-inner">
          <p className="font-mono text-muted-foreground animate-pulse">Reading onchain balances...</p>
        </div>
      )}

      {error && !isLoading && account && (
        <div className="p-8 border border-destructive/30 bg-destructive/10 rounded-xl text-destructive-foreground font-mono shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <h3 className="font-bold mb-3 text-sm uppercase tracking-widest">Error loading portfolio</h3>
          <p className="text-sm opacity-90 leading-relaxed [overflow-wrap:anywhere] break-words">{apiErrorMessage(error, "Invalid address or network error.")}</p>
        </div>
      )}

      {portfolio && !isLoading && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-10"
        >
          {/* Header */}
          <div className="bg-card border border-border/50 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-8 shadow-xl">
            <div className="space-y-2 min-w-0">
              <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                Account
              </h2>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-xl sm:text-2xl font-mono flex items-center gap-3">
                  <span className="font-bold text-foreground truncate" title={portfolio.basename || portfolio.account}>
                    {portfolio.basename || truncateAddress(portfolio.account)}
                  </span>
                  <a href={`https://basescan.org/address/${portfolio.account}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-cyan-glow transition-colors shrink-0" title="View on Basescan">
                    <ExternalLink className="size-4 sm:size-5" />
                  </a>
                </p>
                {portfolio.basename && (
                  <p className="text-sm font-mono text-muted-foreground" title={portfolio.account}>
                    {truncateAddress(portfolio.account)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 md:text-right shrink-0">
              <div className="space-y-2">
                <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Reference Value</h2>
                <p className="text-3xl font-mono font-bold tracking-tight text-primary">{formatUsd(portfolio.totalValueUsd)}</p>
              </div>
              <div className="space-y-2">
                <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Share Equivalents</h2>
                <p className="text-3xl font-mono font-bold tracking-tight text-foreground">{formatNumber(portfolio.totalShareEquivalents, 2)}</p>
              </div>
            </div>
          </div>

          {portfolio.positions.length === 0 ? (
            <div className="py-24 text-center border border-border/40 rounded-xl bg-card/30 shadow-inner">
              <p className="text-muted-foreground font-mono text-sm">No Coinbase Tokenized Stocks found in this wallet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                Positions
                <div className="h-px bg-border flex-1 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
              </h3>
              
              {/* Desktop Table */}
              <div className="hidden md:block bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-secondary/40">
                      <tr className="border-b border-border/80 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        <th className="p-4 w-12"></th>
                        <th className="p-4 font-bold">Asset</th>
                        <th className="p-4 font-bold text-right">Tokens</th>
                        <th className="p-4 font-bold text-right hidden lg:table-cell">Multiplier</th>
                        <th className="p-4 font-bold text-right border-l border-border/30 bg-primary/5">Share Equiv</th>
                        <th className="p-4 font-bold text-right hidden lg:table-cell">Ref Price</th>
                        <th className="p-4 font-bold text-right">Premium</th>
                        <th className="p-4 font-bold text-right">Value (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {portfolio.positions.map((p, i) => {
                        const stock = stocks?.find(s => s.ticker === p.ticker);
                        const premiumBps = stock?.primaryVenue?.premiumBps ?? null;
                        const devState = stock?.deviationState ?? "unpriced";
                        
                        return (
                          <motion.tr 
                            key={p.ticker}
                            data-testid={`row-position-${p.ticker}`}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            className="hover:bg-secondary/30 transition-colors group relative"
                          >
                            <td className="p-4 w-12 border-r border-border/20">
                              <ReferenceLineInline 
                                premiumBps={premiumBps} 
                                deviationState={devState} 
                                size="sm" 
                              />
                            </td>
                            <td className="p-4">
                              <Link href={`/s/${p.ticker}`} className="flex flex-col gap-1 hover:text-cyan-glow transition-colors relative z-10">
                                <span className="font-mono font-bold text-base">{p.ticker}</span>
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{p.name}</span>
                              </Link>
                            </td>
                            <td className="p-4 text-right font-mono tabular-nums text-muted-foreground">
                              {formatNumber(p.rawBalance, 4)}
                            </td>
                            <td className="p-4 text-right font-mono tabular-nums text-muted-foreground text-xs hidden lg:table-cell">
                              × {p.multiplier.toFixed(4)}
                            </td>
                            <td className="p-4 text-right font-mono tabular-nums font-semibold border-l border-border/30 bg-primary/5 text-foreground">
                              {formatNumber(p.shareEquivalents, 4)}
                            </td>
                            <td className="p-4 text-right font-mono tabular-nums hidden lg:table-cell">
                              <div className="flex flex-col items-end gap-1.5">
                                <span className="font-semibold text-[13px]">{formatUsd(p.referencePrice)}</span>
                                <FeedStateBadge state={p.feedState} />
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono tabular-nums">
                              {stock?.primaryVenue ? (
                                <div className="flex flex-col items-end gap-1">
                                  <PremiumColorText bps={premiumBps} state={devState}>
                                    {premiumBps === null ? "Unpriced" : formatBps(premiumBps)}
                                  </PremiumColorText>
                                  {premiumBps !== null && (
                                    <DeviationStateBadge state={devState} className="mt-1" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px] uppercase tracking-widest">—</span>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono tabular-nums font-bold text-primary text-[15px]">
                              {formatUsd(p.valueUsd)}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {portfolio.positions.map((p, i) => {
                  const stock = stocks?.find(s => s.ticker === p.ticker);
                  const premiumBps = stock?.primaryVenue?.premiumBps ?? null;
                  const devState = stock?.deviationState ?? "unpriced";
                  
                  return (
                    <motion.div 
                      key={p.ticker}
                      data-testid={`row-position-${p.ticker}`}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-card border border-border/50 rounded-xl p-5 space-y-5 shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-border/30 pb-4">
                        <div className="flex items-center gap-3">
                          <ReferenceLineInline 
                            premiumBps={premiumBps} 
                            deviationState={devState} 
                            size="sm" 
                          />
                          <Link href={`/s/${p.ticker}`} className="flex flex-col gap-0.5 hover:text-cyan-glow transition-colors">
                            <span className="font-mono font-bold text-lg">{p.ticker}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.name}</span>
                          </Link>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Value</span>
                          <span className="font-mono font-bold text-primary text-lg">{formatUsd(p.valueUsd)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                         <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1.5">Tokens</span>
                            <span className="font-mono text-sm">{formatNumber(p.rawBalance, 4)}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1.5">Share Equiv</span>
                            <span className="font-mono text-sm font-semibold text-foreground">{formatNumber(p.shareEquivalents, 4)}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1.5">Ref Price</span>
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-mono text-sm">{formatUsd(p.referencePrice)}</span>
                              <FeedStateBadge state={p.feedState} />
                            </div>
                         </div>
                         <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1.5">Premium</span>
                            {stock?.primaryVenue ? (
                              <div className="flex flex-col items-start gap-1 font-mono text-sm">
                                <PremiumColorText bps={premiumBps} state={devState}>
                                  {premiumBps === null ? "Unpriced" : formatBps(premiumBps)}
                                </PremiumColorText>
                                {premiumBps !== null && (
                                  <DeviationStateBadge state={devState} />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px] uppercase tracking-widest">—</span>
                            )}
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground/60 space-y-2 max-w-3xl font-mono pt-4 border-t border-border/30">
            <p>{portfolio.note}</p>
            <p>Data reflects onchain balances and Chainlink oracle references. Excludes pending transactions or un-indexed blocks.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
