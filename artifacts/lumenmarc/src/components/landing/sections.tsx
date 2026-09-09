import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import type { IntegrityAlert, Overview, PremiumHistory, StockLabel, StockSummary } from "@workspace/api-client-react";
import { cn, formatBpsBare, truncateAddress, unpricedReason, DEVIATION_LABEL } from "@/lib/utils";
import { BandScale } from "@/components/instrument/band-scale";
import { DimensionFigure } from "@/components/instrument/dimension-figure";
import { PremiumTrace } from "@/components/instrument/premium-trace";
import { readingFromStock, type ComparatorReading } from "@/components/instrument/comparator";
import { BY_WIDTH } from "@/components/instrument/rail";
import { Arrow, Figure, Reveal } from "@/components/motion";

/*
 * The four chapters under the fold: Verify, Compare, Read the market, Integrate.
 * Each answers one question with one live object. Every figure is read from the current snapshot;
 * methodology, sources, the API reference and scope live on /about.
 */

type SectionProps = {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  count?: number | null;
  /** Content runs full width under the header instead of beside it. */
  wide?: boolean;
  children: React.ReactNode;
};

/*
 * Chapters share the fold's column split (5fr / 7fr), so the rule between statement and instrument
 * runs on down the page: title on the left of it, the live object on the right. The title column
 * holds its place while the object scrolls past, the way a margin note does.
 */
export function Section({ id, eyebrow, title, lede, count, wide = false, children }: SectionProps) {
  return (
    <section id={id} className="border-b border-foreground/15" data-testid={`section-${id}`}>
      <div className={cn("w-full", !wide && "lg:grid lg:grid-cols-[minmax(440px,5fr)_minmax(0,7fr)]")}>
        <div className={cn("px-5 pt-16 sm:px-8 xl:px-14", wide ? "pb-0 lg:pt-24" : "pb-10 lg:border-r lg:border-foreground/15 lg:py-24")}>
          <Reveal as="header" className={cn(wide ? "max-w-[760px]" : "lg:sticky lg:top-[calc(64px+6rem)] lg:max-w-[520px]")}>
            <p className="font-mono text-[11.5px] text-foreground/55">
              {eyebrow}
              {typeof count === "number" ? <span className="ml-2 align-top text-[10px] text-foreground/48">[{count}]</span> : null}
            </p>
            <h2 className="mt-5 max-w-[20ch] font-display text-[clamp(36px,3.6vw,54px)] leading-[1.04] tracking-[-0.015em] text-foreground">{title}</h2>
            {lede ? <p className="mt-6 max-w-[42ch] text-[16px] leading-[1.6] text-foreground/65">{lede}</p> : null}
          </Reveal>
        </div>
        <Reveal className={cn("px-5 sm:px-8 xl:px-14", wide ? "pb-20 pt-12 lg:pb-28 lg:pt-16" : "pb-16 lg:py-24")} delay={0.06}>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

const isLookalike = (a: IntegrityAlert) => /lookalike|imposter|impostor|unverified/i.test(a.title);

/* ---------- Verify ---------- */

export function Verify({ overview, hero, detail, detailError = null }: { overview: Overview | undefined; hero: StockSummary | null; detail: StockLabel | undefined; detailError?: string | null }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const lookalikes = (overview?.alerts ?? []).filter(isLookalike).slice(0, 2);
  const own = detail && hero && detail.summary.ticker === hero.ticker ? detail : null;
  const checks = own?.verify.checks ?? [];
  const passed = checks.filter((c) => c.passed === true).length;
  const failed = checks.filter((c) => c.passed === false).length;
  const unavailable = checks.filter((c) => c.passed == null).length;
  /* Issuance comes from the address match against Coinbase's list, not from every check passing: a held feed is not a failed issuer. */
  const issued = hero?.issuer.verified ?? null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (s) navigate(`/check?q=${encodeURIComponent(s)}`);
  };
  return (
    <Section
      id="verify"
      eyebrow="Verify"
      title="Is it Coinbase-issued?"
      lede="Only the address on Coinbase's published list is the stock. A name and a symbol can be copied by anyone."
    >
      <form onSubmit={submit} className="hover-quiet flex border border-foreground/30 focus-within:border-foreground/60" data-testid="form-verify">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paste a token address or ticker"
          className="h-14 min-w-0 flex-1 bg-transparent px-5 font-mono text-[14px] text-foreground placeholder:text-foreground/48 focus:outline-none"
          aria-label="Token address or ticker"
          data-testid="input-verify"
        />
        <button type="submit" className="hover-quiet h-14 border-l border-foreground/30 px-6 font-mono text-[13px] text-foreground hover:bg-foreground hover:text-background" data-testid="button-verify">
          Verify
        </button>
      </form>

      {/* The check, running on the token the dial is reading. */}
      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-foreground/15 pt-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" data-testid="verify-proof">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-foreground/50">{own && detailError ? "Checked at the last successful read" : "Checked at the current block"}</p>
          {hero ? (
            <>
              <p className="mt-4 font-display text-[40px] leading-none text-foreground sm:text-[48px]">{hero.ticker}</p>
              <p className="mt-3 text-[15px] leading-[1.5] text-foreground/70">{hero.name}</p>
              <p className="mt-4 font-mono text-[12px] leading-[1.7] text-foreground/60 tnum">
                {own ? (
                  <>
                    <span className={cn(issued ? "text-foreground" : "text-dev-dislocated")}>{issued ? "Coinbase-issued" : "Not on Coinbase's list"}</span>
                    {checks.length ? ` · ${passed} of ${checks.length} checks pass` : ""}
                    {failed ? <span className="text-dev-dislocated">{` · ${failed} fail`}</span> : null}
                    {unavailable ? ` · ${unavailable} unavailable` : ""} · {truncateAddress(hero.address)}
                    {detailError ? <span className="text-dev-dislocated"> · refresh failed: {detailError}</span> : null}
                  </>
                ) : detailError ? (
                  <span className="text-dev-dislocated">Check unavailable · {detailError}</span>
                ) : (
                  "running the checks"
                )}
              </p>
            </>
          ) : (
            <p className="mt-4 font-mono text-[12px] text-foreground/55">waiting for the current block</p>
          )}
        </div>
        {hero ? (
          <Link href={`/check?q=${hero.address}`} className="group hover-quiet inline-flex h-11 items-center gap-2 self-start border border-foreground/30 px-5 font-mono text-[12px] text-foreground hover:border-foreground sm:self-end" data-testid="link-full-check">
            Full check <Arrow />
          </Link>
        ) : null}
      </div>

      {lookalikes.length > 0 && (
        <ul className="mt-8 border-t border-foreground/15" data-testid="lookalikes">
          {lookalikes.map((a, i) => (
            <li key={`${a.title}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/15 py-4 font-mono text-[12px] leading-[1.6] text-foreground/65">
              <span className="min-w-0">
                <span className="text-dev-dislocated">Flagged</span> · {a.title}
              </span>
              {a.address && (
                <Link href={`/check?q=${a.address}`} className="group hover-quiet shrink-0 text-foreground hover:text-primary">
                  {truncateAddress(a.address)} <Arrow />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------- Compare ---------- */

export function Compare({ hero, history, historyError = null, range24h }: { hero: StockSummary | null; history: PremiumHistory | undefined; historyError?: string | null; range24h: ComparatorReading["range24h"] }) {
  const reading = hero ? readingFromStock(hero, range24h) : null;
  const points = history && hero && history.ticker === hero.ticker ? history.points : [];
  return (
    <Section
      id="compare"
      eyebrow="Compare"
      title="How far is the quote from the reference?"
      lede="Each stock has its own Chainlink reference feed. LumenMarc reads the deepest USD-stablecoin pool at the same block and states the gap in basis points."
    >
      <p className="font-mono text-[11px] text-foreground/50">{hero ? `${hero.ticker} · reference against onchain` : "Reference against onchain"}</p>
      <DimensionFigure reading={reading} blockNumber={null} status={hero ? "ready" : "loading"} immediate className="mt-5 block h-auto w-full max-w-[640px] font-mono text-[11.5px]" />

      <div className="mt-14 border-t border-foreground/15 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 font-mono text-[11px] text-foreground/50 tnum">
          <span>{hero ? `${hero.ticker} · last 24 h` : "Last 24 h"}</span>
          {range24h ? (
            <span>
              <Figure value={range24h.lo} format={formatBpsBare} className="text-foreground/80" /> to <Figure value={range24h.hi} format={formatBpsBare} className="text-foreground/80" /> bps
            </span>
          ) : null}
        </div>
        <div className="mt-5">
          {points.length > 1 && historyError ? <p className="mb-4 font-mono text-[11px] text-dev-dislocated">Refresh failed, showing the last successful read · {historyError}</p> : null}
          {points.length > 1 ? (
            <PremiumTrace points={points} height={240} className="block h-auto w-full" />
          ) : (
            <p className={cn("py-14 font-mono text-[12px]", historyError ? "text-dev-dislocated" : "text-foreground/55")}>
              {historyError ?? (history ? "History building · no priced reading stored in the last 24 h" : hero ? "loading history" : "waiting for the current block")}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Read the market ---------- */

export function Market({ stocks, error = null }: { stocks: StockSummary[] | undefined; error?: string | null }) {
  const ordered = stocks ? [...stocks].sort(BY_WIDTH) : [];
  const priced = ordered.filter((s) => typeof s.primaryVenue?.premiumBps === "number").length;
  return (
    <Section
      id="market"
      eyebrow="Read the market"
      count={stocks ? stocks.length : null}
      title="Every token on one scale."
      lede={
        <>
          Fair within 50 bps of the reference, dislocated beyond 300. Fixed thresholds, not live values.
          {stocks ? ` ${priced} of ${stocks.length} tokens have a USD-stablecoin pool to read right now.` : ""}
        </>
      }
      wide
    >
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <BandScale stocks={stocks ?? []} />
        </div>
      </div>

      <ol className="mt-14 grid grid-cols-1 border-t border-foreground/15 lg:grid-cols-2 lg:gap-x-12" data-testid="market-list">
        {ordered.map((s) => {
          const v = s.primaryVenue;
          const isPriced = !!v && typeof v.premiumBps === "number";
          return (
            <li key={s.ticker} className="border-b border-foreground/15">
              <Link
                href={`/readings?t=${s.ticker}`}
                className="group hover-quiet grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 py-4 hover:bg-foreground/[0.03] sm:grid-cols-[7rem_minmax(0,1fr)_7rem_6.5rem]"
                data-testid={`market-${s.ticker}`}
              >
                <span className="font-display text-[26px] leading-none text-foreground transition-colors duration-200 group-hover:text-primary">{s.ticker}</span>
                <span className="hidden truncate text-[13px] text-foreground/55 sm:block">{s.name}</span>
                {isPriced ? (
                  <>
                    <span className="text-right font-mono text-[20px] leading-none text-primary tnum">
                      <Figure value={v!.premiumBps} format={formatBpsBare} />
                    </span>
                    <span className="hidden text-right font-mono text-[12px] text-foreground/60 sm:block">{DEVIATION_LABEL[s.deviationState]}</span>
                  </>
                ) : (
                  <span className="whitespace-nowrap text-right font-mono text-[12px] text-foreground/52 sm:col-span-2">{unpricedReason(s) ?? "Unpriced"}</span>
                )}
              </Link>
            </li>
          );
        })}
        {!ordered.length && (
          <li className={cn("border-b border-foreground/15 py-5 font-mono text-[12px]", error ? "text-dev-dislocated" : "text-foreground/55")}>
            {error ? `Snapshot unavailable · ${error}` : "waiting for the current block"}
          </li>
        )}
      </ol>

      <div className="mt-10">
        <Link href="/readings" className="group hover-quiet inline-flex h-12 items-center gap-2 border border-foreground/35 px-6 font-mono text-[13px] text-foreground hover:border-foreground hover:bg-foreground hover:text-background" data-testid="cta-open-readings-2">
          Open readings <Arrow />
        </Link>
      </div>
    </Section>
  );
}

/* ---------- Integrate ---------- */

const ENDPOINTS: { path: string; what: string }[] = [
  { path: "/api/stocks", what: "every token with reference, venue and gap" },
  { path: "/api/stocks/:ticker", what: "the full sheet for one token" },
  { path: "/api/check?q=", what: "verify an address or ticker" },
];

export function Integrate({ hero }: { hero: StockSummary | null }) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <Section
      id="integrate"
      eyebrow="Integrate"
      title="Every reading is an endpoint."
      lede="Read-only JSON with no key and a live card for any token that fits a 360 by 240 frame."
    >
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <ul className="border-t border-foreground/15" data-testid="endpoint-list">
            {ENDPOINTS.map((e) => (
              <li key={e.path} className="grid grid-cols-1 gap-y-1 border-b border-foreground/15 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-x-8 xl:grid-cols-1 xl:gap-y-1.5">
                <a href={`${base}${e.path.replace(":ticker", hero?.ticker ?? "")}`} target="_blank" rel="noreferrer" className="hover-quiet truncate font-mono text-[13px] text-foreground hover:text-primary">
                  {e.path}
                </a>
                <span className="text-[13px] text-foreground/55">{e.what}</span>
              </li>
            ))}
          </ul>
          <Link href="/about#api" className="group hover-quiet mt-8 inline-flex items-center gap-2 font-mono text-[12px] text-foreground/70 hover:text-foreground" data-testid="link-api-reference">
            Full API reference and embed code <Arrow />
          </Link>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-foreground/50">{hero ? `Live card · ${hero.ticker}` : "Live card"}</p>
          {hero ? (
            <iframe
              src={`${base}/embed/${hero.ticker}`}
              title={`${hero.ticker} live card`}
              width={360}
              height={240}
              loading="lazy"
              className="mt-4 block h-[240px] w-[360px] max-w-full border-0 bg-background"
              data-testid="embed-preview"
            />
          ) : (
            <p className="mt-4 font-mono text-[12px] text-foreground/55">waiting for the current block</p>
          )}
        </div>
      </div>
    </Section>
  );
}
