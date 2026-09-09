import { useEffect, useState } from "react";
import { useGetSizeCheck, getGetSizeCheckQueryKey } from "@workspace/api-client-react";
import { apiErrorMessage, cn, formatBps, formatNumber, formatUsd } from "@/lib/utils";

export function SizeCheckModule({ ticker, hasVenue, unpriced }: { ticker: string; hasVenue: boolean; unpriced: boolean }) {
  const [amountUsd, setAmountUsd] = useState("10000");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [debouncedAmount, setDebouncedAmount] = useState(10000);
  useEffect(() => {
    const value = Number(amountUsd);
    if (!Number.isFinite(value) || value <= 0) return;
    const timer = window.setTimeout(() => setDebouncedAmount(value), 500);
    return () => window.clearTimeout(timer);
  }, [amountUsd]);
  const { data, isLoading, error } = useGetSizeCheck(
    { ticker, amountUsd: debouncedAmount, side },
    { query: { enabled: hasVenue && !unpriced && debouncedAmount >= 1, retry: false, queryKey: getGetSizeCheckQueryKey({ ticker, amountUsd: debouncedAmount, side }) } },
  );
  if (!hasVenue) return <p className="font-mono text-[12px] text-foreground/58">no venue available for a size check</p>;
  // An unpriced primary pool is refused by the API (422). The sheet already knows, so it states the refusal without asking.
  if (unpriced) {
    return (
      <p className="font-mono text-[12px] text-dev-dislocated" data-testid="text-size-check-error">
        {ticker}&apos;s primary pool is not USD-comparable to the Chainlink reference, so no all-in estimate is computed.
      </p>
    );
  }
  return (
    <div data-testid="size-check">
      <div className="flex max-w-2xl flex-col sm:flex-row">
        <label className="flex h-12 min-w-0 flex-1 items-center border border-foreground/30 focus-within:border-foreground">
          <span className="pl-4 font-mono text-[13px] text-foreground/58">$</span>
          <input value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} type="number" min="1" aria-label="Trade amount in USD" className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-[15px] outline-none" data-testid="input-size-check" />
        </label>
        <div className="flex h-12 border border-t-0 border-foreground/30 sm:border-l-0 sm:border-t">
          {(["buy", "sell"] as const).map((value) => <button key={value} type="button" onClick={() => setSide(value)} className={cn("min-w-24 px-5 font-mono text-[13px]", value === side ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/[0.06]")} data-testid={`button-${value}`}>{value}</button>)}
        </div>
      </div>
      <div className="mt-8 min-h-24">
        {isLoading ? <p className="font-mono text-[12px] text-foreground/58">estimating impact…</p> :
          error ? <p className="font-mono text-[12px] text-dev-dislocated" data-testid="text-size-check-error">{apiErrorMessage(error, "Size check unavailable for this pool.")}</p> :
          data ? <>
            <dl className="grid grid-cols-1 border-t border-foreground/20 sm:grid-cols-3">
              {[
                ["Current premium", formatBps(data.currentPremiumBps)],
                ["Estimated impact", formatBps(data.estimatedImpactBps)],
                ["All-in vs reference", formatBps(data.estimatedAllInVsReferenceBps)],
              ].map(([label, value], i) => <div key={label} className={cn("border-b border-foreground/20 py-5", i > 0 && "sm:border-l sm:pl-6")}><dt className="font-mono text-[10.5px] text-foreground/52">{label}</dt><dd className={cn("mt-2 font-mono text-[24px] tnum", i === 2 && "text-primary")}>{value}</dd></div>)}
            </dl>
            <p className="mt-4 font-mono text-[11.5px] leading-[1.6] text-foreground/58">{data.side} {formatUsd(data.amountUsd, 0)} · approximately {formatNumber(data.tokensApprox, 4)} tokens · {formatNumber(data.shareOfLiquidityPct, 2)}% of liquidity · {data.dexLabel}</p>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-foreground/68">{data.method} · {data.note}</p>
          </> : null}
      </div>
    </div>
  );
}