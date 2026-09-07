import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'wouter';
import { StockSummary, Overview } from '@workspace/api-client-react';
import { cn, formatBps, formatUsd, formatAgo } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function ReferenceLineHero({ stocks, overview }: { stocks: StockSummary[], overview: Overview | undefined }) {
  const prefersReduced = useReducedMotion();
  
  // Plottable stocks (must have venue and comparable premium)
  const pricedStocks = useMemo(() => {
    const s = stocks.filter(s => s.primaryVenue && s.primaryVenue.premiumBps !== null);
    // Sort by premium so they aren't randomly distributed horizontally
    return s.sort((a, b) => a.primaryVenue!.premiumBps! - b.primaryVenue!.premiumBps!);
  }, [stocks]);

  const unpricedStocks = useMemo(() => {
    return stocks.filter(s => !s.primaryVenue || s.primaryVenue.premiumBps === null);
  }, [stocks]);
  
  // Find min/max/dislocated for mobile labels
  const minBps = pricedStocks.length > 0 ? pricedStocks[0].primaryVenue!.premiumBps! : 0;
  const maxBps = pricedStocks.length > 0 ? pricedStocks[pricedStocks.length - 1].primaryVenue!.premiumBps! : 0;
  
  // Fixed symmetric scale in bps
  const SCALE_MAX = 400;

  // Gridlines to draw
  const gridlines = [+300, +50, 0, -50, -300];

  if (pricedStocks.length === 0) return null;

  return (
    <div className="w-full mt-8 mb-16 flex flex-col items-center">
      <div className="relative h-[320px] md:h-[400px] w-full max-w-5xl mx-auto">
        
        {/* Fair band shading (±50 bps) */}
        <div 
          className="absolute left-0 right-0 bg-dev-fair/5"
          style={{ 
            top: `${50 - (50 / SCALE_MAX) * 40}%`, 
            height: `${(100 / SCALE_MAX) * 40}%` 
          }}
        />

        {/* Gridlines */}
        {gridlines.map(bps => {
          const topPercentage = 50 - (bps / SCALE_MAX) * 40;
          return (
            <div key={bps} className="absolute left-0 right-0 pointer-events-none" style={{ top: `${topPercentage}%` }}>
              <div className={cn("h-px w-full", bps === 0 ? "bg-accent/80 shadow-[0_0_15px_var(--color-cyan-glow)]" : "bg-border/40 border-dashed")} />
              <div className="absolute right-0 -translate-y-1/2 translate-x-12 font-mono text-[10px] tracking-widest hidden md:block"
                   style={{ color: bps === 0 ? 'var(--color-accent)' : 'var(--color-muted-foreground)' }}>
                {bps === 0 ? 'REF' : bps > 0 ? `+${bps}` : bps}
              </div>
            </div>
          );
        })}
        
        {/* Background glow for the line */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-[100px] bg-accent/20 blur-[80px] pointer-events-none rounded-full" />

        {/* Marks */}
        <div className="absolute inset-0 mx-8 md:mx-16">
          {pricedStocks.map((stock, i) => {
            const rawBps = stock.primaryVenue!.premiumBps!;
            const isClamped = Math.abs(rawBps) > SCALE_MAX;
            const bps = isClamped ? Math.sign(rawBps) * SCALE_MAX : rawBps;
            const isAbove = rawBps >= 0;
            
            const topPercentage = 50 - (bps / SCALE_MAX) * 40; 
            const leftPercentage = pricedStocks.length > 1 ? (i / (pricedStocks.length - 1)) * 100 : 50;

            const devState = stock.deviationState;
            const dotColor = devState === 'fair' ? 'bg-dev-fair' : devState === 'elevated' ? 'bg-dev-elevated' : 'bg-dev-dislocated';
            const textColor = devState === 'fair' ? 'text-dev-fair' : devState === 'elevated' ? 'text-dev-elevated' : 'text-dev-dislocated';

            const isExtreme = rawBps === minBps || rawBps === maxBps || devState === 'dislocated';
            // Edge marks anchor their label inward so nothing clips at the instrument's sides.
            const edgeAlign = pricedStocks.length > 1 && i === 0 ? "self-start" : pricedStocks.length > 1 && i === pricedStocks.length - 1 ? "self-end" : "";

            // Alternate label side for readability if crowded, but let's stick to above/below based on premium for clarity.
            // On mobile, hide the label unless it's extreme or we use a smaller font. We'll show all on desktop.
            return (
              <div 
                key={stock.ticker}
                className="absolute group z-10 hover:z-20"
                style={{ left: `${leftPercentage}%`, top: `${topPercentage}%`, transform: 'translate(-50%, -50%)' }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/s/${stock.ticker}`} className="flex flex-col items-center cursor-pointer">
                      <motion.div 
                        initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: isAbove ? 20 : -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        className={cn("flex flex-col items-center relative", isAbove ? "flex-col-reverse" : "flex-col")}
                      >
                        {/* Stem */}
                        <div 
                          className="w-px bg-border/50 group-hover:bg-primary/50 transition-colors"
                          style={{ height: `${Math.max(12, Math.abs(50 - topPercentage) * (prefersReduced ? 2 : 3))}px` }}
                        />
                        {/* Mark dot */}
                        <div className={cn("size-2 rounded-full border border-background transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:scale-150 flex items-center justify-center", dotColor)}>
                          {isClamped && (isAbove ? 
                            <ChevronUp className="size-2 text-background -translate-y-[1px]" strokeWidth={4} /> : 
                            <ChevronDown className="size-2 text-background translate-y-[1px]" strokeWidth={4} />
                          )}
                        </div>
                        
                        {/* Label */}
                        <div className={cn("absolute font-mono text-[9px] md:text-[10px] font-bold whitespace-nowrap transition-colors flex gap-1",
                          isAbove ? "bottom-full mb-1" : "top-full mt-1",
                          "text-muted-foreground group-hover:text-foreground",
                          edgeAlign,
                          !isExtreme && "hidden md:flex"
                        )}>
                          <span>{stock.ticker}</span>
                          <span className={cn(textColor, "opacity-70 group-hover:opacity-100")}>{formatBps(rawBps)}</span>
                        </div>
                      </motion.div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side={isAbove ? 'top' : 'bottom'} className="font-mono text-xs p-3 space-y-1 z-50">
                    <div className="font-bold border-b border-border/40 pb-1 mb-1">{stock.ticker} — {stock.primaryVenue?.dexLabel}</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Premium:</span> 
                      <span className={textColor}>{formatBps(rawBps)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Pool Price:</span> 
                      <span>{formatUsd(stock.primaryVenue!.priceUsd)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Reference:</span> 
                      <span>{formatUsd(stock.reference.price)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Liquidity:</span> 
                      <span>{formatUsd(stock.primaryVenue!.liquidityUsd, 0)}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}

          {/* Unpriced Marks */}
          {unpricedStocks.map((stock, i) => {
            // Interleave unpriced marks between the priced positions so their labels never sit on a priced label.
            const leftPercentage = ((i + 1) / (unpricedStocks.length + 1)) * 100;
            return (
              <div 
                key={stock.ticker}
                className="absolute group z-10 hover:z-20"
                style={{ left: `${leftPercentage}%`, top: `50%`, transform: 'translate(-50%, -50%)' }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/s/${stock.ticker}`} className="flex flex-col items-center cursor-pointer">
                      <div className="size-2 rounded-full border border-dev-unpriced bg-background group-hover:scale-150 transition-all duration-300" />
                      <div className="absolute font-mono text-[9px] md:text-[10px] font-bold whitespace-nowrap top-full mt-1 text-muted-foreground group-hover:text-foreground hidden md:flex">
                        {stock.ticker}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-mono text-xs p-2">
                    <div className="font-bold">{stock.ticker}</div>
                    <div className="text-dev-unpriced mt-1">{stock.status === 'no-supply' ? 'No Supply' : 'No priced pool'}</div>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>

      {overview && (
        <div className="mt-8 font-mono text-[10px] md:text-xs text-muted-foreground/60 text-center max-w-2xl px-4 flex flex-col gap-1">
          <p className="hidden md:block">
            {overview.tokensTotal} Coinbase-issued tokens · ordered by premium (clamped at ±{SCALE_MAX} bps) · primary pool vs Chainlink reference
          </p>
          <p className="md:hidden">
            {overview.tokensTotal} tokens · ordered by premium (±{SCALE_MAX} bps limit)
          </p>
          <p>
            Base block {overview.blockNumber.toLocaleString()} · snapshot {formatAgo(overview.snapshotAtUtc)}
          </p>
        </div>
      )}
    </div>
  );
}