import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { useGetStock, getGetStockQueryKey, type StockLabel } from "@workspace/api-client-react";
import {
  apiErrorMessage,
  cn,
  DEVIATION_LABEL,
  formatAgo,
  formatBpsBare,
  formatEt,
  formatNumber,
  formatUsd,
  truncateAddress,
  referencePrice,
} from "@/lib/utils";
import { Comparator, readingFromStock } from "@/components/instrument/comparator";
import { DimensionFigure } from "@/components/instrument/dimension-figure";
import { PremiumTrace } from "@/components/instrument/premium-trace";
import { SizeCheckModule } from "@/components/label/size-check";
import { Arrow, Figure, Reveal, Tick } from "@/components/motion";

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

function Section({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-foreground/15 py-14 lg:py-20" data-testid={`section-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <p className="font-mono text-[12px] text-foreground/58 lg:col-span-2">{index} · {title}</p>
        <div className="min-w-0 lg:col-span-10">
          <Reveal><h2 className="text-[clamp(30px,3.4vw,48px)] leading-[1.08] text-foreground">{title}</h2></Reveal>
          <Reveal className="mt-9" delay={0.08}>{children}</Reveal>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={cn("border-t border-foreground/15 py-4", last && "border-b")}>
      <p className="mb-2 font-mono text-[10.5px] text-foreground/52">{label}</p>
      {children}
    </div>
  );
}

function pauseText(v: boolean | null) {
  return v == null ? "unknown" : v ? "paused" : "open";
}

export default function Label() {
  const [, params] = useRoute("/s/:ticker");
  const ticker = params?.ticker || "";
  const { data: stock, isLoading, error } = useGetStock(ticker, {
    query: { enabled: !!ticker, queryKey: getGetStockQueryKey(ticker), refetchInterval: 30000, retry: false },
  });
  const [radius, setRadius] = useState(150);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const resize = () => setRadius(window.innerWidth >= 1024 ? 260 : 150);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const range24h = useMemo(() => {
    if (!stock) return null;
    const values = stock.history.filter((p) => p.premiumBps != null).map((p) => p.premiumBps!);
    return values.length ? { lo: Math.min(...values), hi: Math.max(...values) } : null;
  }, [stock]);

  if (isLoading) {
    return <div className="mx-auto min-h-[55vh] w-full max-w-[1600px] px-5 py-20 font-mono text-[12px] text-foreground/58 sm:px-8 xl:px-12">Reading {ticker} at the current block…</div>;
  }
  if (error || !stock) {
    return (
      <div className="mx-auto min-h-[55vh] w-full max-w-[1600px] px-5 py-20 sm:px-8 xl:px-12">
        <p className="font-mono text-[12px] text-dev-dislocated">No reading for {ticker}</p>
        <h1 className="mt-4 text-[42px]">Token not found.</h1>
        <p className="mt-4 max-w-xl text-foreground/68">{apiErrorMessage(error, "The requested tokenized stock could not be found.")}</p>
        <Link href="/readings" className="mt-8 inline-flex h-11 items-center border border-foreground/40 px-5 font-mono text-[13px]">Open readings</Link>
      </div>
    );
  }

  const reading = readingFromStock(stock.summary, range24h);
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const apiPath = `${base}/api/stocks/${stock.summary.ticker}`;
  const embedPath = `${base}/embed/${stock.summary.ticker}`;
  const embedUrl = `${window.location.origin}${embedPath}`;
  const iframe = `<iframe src="${embedUrl}" width="360" height="240"></iframe>`;

  const copySummary = async () => {
    await navigator.clipboard.writeText(stock.shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 pb-16 sm:px-8 xl:px-12" data-testid="page-label">
      <header className="py-10 lg:py-14">
        <p className="font-mono text-[12px] text-foreground/58">
          <Link href={`/readings?t=${stock.summary.ticker}`} className="underline underline-offset-4">Readings</Link> / {stock.summary.ticker}
        </p>
        <div className="mt-8 flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-[clamp(52px,6vw,72px)] leading-[1.02] tracking-[-0.015em] text-foreground">{stock.summary.ticker}</h1>
            <p className="mt-4 text-[20px] text-foreground/72">{stock.summary.name}</p>
            <p className="mt-4 font-mono text-[12px] text-foreground/58">
              Coinbase-issued · {stock.verify.verified ? "address verified" : "address not verified"} · block <Tick text={stock.blockNumber.toLocaleString("en-US")} />
            </p>
          </div>
          <button type="button" onClick={copySummary} className="h-11 border border-foreground/40 px-5 font-mono text-[13px] hover:border-foreground" data-testid="button-copy-summary">
            {copied ? "copied" : "Copy summary"}
          </button>
        </div>
        <p className="mt-7 max-w-[70ch] text-[15.5px] leading-[1.6] text-foreground/68">{stock.summary.headline}</p>
      </header>

      <section className="grid grid-cols-1 border-t border-foreground/15 lg:grid-cols-12" data-testid="instrument-band">
        <div className="flex min-w-0 flex-col items-center py-10 lg:col-span-7 lg:border-r lg:border-foreground/15 lg:py-14">
          <Comparator reading={reading} status="ready" radius={radius} compact={radius < 250} />
          <DimensionFigure reading={reading} blockNumber={stock.blockNumber} status="ready" immediate compact={radius < 250} className="mt-8 block h-auto w-full max-w-[520px] font-mono text-[11.5px]" />
        </div>
        <div className="min-w-0 border-t border-foreground/15 lg:col-span-5 lg:border-t-0 lg:px-8 lg:py-10">
          <Fact label="Reference">
            {referencePrice(stock.price.reference) != null ? <Figure value={stock.price.reference.price} format={formatUsd} className="font-mono text-[26px] text-foreground" /> : <span className="font-mono text-[26px] text-foreground/72">Unavailable</span>}
            <p className="mt-3 font-mono text-[11.5px] leading-[1.6] text-foreground/58">
              Chainlink {stock.price.reference.description} · {stock.price.reference.state === "held" ? `held since ${formatEt(stock.price.reference.updatedAtUtc, "time")}` : `${stock.price.reference.state} · updated ${formatAgo(stock.price.reference.updatedAtUtc)}`}
              <br />{stock.price.reference.note} · feed <a href={`https://basescan.org/address/${stock.price.reference.feedAddress}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">{truncateAddress(stock.price.reference.feedAddress)}</a>
            </p>
          </Fact>
          <Fact label="Onchain">
            <p className={cn("font-mono text-[26px] tnum", stock.price.premiumBps != null ? "text-primary" : "text-foreground")}>
              {stock.price.premiumBps != null && stock.price.primaryVenue && stock.price.primaryVenue.priceUsd != null ? <Figure value={stock.price.primaryVenue.priceUsd} format={formatUsd} /> : "Unpriced"}
              {stock.price.premiumBps != null ? (
                <span className="ml-3 text-[14px]"><Figure value={stock.price.premiumBps} format={formatBpsBare} /> bps · {DEVIATION_LABEL[stock.price.deviationState].toLowerCase()}</span>
              ) : stock.price.primaryVenue ? (
                <span className="ml-3 text-[14px] text-foreground/58">
                  {stock.price.primaryVenue.baseToken.symbol}/{stock.price.primaryVenue.quoteToken.symbol} · not a USD quote
                </span>
              ) : null}
            </p>
            <p className="mt-2 font-mono text-[11.5px] leading-[1.6] text-foreground/58">{stock.price.statement}</p>
          </Fact>
          <Fact label="Supply & float">
            <p className="font-mono text-[18px] tnum">{formatNumber(stock.supply.totalSupply, 4)} tokens · {formatNumber(stock.supply.shareEquivalents, 4)} sh-eq</p>
            <p className="mt-2 font-mono text-[11.5px] text-foreground/58">float {formatUsd(stock.supply.floatUsd)} · multiplier {stock.own.multiplier.toFixed(4)}</p>
          </Fact>
          <Fact label="Pauses">
            <p className="font-mono text-[13px]">transfer {pauseText(stock.pauses.transfer)} · mint {pauseText(stock.pauses.mint)} · burn {pauseText(stock.pauses.burn)}</p>
          </Fact>
          <Fact label="Metadata" last>
            <p className="font-mono text-[13px]">ISIN {stock.metadata.isin ?? "not published"} · CUSIP {stock.metadata.cusip ?? "not published"}</p>
            {stock.metadata.contractUri && <a href={stock.metadata.contractUri} target="_blank" rel="noreferrer" className="group mt-2 block break-all font-mono text-[11.5px] underline underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">contract metadata <Arrow /></a>}
          </Fact>
        </div>
      </section>

      <Section index="01" title="Verification">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[17px] leading-[1.55]">{stock.verify.statement}</p>
            <p className="mt-5 break-all font-mono text-[13px] text-foreground/68">{stock.verify.address}</p>
            <p className="mt-3 font-mono text-[11.5px] leading-[1.6] text-foreground/58">{stock.summary.issuer.source} · {stock.summary.issuer.note}</p>
            <div className="mt-6 flex flex-wrap gap-5 font-mono text-[12px]">
              <Link href={`/check?q=${stock.verify.address}`} className="group underline underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">Full check <Arrow /></Link>
              <a href={`https://basescan.org/address/${stock.verify.address}`} target="_blank" rel="noreferrer" className="group underline underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">Basescan <Arrow /></a>
            </div>
          </div>
          <ul className="border-t border-foreground/20" data-testid="check-list">
            {stock.verify.checks.map((c) => (
              <li key={c.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-b border-foreground/20 py-4 transition-colors duration-300 hover:bg-foreground/[0.035]">
                <span className={cn("font-mono text-[12px]", c.passed === false ? "text-dev-dislocated" : c.passed == null ? "text-foreground/52" : "text-foreground")}>{c.passed === true ? "pass" : c.passed === false ? "fail" : "n/a"}</span>
                <span><span className="block text-[15.5px] leading-[1.5] text-foreground/85">{c.label}</span><span className="mt-1 block font-mono text-[11.5px] leading-[1.6] text-foreground/68">{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section index="02" title="Venues">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-t border-foreground/20 text-left">
            <thead className="font-mono text-[10.5px] text-foreground/52">
              <tr className="border-b border-foreground/20"><th className="py-3 pr-5 font-normal">dex</th><th className="py-3 pr-5 font-normal">pair / quote</th><th className="py-3 pr-5 text-right font-normal">price</th><th className="py-3 pr-5 text-right font-normal">premium bps</th><th className="py-3 pr-5 text-right font-normal">liquidity</th><th className="py-3 pr-5 text-right font-normal">24 h volume</th><th className="py-3 pr-5 text-right font-normal">txns</th><th className="py-3 font-normal">warnings / link</th></tr>
            </thead>
            <tbody className="font-mono text-[12px] tnum">
              {stock.venues.map((v, i) => (
                <tr key={`${v.pairAddress}-${i}`} className="border-b border-foreground/20 align-top transition-colors duration-300 hover:bg-foreground/[0.035]">
                  <td className="py-4 pr-5">{v.dexLabel}{v.isPrimary ? " · primary" : ""}</td>
                  <td className="py-4 pr-5">{v.baseToken.symbol}/{v.quoteToken.symbol}<br/><span className="text-foreground/52">{v.quoteToken.symbol}</span></td>
                  <td className="py-4 pr-5 text-right">{v.premiumBps == null || v.priceUsd == null ? "unpriced" : formatUsd(v.priceUsd)}</td>
                  <td className="py-4 pr-5 text-right text-primary"><Figure value={v.premiumBps} format={formatBpsBare} /></td>
                  <td className="py-4 pr-5 text-right">{formatUsd(v.liquidityUsd, 0)}</td>
                  <td className="py-4 pr-5 text-right">{formatUsd(v.volume24hUsd, 0)}</td>
                  <td className="py-4 pr-5 text-right">{v.txns24h}</td>
                  <td className="max-w-[26rem] py-4 leading-[1.55] text-foreground/58">{v.warnings.join(" · ") || "none"} · <a href={v.url} target="_blank" rel="noreferrer" className="group text-foreground underline underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">pool <Arrow /></a></td>
                </tr>
              ))}
              {!stock.venues.length && <tr><td colSpan={8} className="border-b border-foreground/20 py-4 text-foreground/58">no venue found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section index="03" title="Last 24 h">
        {stock.history.length > 1 ? (
          <>
            <div className="border border-foreground/15 bg-[#0D0F14] p-4 sm:p-6"><PremiumTrace points={stock.history} height={260} className="block h-auto w-full" /></div>
            {range24h && <p className="mt-4 font-mono text-[11.5px] text-foreground/58">low {formatBpsBare(range24h.lo)} · high {formatBpsBare(range24h.hi)} · {stock.history.length} readings</p>}
          </>
        ) : <p className="font-mono text-[12px] text-foreground/58">no priced history yet</p>}
      </Section>

      <Section index="04" title="Size check"><SizeCheckModule ticker={stock.summary.ticker} hasVenue={!!stock.price.primaryVenue} unpriced={stock.price.premiumBps == null} /></Section>

      <Section index="05" title="Holdings">
        <dl className="grid border-t border-foreground/20 md:grid-cols-2">
          {[
            ["Multiplier", stock.own.multiplier.toFixed(4)],
            ["Share conversion", `1 token = ${formatNumber(stock.own.sharesPerToken, 6)} share-equivalents · ${formatNumber(stock.own.tokensPerShare, 6)} tokens per share`],
            ["Last multiplier change", stock.own.lastMultiplierChangeUtc ? formatEt(stock.own.lastMultiplierChangeUtc) : "never"],
            ["Underlying", stock.summary.underlying],
            ["Dividend policy", stock.own.dividendPolicy],
            ["Claim structure", stock.own.claimStructure],
            ["Custodian", stock.own.custodian],
            ["Holder data", stock.supply.holdersNote],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-foreground/20 py-5 transition-colors duration-300 hover:bg-foreground/[0.035] pr-8 md:odd:border-r md:even:pl-8">
              <dt className="font-mono text-[10.5px] text-foreground/52">{label}</dt>
              <dd className="mt-3 text-[14.5px] leading-[1.55] text-foreground/75">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section index="06" title="Corporate actions">
        <ul className="border-t border-foreground/20">
          {stock.corporateActions.map((a, i) => <li key={`${a.title}-${i}`} className="grid gap-2 border-b border-foreground/20 py-4 transition-colors duration-300 hover:bg-foreground/[0.035] md:grid-cols-[10rem_1fr_auto]"><span className="font-mono text-[12px] text-foreground/58">{a.status} · {a.kind}</span><span><span className="block">{a.title}</span><span className="mt-1 block text-[14px] text-foreground/68">{a.detail}</span></span><span className="font-mono text-[11.5px] text-foreground/58">{a.scheduledForUtc ? formatEt(a.scheduledForUtc) : a.txHash ? truncateAddress(a.txHash) : ""}{a.uri && <> · <a href={a.uri} target="_blank" rel="noreferrer" className="group underline underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">source <Arrow /></a></>}</span></li>)}
          {!stock.corporateActions.length && <li className="border-b border-foreground/20 py-4 font-mono text-[12px] text-foreground/58">no corporate actions reported</li>}
        </ul>
      </Section>

      <Section index="07" title="Disclosures">
        <ol className="border-t border-foreground/20">{stock.disclosures.map((d, i) => <li key={i} className="border-b border-foreground/20 py-4 text-[14.5px] leading-[1.55] text-foreground/72">{d}</li>)}</ol>
      </Section>

      <Section index="08" title="Integrate">
        <div className="grid gap-10 lg:grid-cols-2">
          <div><p className="font-mono text-[12px] text-foreground/58">API endpoint</p><a href={apiPath} target="_blank" rel="noreferrer" className="mt-3 block break-all border border-foreground/15 bg-[#0D0F14] p-4 font-mono text-[12.5px] underline underline-offset-4">GET {apiPath}</a></div>
          <div><p className="font-mono text-[12px] text-foreground/58">Embed · 360 × 240</p><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all border border-foreground/15 bg-[#0D0F14] p-4 font-mono text-[12px] leading-[1.6] text-foreground/75">{iframe}</pre></div>
        </div>
      </Section>
      <p className="border-t border-foreground/15 pt-6 font-mono text-[11px] text-foreground/58">Updated {formatEt(stock.updatedAtUtc)} · block {stock.blockNumber.toLocaleString("en-US")} · Built by vaibhav0xq · github.com/vaibhav0xq</p>
    </div>
  );
}