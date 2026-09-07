import { useEffect, useState } from "react";
import { useListStocks, getListStocksQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatUsd, formatBps } from "@/lib/utils";
import { PremiumColorText } from "@/components/status-badges";
import { motion, useReducedMotion } from "framer-motion";

export function MarketMarquee() {
  const { data: stocks } = useListStocks({
    query: {
      queryKey: getListStocksQueryKey(),
      refetchInterval: 30000,
    }
  });
  const prefersReducedMotion = useReducedMotion();

  if (!stocks || stocks.length === 0) return null;

  // Clone stocks to ensure seamless loop
  const marqueeItems = [...stocks, ...stocks, ...stocks];

  return (
    <div className="w-full bg-secondary/50 border-b border-border/40 overflow-hidden py-2 shrink-0">
      <div className="flex w-full overflow-hidden whitespace-nowrap">
        <motion.div
          className="flex shrink-0 items-center gap-8 pl-8"
          animate={prefersReducedMotion ? { x: 0 } : { x: "-33.333333%" }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 40,
          }}
        >
          {marqueeItems.map((s, idx) => (
            <div key={`${s.ticker}-${idx}`} className="flex items-center gap-3 shrink-0">
              <Link href={`/s/${s.ticker}`} className="font-mono text-sm font-semibold hover:text-primary transition-colors">
                {s.ticker}
              </Link>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatUsd(s.reference.price)}
              </span>
              <span className="font-mono text-xs tabular-nums">
                {s.primaryVenue && s.primaryVenue.premiumBps !== null ? (
                  <PremiumColorText bps={s.primaryVenue.premiumBps} state={s.deviationState}>
                    {formatBps(s.primaryVenue.premiumBps)}
                  </PremiumColorText>
                ) : (
                  <span className="text-dev-unpriced">Unpriced</span>
                )}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}