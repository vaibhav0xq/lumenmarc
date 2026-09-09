import { useMemo, useState } from "react";
import { snapshot } from "./_shared/snapshot";

type Stock = (typeof snapshot.stocks)[number];

const money = (value: number | null, digits = 2) =>
  value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

function Mark() {
  return (
    <span className="lm-mark" aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

function State({ stock }: { stock: Stock }) {
  const label = stock.state === "unpriced" ? (stock.status === "no-supply" ? "no supply" : "unpriced") : stock.state;
  return <span className={`lm-state ${stock.state}`}>{label}</span>;
}

function Chart({ stock }: { stock: Stock }) {
  const history = snapshot.nvdaHistory;
  const points = useMemo(() => {
    const pools = history.map((point) => point.pool);
    const min = Math.min(...pools) - 0.08;
    const max = Math.max(...pools) + 0.08;
    return history.map((point, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 90 - ((point.pool - min) / (max - min)) * 68;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
  }, [history]);

  return (
    <div className="lm-chart">
      <div className="lm-chart-head">
        <span>One-minute reads</span>
        <span>USDC · {stock.venue}</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="NVDAc onchain price history">
        <line x1="0" y1="55" x2="100" y2="55" className="reference" />
        <polyline points={points} className="pool-line" />
      </svg>
      <div className="lm-chart-legend"><span><b className="line-ref" />Reference {money(stock.referencePrice, 4)}</span><span><b className="line-pool" />Pool</span></div>
    </div>
  );
}

export function NightDesk() {
  const [selected, setSelected] = useState<Stock>(snapshot.stocks.find((stock) => stock.ticker === "NVDAc")!);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const shown = snapshot.stocks.filter((stock) => stock.ticker.toLowerCase().includes(query.toLowerCase()) || stock.address.toLowerCase().includes(query.toLowerCase()));
  const selectedIsNvda = selected.ticker === "NVDAc";

  const submitVerify = (event: React.FormEvent) => {
    event.preventDefault();
    const match = snapshot.stocks.find((stock) => stock.ticker.toLowerCase() === query.trim().toLowerCase() || stock.address.toLowerCase() === query.trim().toLowerCase());
    if (match) {
      setSelected(match);
      setNotice(`${match.ticker} is selected below.`);
    } else {
      setNotice(query.trim() ? "No token in this snapshot matches that entry." : "Enter a token symbol, pool, or wallet address.");
    }
  };

  return (
    <main className="nightdesk">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" />
      <style>{`
        .nightdesk{--ink:#e9e7de;--quiet:#969996;--faint:#4b4d4d;--rule:#303232;--ground:#171918;--paper:#1e201f;--warm:#d9d5c8;--orange:#d9915c;--sage:#aabf99;--rose:#d28276;min-height:100dvh;background:var(--ground);color:var(--ink);font-family:Manrope,sans-serif;letter-spacing:-.018em;overflow:hidden}
        .nightdesk *{box-sizing:border-box}.lm-shell{max-width:1196px;margin:auto;padding:0 32px}.lm-nav{height:78px;display:flex;align-items:center;border-bottom:1px solid var(--rule);justify-content:space-between}.lm-brand{display:flex;align-items:center;gap:11px;color:var(--ink);font-size:16px;font-weight:700;letter-spacing:-.06em}.lm-mark{display:inline-flex;gap:2px;width:17px;height:20px;align-items:flex-end}.lm-mark i{display:block;width:4px;background:var(--warm)}.lm-mark i:nth-child(1){height:9px}.lm-mark i:nth-child(2){height:17px}.lm-mark i:nth-child(3){height:13px}.lm-links{display:flex;gap:27px;margin-left:80px}.lm-links button,.lm-quiet-button{color:var(--quiet);background:none;border:0;font:500 13px Manrope,sans-serif;padding:6px 0;cursor:pointer}.lm-links button:first-child{color:var(--ink);border-bottom:1px solid var(--warm)}.lm-quiet-button{color:var(--ink);border-bottom:1px solid var(--faint)}.lm-kicker{color:var(--quiet);font:12px "DM Mono",monospace;letter-spacing:0;margin:32px 0 17px}.lm-hero{display:grid;grid-template-columns:5fr 3fr;gap:80px;padding:0 0 32px;border-bottom:1px solid var(--rule)}.lm-title{font:500 clamp(43px,5vw,68px)/.99 Newsreader,serif;letter-spacing:-.045em;max-width:635px;margin:0}.lm-title em{font-style:normal;color:var(--warm)}.lm-intro{align-self:end;font-size:14px;line-height:1.7;color:#bcbdb7;max-width:350px;margin-bottom:4px}.lm-callout{display:flex;align-items:center;gap:9px;margin-top:23px;color:var(--quiet);font-size:12px}.lm-callout i{height:6px;width:6px;background:var(--orange);display:block}.lm-feature{display:grid;grid-template-columns:1.07fr .93fr;border-bottom:1px solid var(--rule);min-height:339px}.lm-number{padding:29px 34px 27px 0;border-right:1px solid var(--rule)}.lm-overline,.lm-label,.lm-table-heading{font:11px "DM Mono",monospace;letter-spacing:0;color:var(--quiet)}.lm-overline{display:flex;justify-content:space-between}.lm-symbol{font:600 28px Newsreader,serif;color:var(--ink);margin:6px 0 24px}.lm-bps{font:500 100px/.8 Newsreader,serif;letter-spacing:-.075em;color:var(--orange)}.lm-bps small{font:12px "DM Mono",monospace;color:var(--orange);vertical-align:middle;margin-left:8px;letter-spacing:0}.lm-state{font:11px "DM Mono",monospace;letter-spacing:0}.lm-state.fair{color:var(--sage)}.lm-state.elevated{color:var(--orange)}.lm-state.dislocated{color:var(--rose)}.lm-state.unpriced{color:var(--quiet)}.lm-feature-meta{padding:29px 0 0 34px}.lm-price-row{display:grid;grid-template-columns:1fr auto;gap:10px;border-bottom:1px solid var(--rule);padding:0 0 18px;margin-bottom:17px}.lm-price-row strong{font:500 23px Newsreader,serif;letter-spacing:-.04em}.lm-price-row span:last-child{color:var(--quiet);font:12px "DM Mono",monospace}.lm-chart{margin-top:25px}.lm-chart-head,.lm-chart-legend{display:flex;justify-content:space-between;color:var(--quiet);font:10px "DM Mono",monospace;letter-spacing:0}.lm-chart svg{height:104px;width:100%;margin:6px 0}.lm-chart .reference{stroke:#5f615d;stroke-width:.7;stroke-dasharray:2 2}.lm-chart .pool-line{fill:none;stroke:var(--orange);stroke-width:1.2;vector-effect:non-scaling-stroke}.lm-chart-legend{justify-content:flex-start;gap:17px}.lm-chart-legend b{display:inline-block;width:12px;margin-right:5px;vertical-align:middle}.line-ref{border-top:1px dashed #737570}.line-pool{border-top:1px solid var(--orange)}.lm-tape{padding:26px 0 60px}.lm-tape-top{display:flex;justify-content:space-between;align-items:end;margin-bottom:19px}.lm-section-title{font:500 25px Newsreader,serif;letter-spacing:-.035em;margin:0}.lm-snapshot{font:11px "DM Mono",monospace;color:var(--quiet);letter-spacing:0}.lm-table{width:100%;border-collapse:collapse}.lm-table th{text-align:left;padding:0 10px 11px 0;font-weight:400;border-bottom:1px solid var(--rule)}.lm-table th:not(:first-child),.lm-table td:not(:first-child){text-align:right}.lm-table td{height:37px;border-bottom:1px solid #282a29;font:12px "DM Mono",monospace;letter-spacing:0;color:#c9c9c2}.lm-table td:first-child{font:600 14px Manrope,sans-serif;letter-spacing:-.03em;color:var(--ink);text-align:left}.lm-table tr{cursor:pointer;transition:background .18s ease}.lm-table tr:hover,.lm-table tr.active{background:#242624}.lm-table tr:hover td:first-child,.lm-table tr.active td:first-child{padding-left:10px}.lm-table td:first-child{transition:padding .18s ease}.lm-table td:last-child{padding-right:10px}.lm-verify{background:var(--paper);border-top:1px solid var(--rule);padding:31px 0 35px}.lm-verify-inner{display:grid;grid-template-columns:1fr 1.1fr;gap:80px;align-items:end}.lm-verify h2{font:500 31px/1 Newsreader,serif;letter-spacing:-.04em;margin:4px 0 0}.lm-verify p{color:var(--quiet);font-size:12px;line-height:1.55;margin:11px 0 0}.lm-form{display:grid;grid-template-columns:1fr auto;gap:8px}.lm-form input{min-width:0;background:#191b1a;border:1px solid var(--faint);border-radius:0;color:var(--ink);padding:13px;font:12px "DM Mono",monospace;outline:none}.lm-form input:focus{border-color:#83847b}.lm-form button{background:var(--warm);color:#20211f;border:0;padding:0 17px;font:600 12px Manrope,sans-serif;cursor:pointer}.lm-notice{min-height:19px;margin:8px 0 0;color:var(--quiet);font-size:11px}
        @media(max-width:700px){.lm-shell{padding:0 18px}.lm-links{display:none}.lm-hero,.lm-verify-inner{grid-template-columns:1fr;gap:24px}.lm-hero{padding-bottom:27px}.lm-title{font-size:48px}.lm-feature{grid-template-columns:1fr}.lm-number{border-right:0;padding-right:0}.lm-feature-meta{border-top:1px solid var(--rule);padding:22px 0}.lm-bps{font-size:82px}.lm-table th:nth-child(3),.lm-table td:nth-child(3){display:none}.lm-table{min-width:520px}.lm-tape{overflow-x:auto}.lm-verify-inner{gap:22px}.lm-nav{height:65px}}
      `}</style>
      <div className="lm-shell">
        <nav className="lm-nav">
          <div className="lm-brand"><Mark /> LumenMarc</div>
          <div className="lm-links"><button type="button">Tape</button><button type="button">Verify</button><button type="button">Portfolio</button><button type="button">About</button></div>
          <button className="lm-quiet-button" type="button" onClick={() => document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" })}>Verify a token</button>
        </nav>
        <section className="lm-hero">
          <div><p className="lm-kicker">Tokenized equities on Base · Market integrity</p><h1 className="lm-title">The price onchain.<br /><em>In plain view.</em></h1></div>
          <div className="lm-intro">LumenMarc reads the Chainlink reference and the quoted pool price, then puts the difference on one disciplined tape.<div className="lm-callout"><i />Feeds held at Friday’s last print. US market closed for Labor Day.</div></div>
        </section>
        <section className="lm-feature">
          <div className="lm-number"><div className="lm-overline"><span>Featured read</span><State stock={selected} /></div><div className="lm-symbol">{selected.ticker} <span className="lm-label">/ {selected.underlying}</span></div><div className="lm-bps">{selected.premiumBps === null ? "—" : `${selected.premiumBps > 0 ? "+" : ""}${selected.premiumBps}`}<small>{selected.premiumBps === null ? "not USD quoted" : "basis points"}</small></div></div>
          <div className="lm-feature-meta">
            <div className="lm-price-row"><div><span className="lm-label">Reference</span><br /><strong>{money(selected.referencePrice, 4)}</strong></div><span>Chainlink<br />held</span></div>
            <div className="lm-price-row"><div><span className="lm-label">Onchain</span><br /><strong>{money(selected.onchainPrice, selected.ticker === "NVDAc" ? 3 : 2)}</strong></div><span>{selected.venue ?? "—"}<br />{selected.quote ?? "no quote"}</span></div>
            {selectedIsNvda ? <Chart stock={selected} /> : <p className="lm-intro">Select NVDAc on the tape to inspect its captured one-minute history.</p>}
          </div>
        </section>
        <section className="lm-tape">
          <div className="lm-tape-top"><h2 className="lm-section-title">The tape</h2><div className="lm-snapshot">Base block {snapshot.blockNumber.toLocaleString()} · captured 17:03 ET</div></div>
          <table className="lm-table"><thead><tr><th className="lm-table-heading">Token</th><th className="lm-table-heading">Reference</th><th className="lm-table-heading">Onchain</th><th className="lm-table-heading">Gap</th><th className="lm-table-heading">Read</th></tr></thead><tbody>{shown.map((stock) => <tr key={stock.ticker} className={selected.ticker === stock.ticker ? "active" : ""} onClick={() => setSelected(stock)}><td>{stock.ticker}</td><td>{money(stock.referencePrice, 2)}</td><td>{stock.onchainPrice === null ? "—" : stock.quote === "USDC" ? money(stock.onchainPrice, 2) : `${stock.onchainPrice} ${stock.quote}`}</td><td>{stock.premiumBps === null ? "—" : `${stock.premiumBps > 0 ? "+" : ""}${stock.premiumBps} bps`}</td><td><State stock={stock} /></td></tr>)}</tbody></table>
        </section>
      </div>
      <section className="lm-verify" id="verify"><div className="lm-shell lm-verify-inner"><div><span className="lm-overline">Read-only verification</span><h2>Verify a token, pool,<br />or wallet.</h2><p>Informational only. Nothing here is investment advice.</p></div><form onSubmit={submitVerify}><div className="lm-form"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Token symbol or Base address" aria-label="Token symbol or Base address" /><button type="submit">Inspect</button></div><div className="lm-notice" aria-live="polite">{notice}</div></form></div></section>
    </main>
  );
}