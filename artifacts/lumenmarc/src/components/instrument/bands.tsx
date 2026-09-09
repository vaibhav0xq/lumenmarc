import { useMemo } from "react";
import type { StockSummary } from "@workspace/api-client-react";
import { formatBpsBare, unpricedReason } from "@/lib/utils";
import { BandScale } from "./band-scale";
import { ChapterHead } from "./chapter-head";
import { Reveal, Tick } from "@/components/motion";

/* The three bands with live counts and the scale unrolled with every reading on it. */

export function Bands({ stocks, index = "Scale" }: { stocks: StockSummary[] | undefined; index?: string }) {
  const groups = useMemo(() => {
    const g = { fair: [] as StockSummary[], elevated: [] as StockSummary[], dislocated: [] as StockSummary[], unpriced: [] as StockSummary[] };
    for (const s of stocks ?? []) {
      const bps = s.primaryVenue?.premiumBps;
      if (typeof bps !== "number") g.unpriced.push(s);
      else if (Math.abs(bps) <= 50) g.fair.push(s);
      else if (Math.abs(bps) <= 300) g.elevated.push(s);
      else g.dislocated.push(s);
    }
    for (const k of ["fair", "elevated", "dislocated"] as const) g[k].sort((a, b) => Math.abs(b.primaryVenue!.premiumBps!) - Math.abs(a.primaryVenue!.premiumBps!));
    return g;
  }, [stocks]);

  const list = (xs: StockSummary[]) =>
    !stocks ? "waiting for the current block" : xs.length ? xs.map((s) => `${s.ticker} ${formatBpsBare(s.primaryVenue!.premiumBps)}`).join(" · ") : "none at this block";

  return (
    <section id="bands" className="scroll-mt-20 border-t border-foreground/15" data-testid="section-bands">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-16 sm:px-8 lg:py-24 xl:px-12">
        <Reveal><ChapterHead
          index={index}
          title="Three bands, one scale."
          lede="A reading is the onchain price against the Chainlink reference for the same stock, in basis points. The bands are fixed thresholds LumenMarc publishes, not live values and not ratings."
        /></Reveal>
        <Reveal className="-mx-5 mt-16 overflow-x-auto px-5 sm:mx-0 sm:px-0" delay={0.08}>
          <div className="min-w-[760px]">
            <BandScale stocks={stocks ?? []} />
          </div>
        </Reveal>
        <Reveal as="div" className="mt-16"><dl className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
          <BandTerm word="Fair" range="within ±50 bps" count={stocks ? groups.fair.length : null} note="Inside the tolerance a liquid pool normally holds. Costs of moving between the token and the share explain most of it." tokens={list(groups.fair)} />
          <BandTerm word="Elevated" range="50 to 300 bps" count={stocks ? groups.elevated.length : null} note="The pool has drifted from the print. Check liquidity and the age of the reference before reading anything into the number." tokens={list(groups.elevated)} />
          <BandTerm word="Dislocated" range="beyond 300 bps" count={stocks ? groups.dislocated.length : null} note="Off the scale. The needle pins at the hatched limit and the reading is printed in full." tokens={list(groups.dislocated)} />
          <BandTerm
            word="Unpriced"
            range="no USD reading"
            count={stocks ? groups.unpriced.length : null}
            note="No supply, no pool or a pool quoted in something other than a USD stablecoin. LumenMarc shows no figure rather than a converted one."
            tokens={!stocks ? "waiting for the current block" : groups.unpriced.length ? groups.unpriced.map((s) => `${s.ticker} · ${(unpricedReason(s) ?? "unpriced").toLowerCase()}`).join(" · ") : "none at this block"}
          />
        </dl></Reveal>
      </div>
    </section>
  );
}

function BandTerm({ word, range, count, note, tokens }: { word: string; range: string; count: number | null; note: string; tokens: string }) {
  return (
    <div className="border-t border-foreground/15 pt-5 transition-colors duration-300 hover:bg-foreground/[0.04]" data-testid={`band-${word.toLowerCase()}`}>
      <dt className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[30px] leading-none text-foreground">{word}</span>
        <span className="font-mono text-[11.5px] text-foreground/50 tnum">
          <Tick text={count != null ? `${count} ${count === 1 ? "token" : "tokens"}` : "loading"} />
        </span>
      </dt>
      <dd className="mt-3 font-mono text-[11.5px] text-foreground/50">{range}</dd>
      <dd className="mt-4 font-sans text-[14.5px] leading-[1.6] text-foreground/60">{note}</dd>
      <dd className="mt-4 font-mono text-[11px] leading-[1.6] text-foreground/80 tnum">{tokens}</dd>
    </div>
  );
}

