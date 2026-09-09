import { useMemo } from "react";
import { Link } from "wouter";
import {
  useGetOverview,
  useListStocks,
  getGetOverviewQueryKey,
  getListStocksQueryKey,
} from "@workspace/api-client-react";
import { Arrow, Reveal } from "@/components/motion";
import { BandScale } from "@/components/instrument/band-scale";
import { pickWidest } from "@/pages/readings";
import { apiErrorMessage, referencePrice, cn } from "@/lib/utils";

const ENDPOINTS = [
  ["/api/overview", "market state, feed counts, current block and integrity alerts"],
  ["/api/stocks", "all tokens with reference, primary venue and premium"],
  ["/api/stocks/:ticker", "the full stock sheet"],
  ["/api/history?ticker=&window=", "premium history and feed state"],
  ["/api/check?q=", "address, ticker, pool and Basename verification"],
  ["/api/portfolio/:account", "wallet holdings marked from onchain balances"],
  ["/api/size-check", "the effect of a given trade size on a pool"],
  ["/api/market", "US reference-market session state"],
  ["/api/healthz", "service health"],
];

const GENERIC_CHECKS = [
  { label: "Valid B20 token", detail: "Is a known standard and supply is minted" },
  { label: "Coinbase-issued", detail: "Matches the issuer's published address list" },
  { label: "No impersonation", detail: "Prefix and name match the official contract" },
  { label: "Not paused", detail: "Contract is unpaused and transfers can execute" },
  { label: "Reference feed live", detail: "Chainlink total-return feed is reachable" },
];

export default function About() {
  const { data: overview, error: overviewError } = useGetOverview({
    query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 },
  });
  const { data: stocks, error: stocksError } = useListStocks({
    query: { queryKey: getListStocksQueryKey(), refetchInterval: 60000 },
  });
  const readError = overviewError ?? stocksError ?? null;
  
  const hero = useMemo(() => pickWidest(stocks), [stocks]);

  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const excerpt =
    hero && overview
      ? {
          ticker: hero.ticker,
          address: hero.address,
          deviationState: hero.deviationState,
          premiumBps: hero.primaryVenue?.premiumBps ?? null,
          reference: { price: referencePrice(hero.reference), state: hero.reference.state, updatedAtUtc: hero.reference.updatedAtUtc },
          primaryVenue: hero.primaryVenue
            ? { dex: hero.primaryVenue.dexLabel, quote: hero.primaryVenue.quoteToken.symbol, priceUsd: hero.primaryVenue.premiumBps == null ? null : hero.primaryVenue.priceUsd, liquidityUsd: hero.primaryVenue.liquidityUsd }
            : null,
          blockNumber: overview.blockNumber,
        }
      : null;

  return (
    <div className="flex w-full flex-col min-h-[100dvh]" data-testid="page-about">
      <header className="border-b border-foreground/15">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-5 py-12 sm:px-8 lg:grid-cols-12 lg:py-16 xl:px-12">
          <p className="font-mono text-[12px] text-foreground/58 lg:col-span-2">About</p>
          <div className="lg:col-span-10">
            <h1 className="max-w-[19ch] font-display text-[clamp(44px,5vw,72px)] leading-[1.02] tracking-[-0.015em] text-foreground">A reference line for tokenized stocks.</h1>
            <p className="mt-6 max-w-[66ch] text-[17px] leading-[1.6] text-foreground/70">
              LumenMarc is a read-only fair-value and integrity instrument for Coinbase Tokenized Stocks on Base: a place to verify the asset, compare reference and onchain prices and understand what a token represents.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 lg:py-16 xl:px-12">
        <Reveal className="mb-16 grid grid-cols-1 border-b border-foreground/15 pb-10 lg:grid-cols-12">
          <nav className="flex flex-wrap gap-x-8 gap-y-4 font-mono text-[11px] text-foreground/58 lg:col-span-10 lg:col-start-3" aria-label="On this page">
            <a href="#reads" className="hover-quiet hover:text-foreground">01 Reads</a>
            <a href="#methodology" className="hover-quiet hover:text-foreground">02 Methodology</a>
            <a href="#verification" className="hover-quiet hover:text-foreground">03 Verification</a>
            <a href="#api" className="hover-quiet hover:text-foreground">04 API</a>
            <a href="#scope" className="hover-quiet hover:text-foreground">05 Scope</a>
            <a href="#credit" className="hover-quiet hover:text-foreground">06 Credit</a>
          </nav>
        </Reveal>

        <div className="flex flex-col gap-20 pb-16 lg:gap-28 lg:pb-24">
          <Section id="reads" index="01" title="What LumenMarc reads">
            <Prose>
              <p>Every tokenized stock has an identity, a reference value and an onchain market. LumenMarc puts these facts on the same sheet. It asks whether the contract is issued by Coinbase, how the deepest comparable pool differs from the stock's reference feed and how the token balance translates into share-equivalents.</p>
              <p>Contract identity, balances, supply and multipliers are read on Base. Reference prices and freshness come from Chainlink feeds. Pool price, liquidity, volume and transaction counts come from DexScreener.</p>
            </Prose>
          </Section>

          <Section id="methodology" index="02" title="Methodology & conventions">
            <Prose>
              <p>The gap is measured as <span className="font-mono text-[0.9em] text-foreground bg-foreground/[0.04] px-1.5 py-0.5">(pool − reference) / reference</span>, reported in basis points.</p>
              <p>LumenMarc defines a <State>fair</State> band at ±50 bps, an <State>elevated</State> band up to ±300 bps and considers anything beyond ±300 bps <State>dislocated</State>. These are the instrument's display thresholds, not ratings of a security.</p>
            </Prose>
            
            <div className="my-10 max-w-[800px] border border-foreground/15 p-8 stage-field">
              <p className="font-mono text-[11px] text-foreground/58 mb-8">Band scale thresholds (±50, ±300)</p>
              <BandScale stocks={stocks ?? []} />
              {readError ? <p className="mt-6 font-mono text-[11px] text-dev-dislocated">{stocks ? "Refresh failed, showing the last successful read" : "Snapshot unavailable"} · {apiErrorMessage(readError)}</p> : null}
            </div>

            <Prose>
              <p><strong>The stablecoin rule:</strong> A pool quoted against an asset that is not USD-comparable is <State>unpriced</State>. LumenMarc never converts a non-USD quote to USD; if a token only trades against WETH, it shows as unpriced.</p>
              <p><strong>The 20-minute stale rule:</strong> When the US market is closed, the reference feed holds the last regular-session print (shown as <State>held</State>). If the market has been open for more than 20 minutes without a new print, the feed is marked <State>stale</State>.</p>
              <p><strong>The dial scale:</strong> The main instrument dial maps 1 basis point to 0.6 degrees of rotation.</p>
            </Prose>
          </Section>

          <Section id="verification" index="03" title="Verification checks">
            <Prose>
              <p>The address is the identity. Names and ticker symbols are metadata and can be copied. LumenMarc reads the contract through Base RPC and compares its address with Coinbase's published list.</p>
              <p>A third party can deploy a B20 token, choose a familiar stock name and imitate a ticker; it remains a lookalike unless its exact address is verified. Every reading on this site executes these checks:</p>
            </Prose>

            <ul className="mt-8 border-t border-foreground/15 max-w-[800px]">
              {GENERIC_CHECKS.map((check, i) => (
                <li key={i} className="grid grid-cols-1 gap-2 border-b border-foreground/15 py-5 sm:grid-cols-[16rem_minmax(0,1fr)] hover-quiet hover:bg-foreground/[0.02]">
                  <span className="text-[15px] leading-[1.5] text-foreground/90">{check.label}</span>
                  <span className="font-mono text-[11.5px] leading-[1.6] text-foreground/60">{check.detail}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="api" index="04" title="API and embeds">
            <Prose>
              <p>Everything on this site is served by a read-only JSON API over the same snapshot. No key is required. Responses include the block number and the UTC time they were read at.</p>
            </Prose>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 mt-10">
              <div>
                <ol className="border-t border-foreground/15">
                  {ENDPOINTS.map(([path, description]) => (
                    <li key={path} className="grid grid-cols-1 gap-2 border-b border-foreground/15 py-4 transition-colors duration-300 hover:bg-foreground/[0.035] sm:grid-cols-[16rem_minmax(0,1fr)]">
                      <span className="font-mono text-[11.5px] text-foreground">GET {path}</span>
                      <span className="text-[13.5px] leading-[1.5] text-foreground/65">{description}</span>
                    </li>
                  ))}
                </ol>
              </div>
              
              <div className="border border-foreground/15 bg-background p-6">
                <p className="font-mono text-[11px] text-foreground/60">{hero ? `GET ${base}/api/stocks/${hero.ticker} \u00B7 excerpt` : "excerpt"}</p>
                <pre className="mt-4 overflow-x-auto font-mono text-[11.5px] leading-[1.6] text-foreground/70" data-testid="api-excerpt">
                  {excerpt ? JSON.stringify(excerpt, null, 2) : readError ? `unavailable · ${apiErrorMessage(readError)}` : "waiting for the current block"}
                </pre>
              </div>
            </div>
            
            <div className="mt-12 max-w-[800px]">
              <p className="font-mono text-[11px] text-foreground/60 mb-4">Embeds</p>
              <Prose>
                <p>An embeddable card: reference, pool price, premium and feed state, refreshed from the same snapshot. Frame it at 360 by 240.</p>
              </Prose>
              <p className="mt-4 font-mono text-[11px] text-foreground/50">
                {`<iframe src="${base}/embed/${hero?.ticker ?? ":ticker"}" width="360" height="240"></iframe>`}
              </p>
            </div>
          </Section>

          <Section id="scope" index="05" title="Informational only">
            <Prose>
              <p>LumenMarc is an independent data provider, not a venue. It does not custody funds, connect a wallet, route a trade or guarantee execution at any displayed price.</p>
              <p>Onchain pools are permissionless and may be volatile or thin. A displayed pool mark is an observation, not a promise that an order can execute there. Liquidity, fees, routing, price impact and movement between snapshots can all change an outcome.</p>
              <p>Coinbase Onchain SPV Ltd. issues the tokenized stocks, not Base and not LumenMarc. They are offered under Coinbase's terms to eligible non-US users and are not available to US persons. Eligibility is a matter for the issuer and the user's jurisdiction.</p>
            </Prose>
          </Section>

          <Section id="credit" index="06" title="Credit">
            <Prose>
              <p>LumenMarc is built and maintained by a single contributor.</p>
            </Prose>
            <div className="mt-6 font-mono text-[11.5px] leading-[1.8] text-foreground/60">
              <p>Built by vaibhav0xq &middot; <a href="https://github.com/vaibhav0xq" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">github.com/vaibhav0xq</a></p>
              <p className="mt-2"><a href="https://github.com/vaibhav0xq/lumenmarc" target="_blank" rel="noreferrer" className="group text-foreground underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">Source repository <Arrow /></a></p>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

/* Each chapter sits on the header's columns: the index where the eyebrow is, the title and body where the headline is. */
function Section({ id, index, title, children }: { id: string; index: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <p className="font-mono text-[12px] text-foreground/52 lg:col-span-2 lg:pt-4">{index}</p>
        <div className="lg:col-span-10">
          <h2 className="font-display text-[32px] sm:text-[40px] leading-[1.1] tracking-[-0.01em] text-foreground">{title}</h2>
          <div className="mt-8">{children}</div>
        </div>
      </Reveal>
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[68ch] space-y-6 text-[16px] leading-[1.65] text-foreground/75">{children}</div>;
}

function State({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[0.9em] text-foreground">{children}</span>;
}
