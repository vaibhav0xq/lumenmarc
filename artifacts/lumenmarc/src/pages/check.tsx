import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  getCheckAddressQueryKey,
  getListStocksQueryKey,
  useCheckAddress,
  useListStocks,
  type CheckKind,
  type CheckVerdict,
} from "@workspace/api-client-react";
import { apiErrorMessage, cn, formatBps, formatNumber, formatUsd, truncateAddress } from "@/lib/utils";
import { BY_WIDTH, MiniScale } from "@/components/instrument/rail";
import { Arrow, Figure, Reveal } from "@/components/motion";

const VERDICT_WORD: Record<CheckVerdict, string> = {
  verified: "verified",
  caution: "caution",
  danger: "not verified",
  info: "result",
};

const KIND_WORD: Record<CheckKind, string> = {
  "coinbase-stock": "Coinbase-issued stock",
  "lookalike-b20": "lookalike B20 token",
  "other-token": "other token",
  pool: "liquidity pool",
  invalid: "invalid input",
  "not-found": "no match",
};

export default function Check() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const requested = new URLSearchParams(search).get("q") ?? "";
  const [input, setInput] = useState(requested);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  useEffect(() => setInput(requested), [requested]);
  useEffect(() => setEvidenceOpen(false), [requested]);

  /* Starting points come from the live list, widest gap first, so every example is a real token at this block. */
  const { data: stocks } = useListStocks({ query: { queryKey: getListStocksQueryKey(), enabled: !requested, retry: false } });
  const examples = stocks ? [...stocks].sort(BY_WIDTH).slice(0, 3) : [];

  const { data: result, isLoading, error } = useCheckAddress(
    { q: requested },
    { query: { enabled: requested.length > 0, queryKey: getCheckAddressQueryKey({ q: requested }), retry: false } },
  );
  const hasEvidence = !!result && (result.checks.length > 0 || !!result.pool || !!result.token);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = input.trim();
    if (q) navigate(`/check?q=${encodeURIComponent(q)}`, { replace: true });
  };

  return (
    <div className="flex w-full flex-col min-h-[100dvh]" data-testid="page-check">
      <header className="border-b border-foreground/15">
        <Reveal className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-5 py-12 sm:px-8 lg:grid-cols-12 lg:py-16 xl:px-12">
          <p className="font-mono text-[12px] text-foreground/58 lg:col-span-2">Verify</p>
          <div className="lg:col-span-10">
            <h1 className="font-display text-[clamp(44px,5vw,72px)] leading-[1.02] tracking-[-0.015em] text-foreground">Verify a token.</h1>
            <p className="mt-6 max-w-[62ch] text-[17px] leading-[1.55] text-foreground/70">
              Read a token contract, pool address or Basename against Coinbase's published list and the current Base snapshot.
            </p>
          </div>
        </Reveal>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 lg:py-16 xl:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-8 lg:col-start-3">
            
            <section className="flex flex-col gap-6">
              <p className="font-mono text-[11px] text-foreground/58">01 &middot; Input</p>
              <Reveal as="div">
                <form onSubmit={submit} className="flex w-full border border-foreground/30 transition-colors duration-300 focus-within:border-foreground" data-testid="form-check">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Address, ticker or Basename"
                    aria-label="Address, ticker or Basename"
                    className="h-14 min-w-0 flex-1 bg-transparent px-4 font-mono text-[13px] text-foreground focus:outline-none sm:px-5 sm:text-[14px]"
                    data-testid="input-check"
                  />
                  <button type="submit" className="h-14 border-l border-foreground/30 bg-foreground px-6 font-mono text-[13px] text-background hover-quiet hover:bg-foreground/90 sm:px-8" data-testid="button-check">
                    Verify
                  </button>
                </form>
              </Reveal>
              
              {!requested && examples.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11px] text-foreground/58 mt-2" data-testid="check-examples">
                  <span>Try a live token:</span>
                  {examples.map((s) => (
                    <Link key={s.ticker} href={`/check?q=${s.ticker}`} className="text-foreground underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">
                      {s.ticker}
                    </Link>
                  ))}
                </div>
              )}
              {isLoading && (
                <p className="font-mono text-[11px] text-foreground/58 mt-2 animate-pulse">reading the contract and current snapshot</p>
              )}
              {error && !isLoading && (
                <div className="mt-2 border-l border-dev-dislocated pl-4" data-testid="check-error">
                  <p className="font-mono text-[11px] text-dev-dislocated">failed</p>
                  <p className="mt-2 break-words font-mono text-[13px] leading-[1.65] text-foreground/75">{apiErrorMessage(error)}</p>
                </div>
              )}
            </section>

            <section className="mt-14 flex flex-col gap-6 sm:mt-20">
              <p className="font-mono text-[11px] text-foreground/58">02 &middot; Verdict</p>
              {result ? (
                <Reveal as="div" className="stage-field border border-foreground/20 p-8 sm:p-12" data-testid="check-result">
                  <p className={cn("font-mono text-[12px]", result.verdict === "danger" ? "text-dev-dislocated" : result.verdict === "caution" ? "text-dev-elevated" : "text-foreground/60")}>
                    {VERDICT_WORD[result.verdict]} &middot; {KIND_WORD[result.kind] ?? result.kind}
                  </p>
                  {error ? <p className="mt-3 font-mono text-[11.5px] text-dev-dislocated">The latest read failed. This verdict is from the last successful read: {apiErrorMessage(error)}</p> : null}
                  <h2 className="mt-6 font-display text-[clamp(32px,4vw,44px)] leading-[1.05] tracking-[-0.01em] text-foreground">{result.headline}</h2>
                  
                  {result.details.length > 0 && (
                    <ul className="mt-8 space-y-4 text-[16px] leading-[1.6] text-foreground/70">
                      {result.details.map((detail, index) => <li key={index} className="break-words">{detail}</li>)}
                    </ul>
                  )}
                  
                  <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11.5px]">
                    {result.stockTicker && <Link href={`/readings?t=${result.stockTicker}`} className="group text-foreground underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">Read instrument <Arrow /></Link>}
                    {result.kind === "not-found" && (result.input.startsWith("0x") || result.input.includes(".")) && <Link href={`/portfolio/${encodeURIComponent(result.input)}`} className="group text-foreground underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">Read holdings <Arrow /></Link>}
                  </div>
                </Reveal>
              ) : (
                <div className={cn("stage-field flex h-32 items-center justify-center border border-foreground/10", error ? "opacity-70" : "opacity-30")}>
                  <p className={cn("font-mono text-[11px]", error ? "text-dev-dislocated" : "text-foreground/58")}>{error && !isLoading ? "no verdict, the read failed" : isLoading ? "reading" : "waiting for query"}</p>
                </div>
              )}
            </section>

            <section className="mt-14 flex flex-col gap-6 sm:mt-20">
              <p className="font-mono text-[11px] text-foreground/58">03 &middot; Evidence</p>
              {result && !hasEvidence ? (
                <div className="stage-field flex h-24 items-center justify-center border border-foreground/10 opacity-70">
                  <p className="font-mono text-[11px] text-foreground/58">no token or pool evidence for this query</p>
                </div>
              ) : result ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setEvidenceOpen(!evidenceOpen)}
                    aria-expanded={evidenceOpen}
                    aria-controls="check-evidence"
                    className="flex w-full items-center justify-between border border-foreground/20 px-6 py-4 font-mono text-[12px] text-foreground hover-quiet hover:bg-foreground/[0.035]"
                    data-testid="button-evidence"
                  >
                    <span>{evidenceOpen ? "Hide evidence" : "Show evidence"}{result.checks.length > 0 ? `, ${result.checks.length} ${result.checks.length === 1 ? "check" : "checks"}` : ""}</span>
                    <span className="text-foreground/58" aria-hidden>{evidenceOpen ? "−" : "+"}</span>
                  </button>

                  {evidenceOpen && (
                    <div id="check-evidence" className="mt-6 border border-foreground/15 p-6 sm:p-10 flex flex-col gap-16 animate-in fade-in slide-in-from-top-4 duration-300">
                      {result.checks.length > 0 && (
                        <div>
                          <p className="mb-6 font-mono text-[11px] text-foreground/58">Verification checks</p>
                          <ul className="border-t border-foreground/15">
                            {result.checks.map((check) => (
                              <li key={check.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-b border-foreground/15 py-4 sm:grid-cols-[3.5rem_16rem_minmax(0,1fr)] hover-quiet hover:bg-foreground/[0.035]">
                                <span className={cn("font-mono text-[11px]", check.passed === false ? "text-dev-dislocated" : check.passed === true ? "text-foreground" : "text-foreground/52")}>
                                  {check.passed === true ? "pass" : check.passed === false ? "fail" : "n/a"}
                                </span>
                                <span className="text-[14.5px] leading-[1.5] text-foreground/85">{check.label}</span>
                                <span className="col-start-2 break-words font-mono text-[11px] leading-[1.6] text-foreground/60 sm:col-start-auto">{check.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.pool && (
                        <div>
                          <p className="mb-6 font-mono text-[11px] text-foreground/58">Resolved market</p>
                          <div className="grid grid-cols-1 border-t border-foreground/15 sm:grid-cols-3">
                            <Fact label="Reference" value={result.pool.referencePrice == null ? "unavailable" : <Figure value={result.pool.referencePrice} format={formatUsd} />} note={result.pool.matchedTicker ? `${result.pool.matchedTicker} Chainlink reference` : "no matched stock"} />
                            <Fact label="Onchain" value={result.pool.premiumBps == null || result.pool.priceUsd == null ? "unpriced" : <Figure value={result.pool.priceUsd} format={formatUsd} />} note={`${result.pool.dexLabel} \u00B7 ${result.pool.baseToken.symbol}/${result.pool.quoteToken.symbol}${result.pool.premiumBps == null ? " \u00B7 not a USD quote" : ""}`} divided />
                            <Fact label="Premium" value={result.pool.premiumBps == null ? "unpriced" : <Figure value={result.pool.premiumBps} format={formatBps} />} note={`${result.pool.deviationState} \u00B7 liquidity ${formatUsd(result.pool.liquidityUsd, 0)} \u00B7 volume ${formatUsd(result.pool.volume24hUsd, 0)}`} divided blue />
                          </div>
                          <MiniScale bps={result.pool.premiumBps} className="mt-8 max-w-[560px]" />
                          <p className="mt-5 break-all font-mono text-[11px] leading-[1.6] text-foreground/58">
                            pair {result.pool.pairAddress} &middot;{" "}
                            <a href={result.pool.url} target="_blank" rel="noreferrer" className="group text-foreground/75 underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">open pool <Arrow /></a>
                          </p>
                        </div>
                      )}

                      {result.token && (
                        <div>
                          <p className="mb-6 font-mono text-[11px] text-foreground/58">Token fingerprint</p>
                          <dl className="grid grid-cols-1 border-t border-foreground/15 sm:grid-cols-2">
                            <Definition label="Address">
                              <a href={`https://basescan.org/address/${result.token.address}`} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4 hover-quiet hover:text-primary hover:underline-offset-8">{result.token.address}</a>
                            </Definition>
                            <Definition label="Name / symbol">{result.token.name || "no name"} / {result.token.symbol || "no symbol"}</Definition>
                            <Definition label="Coinbase list">{result.token.matchedTicker ? `matched \u00B7 ${result.token.matchedTicker}` : "not matched"}</Definition>
                            <Definition label="B20 prefix">{result.token.prefixLooksOfficial ? "yes \u00B7 0xB200\u2026" : "no"}</Definition>
                            <Definition label="Token kind">{result.token.isB20 ? "B20 token" : "standard ERC-20"}</Definition>
                            <Definition label="Supply">{result.token.totalSupply == null ? "unavailable" : formatNumber(result.token.totalSupply, 4)}</Definition>
                            <Definition label="Decimals">{result.token.decimals == null ? "unavailable" : String(result.token.decimals)}</Definition>
                            <Definition label="Resembles ticker">{result.token.resemblesTicker ?? "none detected"}</Definition>
                          </dl>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn("stage-field flex h-24 items-center justify-center border border-foreground/10", error ? "opacity-70" : "opacity-30")}>
                  <p className={cn("font-mono text-[11px]", error ? "text-dev-dislocated" : "text-foreground/58")}>{error && !isLoading ? "no evidence, the read failed" : isLoading ? "reading" : "waiting for query"}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Fact({ label, value, note, divided, blue }: { label: string; value: React.ReactNode; note: string; divided?: boolean; blue?: boolean }) {
  return (
    <div className={cn("border-b border-foreground/15 py-6 sm:border-b-0 sm:pr-6", divided && "sm:border-l sm:pl-6")}>
      <p className="font-mono text-[10.5px] text-foreground/52">{label}</p>
      <p className={cn("mt-3 font-mono text-[clamp(20px,2vw,30px)] leading-none tnum", blue ? "text-primary" : "text-foreground")}>{value}</p>
      <p className="mt-4 font-mono text-[11px] leading-[1.55] text-foreground/58">{note}</p>
    </div>
  );
}

function Definition({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-foreground/15 py-4 sm:odd:pr-8 sm:even:border-l sm:even:pl-8">
      <dt className="font-mono text-[10.5px] text-foreground/52">{label}</dt>
      <dd className="mt-2 break-words font-mono text-[12.5px] leading-[1.6] text-foreground/80">{children}</dd>
    </div>
  );
}
