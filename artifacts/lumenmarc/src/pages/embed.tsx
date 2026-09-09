import { useRoute } from "wouter";
import { useGetStock, getGetStockQueryKey } from "@workspace/api-client-react";
import { apiErrorMessage, DEVIATION_LABEL, formatAgo, formatBpsBare, formatEt, formatUsd, referencePrice } from "@/lib/utils";

export default function Embed() {
  const [, params] = useRoute("/embed/:ticker");
  const ticker = params?.ticker || "";
  const { data: stock, isLoading, error } = useGetStock(ticker, {
    query: { enabled: !!ticker, queryKey: getGetStockQueryKey(ticker), refetchInterval: 30000, retry: false },
  });
  if (isLoading) return <main className="flex h-[240px] w-[360px] max-w-[360px] items-center border border-foreground/20 bg-background p-5 font-mono text-[11px] text-foreground/58">Reading {ticker}…</main>;
  if (error || !stock) return <main className="flex h-[240px] w-[360px] max-w-[360px] flex-col justify-center border border-foreground/20 bg-background p-5"><p className="font-display text-[26px] text-foreground">No reading.</p><p className="mt-3 font-mono text-[10px] leading-[1.5] text-dev-dislocated">{apiErrorMessage(error, "Data unavailable")}</p></main>;
  const venue = stock.price.primaryVenue;
  const state = stock.price.reference.state;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <main className="flex h-[240px] w-[360px] max-w-[360px] flex-col overflow-hidden border border-foreground/20 bg-background text-foreground" data-testid="embed-card">
      <header className="flex items-start justify-between border-b border-foreground/15 px-4 py-3">
        <div className="min-w-0">
          <a href={`${base}/s/${stock.summary.ticker}`} target="_blank" rel="noreferrer" className="font-display text-[28px] leading-none hover:text-primary transition-colors duration-200">{stock.summary.ticker}</a>
          <p className="mt-1.5 max-w-[210px] truncate font-mono text-[10.5px] text-foreground/70">{stock.summary.name}</p>
        </div>
        <p className="text-right font-mono text-[9.5px] leading-[1.5] text-foreground/58">Coinbase-issued<br/>address verified</p>
      </header>
      <div className="grid flex-1 grid-cols-2">
        <div className="border-r border-foreground/15 px-4 py-3">
          <p className="font-mono text-[9.5px] text-foreground/52">Reference</p>
          <p className="mt-1.5 font-mono text-[19px] leading-none text-foreground tnum">{referencePrice(stock.price.reference) != null ? formatUsd(stock.price.reference.price) : "Unavailable"}</p>
          <p className="mt-1.5 font-mono text-[9.5px] leading-[1.4] text-foreground/58">{state}{state === "held" ? ` · ${formatEt(stock.price.reference.updatedAtUtc, "time")}` : ` · ${formatAgo(stock.price.reference.updatedAtUtc)}`}</p>
        </div>
        <div className="px-4 py-3">
          <p className="truncate font-mono text-[9.5px] text-foreground/52">Pool · {venue?.dexLabel ?? "no venue"}</p>
          <p className="mt-1.5 font-mono text-[19px] leading-none text-foreground tnum">{venue && stock.price.premiumBps != null && venue.priceUsd != null ? formatUsd(venue.priceUsd) : "Unpriced"}</p>
          <p className="mt-1.5 font-mono text-[9.5px] text-foreground/58">{venue ? `${venue.baseToken.symbol}/${venue.quoteToken.symbol}${stock.price.premiumBps == null ? " · not USD" : ""}` : "no USD quote"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-foreground/15 px-4 py-2.5">
        <p className="whitespace-nowrap font-mono text-[20px] leading-none text-primary tnum" data-testid="embed-premium">
          {stock.price.premiumBps == null ? (stock.summary.status === "no-supply" ? "no supply" : "unpriced") : `${formatBpsBare(stock.price.premiumBps)}`}
          <span className="ml-1 text-[12px]">{stock.price.premiumBps == null ? "" : "bps"}</span>
          <span className="ml-2 text-[11px] text-foreground/70">
            {stock.price.premiumBps == null ? (stock.summary.status === "no-supply" ? "nothing minted" : venue ? `quoted in ${venue.quoteToken.symbol}` : "no USD pool") : DEVIATION_LABEL[stock.price.deviationState].toLowerCase()}
          </span>
        </p>
        <p className="text-right font-mono text-[9px] leading-[1.4] text-foreground/58">
          block {stock.blockNumber.toLocaleString("en-US")}
          <br />
          updated {formatAgo(stock.updatedAtUtc)}
        </p>
      </div>
      <footer className="border-t border-foreground/15 px-4 py-2 text-right font-mono text-[9px] text-foreground/52">LumenMarc · Built by vaibhav0xq</footer>
    </main>
  );
}