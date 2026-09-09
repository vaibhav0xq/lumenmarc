import { Link } from "wouter";
import type { StockSummary } from "@workspace/api-client-react";
import { cn, formatBpsBare, referencePrice, unpricedReason, DEVIATION_LABEL } from "@/lib/utils";
import { useSize } from "@/lib/use-width";
import { Comparator, readingFromStock, type ComparatorReading } from "@/components/instrument/comparator";
import { Arrow, Figure } from "@/components/motion";

/*
 * The instrument stage on the landing fold: one dial, the three figures that explain it, nothing else.
 * The rail, the block line and the feed details live on /readings; the fold answers one question.
 */

type Props = {
  hero: StockSummary | null;
  range24h: ComparatorReading["range24h"];
  status: "loading" | "failed" | "ready";
  className?: string;
};

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function InstrumentPreview({ hero, range24h, status, className }: Props) {
  const reading = hero ? readingFromStock(hero, range24h) : null;
  const [stageRef, stage] = useSize<HTMLDivElement>();
  /* Radius from the measured stage so the whole face, including the 300 wedge, always fits. */
  const radius = stage.width
    ? Math.max(120, Math.min(400, Math.floor((stage.width - 48) / 2.04), stage.height > 0 ? Math.floor((stage.height - 48) / 2.04) : 400))
    : 0;
  const v = hero?.primaryVenue ?? null;
  const priced = !!v && typeof v.premiumBps === "number" && typeof v.priceUsd === "number";
  const feed = hero?.reference ?? null;
  const feedWord = feed ? feed.state : "";
  const target = hero ? `/readings?t=${hero.ticker}` : "/readings";

  return (
    <div className={cn("stage-field flex h-full min-h-0 flex-col", className)} data-testid="instrument-preview">
      {/* One quiet line above the face: what this is and where it opens. */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-foreground/10 px-5 font-mono text-[11.5px] text-foreground/55 sm:px-6 xl:px-8">
        <span className="inline-flex items-center gap-2.5">
          <span className={cn("size-[5px]", status === "failed" ? "bg-dev-dislocated" : "bg-feed-live")} aria-hidden />
          {status === "failed" ? "last snapshot" : status === "ready" ? "Live reading" : "Reading"}
        </span>
        <Link href={target} className="group hover-quiet text-foreground/70 hover:text-foreground" data-testid="preview-open-readings">
          Open readings <Arrow />
        </Link>
      </div>

      <Link
        href={target}
        aria-label={hero ? `Open the ${hero.ticker} reading` : "Open the readings instrument"}
        className="group/face relative flex min-h-[340px] flex-1 items-center justify-center overflow-hidden px-4 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/60 sm:min-h-[420px] lg:min-h-0"
      >
        <div ref={stageRef} className="flex h-full w-full items-center justify-center">
          {radius > 0 && <Comparator reading={reading} status={status} radius={radius} compact={radius < 200} detail="focused" />}
        </div>
      </Link>

      {/* The three figures that explain the needle. */}
      <dl className="grid shrink-0 grid-cols-3 border-t border-foreground/12 bg-background/40" data-testid="preview-figures">
        <Cell label="Reference" note={feed ? `Chainlink · ${feedWord}` : "Chainlink"} short={feed ? feedWord : "Chainlink"}>
          {feed ? referencePrice(feed) != null ? <Figure key={hero!.ticker} value={feed.price} format={(n) => fmt(n)} /> : <Word>unavailable</Word> : <Pending />}
        </Cell>
        <Cell label="Onchain" note={v ? `${v.dexLabel} · ${v.quoteToken.symbol}` : "no venue at this block"} short={v ? v.dexLabel : "no venue"} divided>
          {priced ? <Figure key={hero!.ticker} value={v!.priceUsd!} format={(n) => fmt(n)} /> : v ? <Word>unpriced</Word> : hero ? <Word>no venue</Word> : <Pending />}
        </Cell>
        <Cell label="Premium" note={hero ? (priced ? DEVIATION_LABEL[hero.deviationState].toLowerCase() : (unpricedReason(hero) ?? "unpriced").toLowerCase()) : "against the reference"} divided blue>
          {priced ? (
            <>
              <Figure key={hero!.ticker} value={v!.premiumBps} format={formatBpsBare} /> <span className="text-[12px] text-foreground/55">bps</span>
            </>
          ) : hero ? (
            <Word>no reading</Word>
          ) : (
            <Pending />
          )}
        </Cell>
      </dl>
    </div>
  );
}

function Cell({ label, note, short, children, blue = false, divided = false }: { label: string; note: string; short?: string; children: React.ReactNode; blue?: boolean; divided?: boolean }) {
  return (
    <div className={cn("min-w-0 border-foreground/12 px-4 py-4 sm:px-6 sm:py-5 xl:px-8", divided && "border-l")}>
      <dt className="font-mono text-[10.5px] text-foreground/50">{label}</dt>
      <dd className={cn("mt-2 truncate font-mono text-[20px] leading-none tnum sm:text-[24px]", blue ? "text-primary" : "text-foreground")}>{children}</dd>
      <dd className="mt-2 truncate font-mono text-[10.5px] leading-[1.5] text-foreground/50">
        {short && short !== note ? (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{note}</span>
          </>
        ) : (
          note
        )}
      </dd>
    </div>
  );
}

function Word({ children }: { children: React.ReactNode }) {
  return <span className="text-[14px] text-foreground/70 sm:text-[16px]">{children}</span>;
}

/** The figure slot before the first snapshot arrives: an honest "loading", never a dash that could read as a value. */
function Pending() {
  return <span className="text-[13px] text-foreground/52">loading</span>;
}
