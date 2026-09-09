import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  getGetPortfolioQueryKey,
  getListStocksQueryKey,
  useGetPortfolio,
  useListStocks,
} from "@workspace/api-client-react";
import { apiErrorMessage, cn, formatBps, formatEt, formatNumber, formatUsd, truncateAddress } from "@/lib/utils";
import { Arrow, Figure, Reveal } from "@/components/motion";

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function Portfolio() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/portfolio/:account");
  const account = params?.account ? safeDecode(params.account) : "";
  const [input, setInput] = useState(account);

  useEffect(() => setInput(account), [account]);

  const { data: portfolio, isLoading, error } = useGetPortfolio(account, {
    query: { enabled: account.length > 0, queryKey: getGetPortfolioQueryKey(account), retry: false, refetchInterval: 30000 },
  });
  const { data: stocks, error: stocksError } = useListStocks({
    query: { queryKey: getListStocksQueryKey(), refetchInterval: 30000 },
  });

  const referenceComplete = !!portfolio && portfolio.positions.every((position) => position.feedState !== "unavailable");

  const marks = useMemo(() => {
    if (!portfolio || !stocks) return null;
    const rows = portfolio.positions.map((position) => {
      const stock = stocks.find((item) => item.ticker === position.ticker);
      const venue = stock?.primaryVenue ?? null;
      const poolPrice = venue?.premiumBps != null ? venue.priceUsd : null;
      const poolValue = poolPrice != null ? position.shareEquivalents * poolPrice : null;
      return { position, stock, venue, poolValue };
    });
    const complete = rows.length > 0 && rows.every((row) => row.poolValue != null);
    const poolTotal = complete ? rows.reduce((sum, row) => sum + row.poolValue!, 0) : null;
    const difference = poolTotal == null || !referenceComplete ? null : poolTotal - portfolio.totalValueUsd;
    const differenceBps = difference == null || portfolio.totalValueUsd === 0 ? null : (difference / portfolio.totalValueUsd) * 10000;
    return { rows, referenceComplete, poolTotal, difference, differenceBps };
  }, [portfolio, stocks, referenceComplete]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (value) navigate(`/portfolio/${encodeURIComponent(value)}`);
  };

  return (
    <div className="flex w-full flex-col min-h-[100dvh]" data-testid="page-portfolio">
      <header className="border-b border-foreground/15">
        <Reveal className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-5 py-12 sm:px-8 lg:grid-cols-12 lg:py-16 xl:px-12">
          <p className="font-mono text-[12px] text-foreground/58 lg:col-span-2">Portfolio</p>
          <div className="lg:col-span-10">
            <h1 className="max-w-[18ch] font-display text-[clamp(44px,5vw,72px)] leading-[1.02] tracking-[-0.015em] text-foreground">Holdings, compared.</h1>
            <p className="mt-6 max-w-[64ch] text-[17px] leading-[1.55] text-foreground/70">
              Read any wallet's Coinbase tokenized-stock balances against the Chainlink reference and the deepest comparable onchain pool. No connection required.
            </p>
          </div>
        </Reveal>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 lg:py-16 xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-10 lg:col-start-3">
            <Reveal as="div">
              <form onSubmit={submit} className="flex w-full max-w-4xl border border-foreground/30 transition-colors duration-300 focus-within:border-foreground" data-testid="form-portfolio">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Wallet address or Basename"
                  aria-label="Wallet address or Basename"
                  className="h-14 min-w-0 flex-1 bg-transparent px-4 font-mono text-[13px] text-foreground focus:outline-none sm:px-5 sm:text-[14px]"
                  data-testid="input-portfolio"
                />
                <button type="submit" className="h-14 border-l border-foreground/30 bg-foreground px-6 font-mono text-[13px] text-background hover-quiet hover:bg-foreground/90 sm:px-8" data-testid="button-portfolio">
                  Read
                </button>
              </form>
            </Reveal>

            {!account && !isLoading && (
              <div className="stage-field mt-8 max-w-4xl border border-foreground/10 p-8 sm:p-10" data-testid="portfolio-empty">
                <p className="font-display text-[28px] leading-[1.1] text-foreground sm:text-[32px]">Any Base address works. Nothing to connect.</p>
                <dl className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div>
                    <dt className="font-mono text-[11px] text-foreground/50">What to paste</dt>
                    <dd className="mt-3 text-[14px] leading-[1.6] text-foreground/70">A wallet or contract address on Base (0x and 40 hex characters) or a Basename such as a name ending in .base.eth.</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[11px] text-foreground/50">What you get</dt>
                    <dd className="mt-3 text-[14px] leading-[1.6] text-foreground/70">Every Coinbase-issued stock token the address holds, marked at the Chainlink reference and at the deepest USD-stablecoin pool, with the gap between the two marks.</dd>
                  </div>
                </dl>
                <div className="mt-10 flex flex-col gap-2 border-t border-foreground/12 pt-6 font-mono text-[12px] text-foreground/58 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
                  <span>Try a live example</span>
                  <Link href="/portfolio/0x498581fF718922c3f8e6A244956aF099B2652b2b" className="hover-quiet break-all text-foreground underline underline-offset-4 hover:text-primary hover:underline-offset-8" data-testid="portfolio-example">
                    0x498581fF718922c3f8e6A244956aF099B2652b2b
                  </Link>
                  <span className="text-foreground/48">the Uniswap v4 PoolManager, which holds the tokens sitting in its pools</span>
                </div>
              </div>
            )}
        
            {isLoading && account && (
              <p className="mt-8 font-mono text-[11px] text-foreground/58 animate-pulse">reading onchain balances</p>
            )}
        
            {(error || stocksError) && !isLoading && account && (
              <div className="mt-8 border-l border-dev-dislocated pl-4" data-testid="portfolio-error">
                <p className="font-mono text-[11px] text-dev-dislocated">{portfolio ? "refresh failed, showing the last successful read" : "failed"}</p>
                <p className="mt-2 break-words font-mono text-[13px] leading-[1.65] text-foreground/75">{apiErrorMessage(error ?? stocksError)}</p>
              </div>
            )}

            {portfolio && !isLoading && (
              <div className="mt-16 animate-in fade-in duration-500" data-testid="portfolio-result">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-10">
                  <h2 className="font-display text-[32px] sm:text-[40px] leading-none text-foreground">{portfolio.basename || truncateAddress(portfolio.account)}</h2>
                  <a href={`https://basescan.org/address/${portfolio.account}`} target="_blank" rel="noreferrer" className="group break-all font-mono text-[12px] text-foreground/70 underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">
                    {portfolio.basename ? portfolio.account : <>Basescan <Arrow /></>}
                  </a>
                  {portfolio.basename && <p className="font-mono text-[11.5px] text-foreground/58 w-full mt-2">Basename resolved on Base</p>}
                </div>

                <dl className="mb-16 grid grid-cols-1 border border-foreground/15 stage-field sm:grid-cols-2 lg:grid-cols-4">
                  <Total label="Reference mark" value={!referenceComplete ? "unavailable" : <Figure value={portfolio.totalValueUsd} format={formatUsd} />} muted={!referenceComplete} note={`${formatNumber(portfolio.totalShareEquivalents, 4)} total share-equivalents`} />
                  <Total label="Onchain mark" value={marks?.poolTotal == null ? "unpriced" : <Figure value={marks.poolTotal} format={formatUsd} />} muted={marks?.poolTotal == null} note={marks?.poolTotal == null ? "a holding has no comparable USD pool" : "deepest comparable pools"} className="border-t sm:border-t-0 sm:border-l" />
                  <Total label="Difference" value={marks?.difference == null ? "unpriced" : <Figure value={marks.difference} format={formatSignedUsd} />} muted={marks?.difference == null} note="onchain minus reference" className="border-t lg:border-t-0 lg:border-l" />
                  <Total label="Premium" value={marks?.differenceBps == null ? "unpriced" : <Figure value={marks.differenceBps} format={formatBps} />} muted={marks?.differenceBps == null} note="weighted across holdings" className="border-t sm:border-l lg:border-t-0" blue />
                </dl>

                <section className="mb-16">
                  <p className="mb-6 font-mono text-[11px] text-foreground/58">Holdings &middot; {portfolio.positions.length}</p>
              
                  {portfolio.positions.length === 0 ? (
                    <div className="border border-foreground/10 p-10 font-mono text-[12px] text-foreground/58 text-center stage-field">
                      none &middot; this wallet holds no Coinbase tokenized stocks
                    </div>
                  ) : marks ? (
                    <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                      <div className="min-w-[800px]">
                        <div className="grid grid-cols-[10rem_minmax(5rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_9rem] border-b border-foreground/15 pb-4 font-mono text-[10.5px] text-foreground/52">
                          <span>Token</span>
                          <span className="text-right">Balance</span>
                          <span className="text-right">Shares</span>
                          <span className="text-right">Reference</span>
                          <span className="text-right">Pool</span>
                          <span className="text-right">Premium</span>
                          <span className="text-right pl-4">State</span>
                        </div>
                        {marks.rows.map(({ position, stock, venue }) => (
                          <div key={position.ticker} className="grid grid-cols-[10rem_minmax(5rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_9rem] items-center border-b border-foreground/10 py-5 hover-quiet hover:bg-foreground/[0.035]" data-testid={`row-position-${position.ticker}`}>
                            <div className="min-w-0 pr-4">
                              <Link href={`/readings?t=${position.ticker}`} className="font-display text-[22px] leading-none text-foreground hover-quiet hover:text-primary">{position.ticker}</Link>
                              <p className="mt-1.5 truncate font-mono text-[10.5px] text-foreground/58">{position.name}</p>
                            </div>
                            <Cell>{formatNumber(position.rawBalance, 4)}</Cell>
                            <Cell>{formatNumber(position.shareEquivalents, 4)}<small className="mt-1 block text-[10px] text-foreground/52">&times; {position.multiplier.toFixed(4)}</small></Cell>
                            <Cell>
                              <span className="block">{position.feedState === "unavailable" ? "unavailable" : formatUsd(position.referencePrice)}</span>
                              <small className="mt-1 block text-[10px] text-foreground/52">{position.feedState === "unavailable" ? "unavailable" : formatUsd(position.valueUsd)}</small>
                            </Cell>
                            <Cell>
                              <span className="block">{venue?.premiumBps == null || venue.priceUsd == null ? "unpriced" : formatUsd(venue.priceUsd)}</span>
                              <small className="mt-1 block text-[10px] text-foreground/52">{venue?.premiumBps == null || venue.priceUsd == null ? "unpriced" : formatUsd(position.shareEquivalents * venue.priceUsd)}</small>
                            </Cell>
                            <Cell blue={venue?.premiumBps != null} muted={venue?.premiumBps == null}>
                              {venue?.premiumBps == null ? "unpriced" : formatBps(venue.premiumBps)}
                            </Cell>
                            <Cell alignLeft className="pl-4">
                              <span className="block">{stock?.deviationState ?? "unpriced"}</span>
                              <small className="mt-1 block text-[10px] text-foreground/52">{feedLabel(position.feedState, stock?.reference.updatedAtUtc)}</small>
                            </Cell>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-foreground/10 p-10 font-mono text-[12px] text-foreground/58 text-center stage-field animate-pulse">
                      waiting for current pool marks
                    </div>
                  )}
                </section>

                <div className="max-w-[72ch] py-8 border-t border-foreground/15 font-mono text-[11px] leading-[1.65] text-foreground/58">
                  <p>{portfolio.note}</p>
                  <p className="mt-3">Data reflects onchain balances and Chainlink oracle references. Excludes pending transactions or un-indexed blocks.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function formatSignedUsd(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatUsd(Math.abs(value))}`;
}

function feedLabel(state: string, updatedAt?: string) {
  return state === "held" && updatedAt ? `held \u00B7 ${formatEt(updatedAt, "time")}` : state;
}

function Total({ label, value, note, className, blue, muted }: { label: string; value: React.ReactNode; note: string; className?: string; blue?: boolean; muted?: boolean }) {
  return (
    <div className={cn("border-foreground/15 p-6 sm:p-8 hover-quiet hover:bg-foreground/[0.02]", className)}>
      <dt className="font-mono text-[10.5px] text-foreground/52">{label}</dt>
      <dd className={cn("mt-4 font-mono text-[clamp(22px,2vw,30px)] leading-none tnum", muted ? "text-foreground/52" : blue ? "text-primary" : "text-foreground")}>{value}</dd>
      <dd className="mt-4 font-mono text-[11px] leading-[1.5] text-foreground/58">{note}</dd>
    </div>
  );
}

function Cell({ children, blue, muted, alignLeft, className }: { children: React.ReactNode; blue?: boolean; muted?: boolean; alignLeft?: boolean; className?: string }) {
  return (
    <div className={cn("px-2 font-mono text-[12px] leading-[1.4] tnum", alignLeft ? "text-left" : "text-right", muted ? "text-foreground/50" : blue ? "text-primary" : "text-foreground/80", className)}>
      {children}
    </div>
  );
}
