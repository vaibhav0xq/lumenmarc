import { FormEvent, useMemo, useState } from "react";
import { snapshot } from "./_shared/snapshot";

type Stock = (typeof snapshot.stocks)[number];

const money = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

const stateLabel = (stock: Stock) => {
  if (stock.state === "unpriced") return stock.status === "no-supply" ? "No supply" : "Unpriced";
  return stock.state.charAt(0).toUpperCase() + stock.state.slice(1);
};

function Mark() {
  return (
    <span className="lm-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Sparkline() {
  const points = useMemo(() => {
    const data = snapshot.nvdaHistory;
    const min = Math.min(...data.map((d) => d.pool));
    const max = Math.max(...data.map((d) => d.pool));
    return data
      .map((d, index) => {
        const x = (index / (data.length - 1)) * 520;
        const y = 76 - ((d.pool - min) / (max - min || 1)) * 54;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, []);

  return (
    <svg className="lm-chart" viewBox="0 0 520 92" preserveAspectRatio="none" role="img" aria-label="NVDAc onchain price history">
      <line x1="0" y1="47" x2="520" y2="47" className="lm-ref-line" />
      <polyline points={points} className="lm-pool-line" />
    </svg>
  );
}

export function Prospectus() {
  const [selectedTicker, setSelectedTicker] = useState("NVDAc");
  const [query, setQuery] = useState("");
  const [verified, setVerified] = useState(false);
  const selected = snapshot.stocks.find((stock) => stock.ticker === selectedTicker) ?? snapshot.stocks[0];
  const nvda = snapshot.stocks.find((stock) => stock.ticker === "NVDAc") ?? snapshot.stocks[0];

  const submitVerify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerified(Boolean(query.trim()));
  };

  return (
    <main className="lm-page">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Libre+Baskerville:wght@400;700&display=swap" />
      <style>{`
        .lm-page { --ink:#172421; --muted:#5d6863; --line:#cfd5cb; --paper:#f3f1e9; --paper-deep:#e9e7dc; --jade:#2e6b58; --ochre:#b26e22; --rust:#9a4335; min-height:100dvh; background:var(--paper); color:var(--ink); font-family:"DM Sans", sans-serif; letter-spacing:-.012em; }
        .lm-page * { box-sizing:border-box; } .lm-page button,.lm-page input { font:inherit; } .lm-page button { cursor:pointer; }
        .lm-shell { max-width:1184px; margin:0 auto; padding:0 28px; }
        .lm-nav { height:76px; border-bottom:1px solid var(--ink); display:flex; align-items:center; justify-content:space-between; gap:24px; }
        .lm-brand { display:flex; align-items:center; gap:10px; color:var(--ink); font-family:"Libre Baskerville",serif; font-size:18px; letter-spacing:-.045em; }
        .lm-mark { display:flex; align-items:flex-end; gap:2px; width:18px; height:20px; padding-bottom:1px; } .lm-mark i { width:4px; background:var(--jade); display:block; } .lm-mark i:nth-child(1){height:8px}.lm-mark i:nth-child(2){height:14px}.lm-mark i:nth-child(3){height:19px}
        .lm-links { display:flex; align-items:center; gap:28px; margin-left:auto; } .lm-links a { color:var(--muted); text-decoration:none; font-size:13px; } .lm-links a:first-child{color:var(--ink)}
        .lm-verify-nav { border:0; background:var(--ink); color:var(--paper); padding:10px 15px; font-size:12px; font-weight:600; }
        .lm-kicker { color:var(--jade); font-size:11px; font-weight:600; letter-spacing:.075em; text-transform:uppercase; }
        .lm-hero { display:grid; grid-template-columns:minmax(0, .92fr) minmax(520px, 1.08fr); gap:70px; padding:69px 0 64px; }
        .lm-intro { padding-top:13px; } .lm-intro h1 { max-width:465px; margin:15px 0 26px; font-family:"Libre Baskerville",serif; font-size:47px; line-height:1.14; letter-spacing:-.055em; font-weight:400; } .lm-intro p { max-width:405px; margin:0; color:var(--muted); font-size:16px; line-height:1.55; }
        .lm-method { border-top:1px solid var(--line); margin-top:44px; padding-top:17px; display:grid; grid-template-columns:62px 1fr; gap:13px; max-width:425px; color:var(--muted); font-size:12px; line-height:1.5; } .lm-method strong { color:var(--ink); font-weight:600; }
        .lm-terminal { border-top:2px solid var(--ink); border-bottom:1px solid var(--ink); background:#f8f7f0; min-width:0; }
        .lm-panel-head { min-height:54px; padding:15px 18px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); } .lm-panel-title { font-size:13px; font-weight:600; }.lm-updated { color:var(--muted); font-size:11px; }
        .lm-instrument { padding:22px 18px 13px; display:grid; grid-template-columns:1fr auto; align-items:end; } .lm-symbol { font-family:"Libre Baskerville",serif; font-size:30px; letter-spacing:-.055em; } .lm-company { margin-top:3px; color:var(--muted); font-size:12px; }.lm-state { color:var(--ochre); font-size:12px; font-weight:600; }
        .lm-prices { display:grid; grid-template-columns:1fr 1fr 112px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }.lm-price { padding:15px 18px 17px; border-right:1px solid var(--line); }.lm-price:last-child{border-right:0}.lm-price label,.lm-column-head { display:block; color:var(--muted); font-size:10px; letter-spacing:.06em; text-transform:uppercase; }.lm-price b { display:block; margin-top:6px; color:var(--ink); font-family:"DM Mono",monospace; font-size:18px; font-weight:500; letter-spacing:-.06em; }.lm-price.gap b{color:var(--ochre)}
        .lm-chart-box { padding:15px 18px 10px; }.lm-chart-legend { display:flex; gap:16px; color:var(--muted); font-size:10px; }.lm-key { display:inline-flex; align-items:center; gap:5px; }.lm-key:before { content:""; width:14px; border-top:1px solid var(--ink); }.lm-key.ref:before { border-color:#8a9087; border-style:dashed; }.lm-chart { display:block; width:100%; height:86px; margin-top:7px; overflow:visible; }.lm-ref-line { stroke:#969b92; stroke-width:1; stroke-dasharray:3 3; }.lm-pool-line { fill:none; stroke:var(--jade); stroke-width:1.7; vector-effect:non-scaling-stroke; }
        .lm-panel-foot { display:flex; gap:18px; padding:11px 18px 14px; border-top:1px solid var(--line); color:var(--muted); font-size:11px; }.lm-panel-foot span+span:before { content:""; border-left:1px solid var(--line); margin-right:18px; }
        .lm-tape { border-top:1px solid var(--ink); padding:24px 0 85px; }.lm-tape-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:17px; }.lm-tape h2 { margin:0; font-family:"Libre Baskerville",serif; font-size:23px; font-weight:400; letter-spacing:-.04em; }.lm-tape-note { color:var(--muted); font-size:11px; }
        .lm-table { border-top:1px solid var(--ink); }.lm-row { display:grid; grid-template-columns:1.4fr 1fr .8fr .72fr .9fr; align-items:center; min-height:42px; border-bottom:1px solid var(--line); }.lm-header { min-height:30px; color:var(--muted); font-size:10px; letter-spacing:.06em; text-transform:uppercase; }.lm-row:not(.lm-header) { background:transparent; transition:background .18s ease; }.lm-row:not(.lm-header):hover,.lm-row.selected { background:#eae9df; }.lm-row button { appearance:none; border:0; background:none; width:100%; height:100%; padding:0; text-align:left; color:inherit; }.lm-ticker { font-family:"DM Mono",monospace; font-size:13px; font-weight:500; }.lm-name { margin-left:10px; color:var(--muted); font-size:12px; }.lm-value { font-family:"DM Mono",monospace; font-size:12px; letter-spacing:-.04em; }.lm-state-text { font-size:12px; }.fair{color:var(--jade)}.elevated{color:var(--ochre)}.dislocated{color:var(--rust)}.unpriced{color:var(--muted)}
        .lm-verify { display:grid; grid-template-columns:.85fr 1.15fr; gap:52px; border-top:1px solid var(--ink); padding:34px 0 62px; }.lm-verify h2 { margin:0; font-family:"Libre Baskerville",serif; font-size:28px; font-weight:400; letter-spacing:-.045em; }.lm-verify p { max-width:335px; color:var(--muted); font-size:13px; line-height:1.55; }.lm-form { display:flex; border-bottom:1px solid var(--ink); align-items:center; }.lm-form input { min-width:0; width:100%; border:0; background:transparent; outline:0; color:var(--ink); padding:14px 0; font-size:14px; }.lm-form input::placeholder{color:#8b9188}.lm-form button { border:0; background:transparent; color:var(--jade); font-size:12px; font-weight:600; padding:12px 0 12px 14px; white-space:nowrap; }.lm-result { min-height:23px; padding-top:10px; color:var(--muted); font-size:11px; }
        @media(max-width:800px){.lm-shell{padding:0 18px}.lm-links{gap:13px}.lm-links a:nth-child(n+3){display:none}.lm-hero{grid-template-columns:1fr;gap:43px;padding:42px 0}.lm-intro h1{font-size:38px}.lm-terminal{width:100%}.lm-table{overflow-x:auto}.lm-row{min-width:650px}.lm-verify{grid-template-columns:1fr;gap:18px}.lm-price{padding-left:12px;padding-right:12px}.lm-prices{grid-template-columns:1fr 1fr 85px}.lm-price b{font-size:15px}}
      `}</style>
      <div className="lm-shell">
        <nav className="lm-nav" aria-label="Primary navigation">
          <div className="lm-brand"><Mark /> LumenMarc</div>
          <div className="lm-links">
            <a href="#tape">Tape</a><a href="#verify">Verify</a><a href="#portfolio">Portfolio</a><a href="#about">About</a>
          </div>
          <button className="lm-verify-nav" onClick={() => document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" })}>Verify an address</button>
        </nav>

        <section className="lm-hero">
          <div className="lm-intro">
            <div className="lm-kicker">Market integrity, on Base</div>
            <h1>See the price.<br />See the distance.</h1>
            <p>LumenMarc reads the reference feed and the onchain market for tokenized equities, side by side. No synthesis. No recommendation.</p>
            <div className="lm-method"><strong>Read-only.</strong><span>Reference prices are supplied by Chainlink. Pool prices are read from the chain. The interpretation stays with you.</span></div>
          </div>

          <section className="lm-terminal" aria-label="Featured token, NVDAc">
            <div className="lm-panel-head"><span className="lm-panel-title">Current observation</span><span className="lm-updated">Block {snapshot.blockNumber.toLocaleString()}</span></div>
            <div className="lm-instrument"><div><div className="lm-symbol">{nvda.ticker}</div><div className="lm-company">{nvda.name} · {nvda.venue} / {nvda.quote}</div></div><span className="lm-state">Elevated</span></div>
            <div className="lm-prices">
              <div className="lm-price"><label>Reference</label><b>{money(nvda.referencePrice)}</b></div>
              <div className="lm-price"><label>Onchain</label><b>{money(nvda.onchainPrice)}</b></div>
              <div className="lm-price gap"><label>Distance</label><b>{nvda.premiumBps} bps</b></div>
            </div>
            <div className="lm-chart-box"><div className="lm-chart-legend"><span className="lm-key ref">Reference held</span><span className="lm-key">Onchain, per minute</span></div><Sparkline /></div>
            <div className="lm-panel-foot"><span>Snapshot {snapshot.market.localTime}</span><span>{snapshot.market.reason}</span></div>
          </section>
        </section>

        <section className="lm-tape" id="tape">
          <div className="lm-tape-head"><h2>The tape</h2><span className="lm-tape-note">13 instruments · snapshot from block {snapshot.blockNumber.toLocaleString()}</span></div>
          <div className="lm-table" role="table" aria-label="LumenMarc token tape">
            <div className="lm-row lm-header" role="row"><span>Instrument</span><span>Reference</span><span>Onchain</span><span>Distance</span><span>Reading</span></div>
            {snapshot.stocks.map((stock) => (
              <div className={`lm-row ${selectedTicker === stock.ticker ? "selected" : ""}`} role="row" key={stock.ticker}>
                <button onClick={() => setSelectedTicker(stock.ticker)} aria-label={`Select ${stock.ticker}`}><span className="lm-ticker">{stock.ticker}</span><span className="lm-name">{stock.underlying}</span></button>
                <span className="lm-value">{money(stock.referencePrice)}</span><span className="lm-value">{money(stock.onchainPrice)}</span><span className="lm-value">{stock.premiumBps === null ? "—" : `${stock.premiumBps > 0 ? "+" : ""}${stock.premiumBps} bps`}</span><span className={`lm-state-text ${stock.state}`}>{stateLabel(stock)}</span>
              </div>
            ))}
          </div>
          {selectedTicker !== "NVDAc" && <div className="lm-result">Selected: {selected.ticker} · {selected.name} · shown in the tape above.</div>}
        </section>

        <section className="lm-verify" id="verify">
          <div><div className="lm-kicker">Trace a position</div><h2>Verify a token,<br />pool or wallet.</h2><p>Paste an address to inspect what LumenMarc can read. This is an informational lookup, not a transaction.</p></div>
          <div><form className="lm-form" onSubmit={submitVerify}><input value={query} onChange={(event) => { setQuery(event.target.value); setVerified(false); }} placeholder="0x… token, pool or wallet address" aria-label="Token, pool or wallet address" /><button type="submit">Inspect address</button></form><div className="lm-result">{verified ? "Address queued for a read-only lookup." : "Supported: Base token, pool and wallet addresses."}</div></div>
        </section>
      </div>
    </main>
  );
}