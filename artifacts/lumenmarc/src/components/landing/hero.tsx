import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import type { StockSummary } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import type { ComparatorReading } from "@/components/instrument/comparator";
import { Arrow, Figure } from "@/components/motion";
import { InstrumentPreview } from "./instrument-preview";

/*
 * The fold: one statement on the left, one working instrument on the right, edge to edge.
 * The statement is set top and bottom, not centred: the headline holds the top of the column
 * and the actions sit on the bottom rule beside the instrument's figure row, so the two
 * halves read as one composed panel at 1440 x 900. Two actions, one live proof line.
 */

type Props = {
  hero: StockSummary | null;
  range24h: ComparatorReading["range24h"];
  status: "loading" | "failed" | "ready";
  error: string | null;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({ hero, range24h, status, error }: Props) {
  const v = hero?.primaryVenue ?? null;
  const priced = !!hero && !!v && typeof v.premiumBps === "number";
  const reduced = useReducedMotion();
  /* Two moves only: the statement settles, then the actions follow it by a beat. The stage fades in beside them. */
  const settle = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: EASE } };

  return (
    <section className="relative border-b border-foreground/15" data-testid="hero">
      <div className="grid w-full grid-cols-1 lg:min-h-[max(640px,min(calc(100dvh-4rem),1000px))] lg:grid-cols-[minmax(440px,5fr)_minmax(0,7fr)]">
        {/* Statement */}
        <div className="flex flex-col justify-between gap-12 px-5 pb-10 pt-12 sm:px-8 sm:pt-14 lg:gap-16 lg:pb-11 lg:pt-20 xl:px-14">
          <motion.div {...settle(0)}>
            <h1
              className="max-w-[12ch] font-display text-[clamp(44px,5.6vw,96px)] leading-[0.98] tracking-[-0.02em] text-foreground"
              data-testid="text-headline"
            >
              Verify the stock <span className="text-foreground/55">before you trust the quote.</span>
            </h1>
            <p className="mt-7 max-w-[44ch] text-[16.5px] leading-[1.55] text-foreground/70 sm:mt-8 lg:text-[18px]">
              Coinbase-issued stocks trade around the clock on Base. LumenMarc reads each one against its Chainlink reference and shows the gap in basis points.
            </p>
          </motion.div>

          <motion.div {...settle(0.12)}>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/readings"
                className="group hover-quiet inline-flex h-12 items-center gap-2.5 border border-foreground bg-foreground px-6 font-mono text-[13px] text-background hover:border-foreground/88 hover:bg-foreground/88 active:translate-y-px"
                data-testid="cta-open-readings"
              >
                Open readings <Arrow />
              </Link>
              <Link
                href="/check"
                className="hover-quiet inline-flex h-12 items-center border border-foreground/35 px-6 font-mono text-[13px] text-foreground hover:border-foreground hover:bg-foreground/[0.05] active:translate-y-px"
                data-testid="cta-verify"
              >
                Verify a stock
              </Link>
            </div>

            {/* One live proof line, set on the same rule as the figures across the divide */}
            <p className="mt-9 flex items-start gap-3 font-mono text-[12px] leading-[1.7] text-foreground/60 tnum lg:mt-10" data-testid="hero-live-line">
              <span className={cn("mt-[7px] size-[5px] shrink-0", status === "failed" ? "bg-dev-dislocated" : "bg-feed-live")} aria-hidden />
              <span>
                {priced ? (
                  <>
                    <Link href={`/readings?t=${hero!.ticker}`} className="hover-quiet text-foreground hover:text-primary">
                      {hero!.ticker}
                    </Link>{" "}
                    trades{" "}
                    <Figure key={`${hero!.ticker}-p`} value={Math.abs(v!.premiumBps!)} format={(n) => Math.round(n).toLocaleString("en-US")} className="text-primary" />{" "}
                    <span className="text-primary">bps</span> {v!.premiumBps! > 0 ? "above" : v!.premiumBps! < 0 ? "below" : "level with"} its Chainlink reference on {v!.dexLabel}
                    {error ? <span className="text-dev-dislocated"> · refresh failed, showing the last successful read</span> : null}
                  </>
                ) : status === "failed" ? (
                  <>No reading · {error ?? "the last snapshot could not be read"}</>
                ) : hero ? (
                  <>{hero.ticker} has no priced venue at this block</>
                ) : (
                  <>Reading the current block</>
                )}
              </span>
            </p>
          </motion.div>
        </div>

        {/* Instrument, edge to edge */}
        <motion.div
          className="relative min-h-0 border-t border-foreground/15 lg:border-l lg:border-t-0"
          {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1.2, delay: 0.15, ease: EASE } })}
        >
          <InstrumentPreview hero={hero} range24h={range24h} status={status} className="h-full" />
        </motion.div>
      </div>
    </section>
  );
}
