import { useMemo, useState } from "react";
import { snapshot } from "./_shared/snapshot";

type Stock = (typeof snapshot.stocks)[number];

const money = (value: number | null, precision = 2) =>
  value === null ? "—" : `$${value.toLocaleString("en-US", { minimumFractionDigits: precision, maximumFractionDigits: precision })}`;

function Mark() {
  return (
    <span className="lm-mark" aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

function State({ state }: { state: Stock["state"] }) {
  const label = state === "fair" ? "Fair" : state === "elevated" ? "Elevated" : state === "dislocated" ? "Dislocated" : "Unpriced";
  return <span className={`lm-state ${state}`}><b />{label}</span>;
}

function PriceChart() {
  const points = useMemo(() => {
    const history = snapshot.nvdaHistory;
    const min = Math.min(...history.map((d) => d.pool)) - 0.08;
    const max = Math.max(...history.map((d) => d.pool)) + 0.08;
    return history.map((d, i) => `${(i / (history.length - 1)) * 100},${91 - ((d.pool - min) / (max - min)) * 68}`).join(" ");
  }, []);
  return (
    <div className="lm-chart">
      <div className="lm-gridline g1" /><div className="lm-gridline g2" /><div className="lm-gridline g3" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="NVDAc pool price history">
        <line x1="0" x2="100" y1="58.5" y2="58.5" className="reference" />
        <polyline points={points} className="pool" />
      </svg>
      <div className="lm-chart-key"><span><i className="ref" />Reference</span><span><i className="pool-dot" />Onchain</span></div>
    </div>
  );
}

export function BaseBlue() {
  const [selected, setSelected] = useState<Stock>(snapshot.stocks[0]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const selectedIsNvda = selected.ticker === "NVDAc";
  const visibleStocks = snapshot.stocks.filter((stock) => stock.ticker.toLowerCase().includes(query.toLowerCase()) || stock.address.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="lumen-blue">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" />
      <style>{`
        .lumen-blue{--blue:#2151d6;--ink:#132042;--paper:#f8f8f5;--line:#d6dcf0;--muted:#68728e;--coral:#e56a58;--amber:#b8750d;font-family:Manrope,sans-serif;background:var(--paper);color:var(--ink);min-height:100dvh;letter-spacing:-.025em}
        .lumen-blue *{box-sizing:border-box}.lumen-blue button,.lumen-blue input{font:inherit}.lumen-blue button{cursor:pointer}
        .lm-blue-hero{background:var(--blue);color:#fff;padding:0 44px 72px;position:relative;overflow:hidden}.lm-blue-hero:after{content:"";position:absolute;width:520px;height:520px;border:1px solid rgba(255,255,255,.14);border-radius:50%;right:-150px;top:146px}
        .lm-nav{height:78px;max-width:1190px;margin:auto;display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,.26);position:relative;z-index:1}.lm-logo{font-size:21px;font-weight:800;letter-spacing:-.065em;display:flex;gap:10px;align-items:center}.lm-mark{display:inline-flex;width:22px;height:20px;align-items:end;gap:2px}.lm-mark i{display:block;background:currentColor;width:5px}.lm-mark i:nth-child(1){height:9px}.lm-mark i:nth-child(2){height:17px}.lm-mark i:nth-child(3){height:13px}
        .lm-navlinks{display:flex;gap:27px;margin-left:70px}.lm-navlinks button{color:rgba(255,255,255,.7);padding:7px 0;border:0;background:none;font-size:13px}.lm-navlinks button:first-child{color:#fff;border-bottom:1px solid #fff}.lm-nav-right{margin-left:auto;font-size:12px;display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.72)}.lm-pulse{width:7px;height:7px;background:#aee7d1;border-radius:50%}
        .lm-hero-inner{max-width:1190px;margin:0 auto;display:grid;grid-template-columns:42% 58%;gap:38px;padding-top:64px;position:relative;z-index:1}.lm-eyebrow{font-size:12px;font-weight:700;letter-spacing:.02em;margin-bottom:24px;color:#bfcdfc}.lm-hero-copy h1{font-family:Newsreader,serif;font-size:59px;line-height:.99;font-weight:500;letter-spacing:-.055em;margin:0;max-width:450px}.lm-hero-copy p{font-size:15px;line-height:1.65;max-width:386px;color:#d8e0ff;margin:27px 0}.lm-verify-link{background:#fff;color:var(--blue);border:0;padding:13px 16px;font-size:13px;font-weight:800;transition:transform .2s}.lm-verify-link:hover{transform:translateY(-2px)}.lm-data-note{font-family:"DM Mono",monospace;font-size:10px;color:#b7c8ff;margin-top:40px;line-height:1.7}
        .lm-feature{background:#fff;color:var(--ink);box-shadow:0 17px 0 rgba(12,38,117,.12);min-width:0}.lm-feature-head{display:flex;justify-content:space-between;align-items:center;padding:20px 23px 18px;border-bottom:1px solid var(--line)}.lm-feature-name{display:flex;gap:11px;align-items:center}.lm-token-square{width:29px;height:29px;background:#182d6d;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800}.lm-feature-title{font-size:15px;font-weight:800}.lm-feature-sub{font-size:11px;color:var(--muted);margin-top:2px}.lm-live{font-family:"DM Mono",monospace;font-size:10px;color:#3d8c66}
        .lm-figures{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid var(--line)}.lm-figure{padding:19px 22px 17px;border-right:1px solid var(--line)}.lm-figure:last-child{border:0}.lm-figure label,.lm-section-label{display:block;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.035em;margin-bottom:9px}.lm-number{font-family:"DM Mono",monospace;font-size:20px;letter-spacing:-.07em;font-weight:500}.lm-number.gap{color:var(--amber)}.lm-chart{height:142px;margin:16px 22px 19px;position:relative;overflow:hidden}.lm-chart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.lm-chart .reference{stroke:#a3acc1;stroke-width:.75;stroke-dasharray:1.5 1.5}.lm-chart .pool{fill:none;stroke:#2151d6;stroke-width:1.7;vector-effect:non-scaling-stroke}.lm-gridline{position:absolute;left:0;right:0;border-top:1px solid #edf0f7}.g1{top:26%}.g2{top:56%}.g3{top:86%}.lm-chart-key{position:absolute;bottom:0;right:0;display:flex;gap:13px;font-size:10px;color:var(--muted)}.lm-chart-key span{display:flex;gap:5px;align-items:center}.lm-chart-key i{width:12px;border-top:1px solid #a3acc1}.lm-chart-key .pool-dot{border-top:2px solid #2151d6}
        .lm-tape{max-width:1190px;margin:0 auto;padding:65px 44px 92px}.lm-tape-top{display:flex;justify-content:space-between;align-items:end;margin-bottom:18px}.lm-tape-title{font-family:Newsreader,serif;font-size:31px;font-weight:500;letter-spacing:-.045em;margin:0}.lm-tape-detail{font-family:"DM Mono",monospace;font-size:10px;color:var(--muted)}.lm-market-table{border-top:2px solid var(--ink);border-bottom:1px solid var(--line)}.lm-table-head,.lm-token-row{display:grid;grid-template-columns:1.35fr 1fr 1fr .8fr .8fr;align-items:center}.lm-table-head{min-height:37px;color:var(--muted);font-size:10px;font-weight:700;border-bottom:1px solid var(--line)}.lm-token-row{min-height:51px;border-bottom:1px solid var(--line);font-size:12px;transition:background .18s}.lm-token-row:last-child{border:0}.lm-token-row:hover,.lm-token-row.active{background:#eaf0ff}.lm-token-row button{background:none;border:0;text-align:left;color:inherit;padding:0;font-weight:800;font-size:12px}.lm-token-row>*,.lm-table-head>*{padding:0 12px}.lm-token-row> :first-child,.lm-table-head> :first-child{padding-left:0}.lm-token-name{color:var(--muted);font-size:11px;font-weight:500;margin-left:9px}.lm-table-num{font-family:"DM Mono",monospace;font-size:11px;letter-spacing:-.045em}.lm-state{font-size:11px;display:inline-flex;align-items:center;gap:6px;font-weight:700}.lm-state b{width:6px;height:6px;border-radius:50%;background:#50866e}.lm-state.elevated{color:#997020}.lm-state.elevated b{background:#d59c29}.lm-state.dislocated{color:#bd5b4b}.lm-state.dislocated b{background:var(--coral)}.lm-state.unpriced{color:#7a8192}.lm-state.unpriced b{background:#a6adbd}
        .lm-verify-strip{background:#e4ebff;border-top:1px solid #cbd6f7;padding:37px 44px}.lm-verify-inner{max-width:1102px;margin:auto;display:grid;grid-template-columns:1fr 1.8fr;align-items:center;gap:45px}.lm-verify-title{font-family:Newsreader,serif;font-size:29px;line-height:1.05;margin:0;font-weight:500}.lm-verify-form{display:flex;border-bottom:1px solid #8ba1df;padding-bottom:9px}.lm-verify-form input{flex:1;background:transparent;border:0;outline:0;font-size:13px;color:var(--ink)}.lm-verify-form input::placeholder{color:#7382ad}.lm-verify-form button{background:var(--blue);color:#fff;border:0;padding:9px 14px;font-size:12px;font-weight:800}.lm-notice{font-size:11px;color:#365e4e;margin-top:8px;height:13px}
        @media(max-width:800px){.lm-blue-hero{padding:0 20px 42px}.lm-navlinks{display:none}.lm-hero-inner{grid-template-columns:1fr;padding-top:40px;gap:36px}.lm-hero-copy h1{font-size:48px}.lm-tape{padding:45px 20px}.lm-table-head,.lm-token-row{grid-template-columns:1.2fr 1fr .8fr}.lm-table-head>*:nth-child(3),.lm-token-row>*:nth-child(3),.lm-table-head>*:nth-child(4),.lm-token-row>*:nth-child(4){display:none}.lm-verify-strip{padding:30px 20px}.lm-verify-inner{grid-template-columns:1fr;gap:20px}.lm-figures{grid-template-columns:1fr}.lm-figure{border-right:0;border-bottom:1px solid var(--line)}.lm-feature{margin-right:0}.lm-hero-copy p{margin-bottom:22px}}
      `}</style>
      <section className="lm-blue-hero">
        <nav className="lm-nav">
          <div className="lm-logo"><Mark />LumenMarc</div>
          <div className="lm-navlinks"><button>Tape</button><button onClick={() => document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" })}>Verify</button><button>Portfolio</button><button>About</button></div>
          <div className="lm-nav-right"><span className="lm-pulse" />Snapshot ready</div>
        </nav>
        <div className="lm-hero-inner">
          <div className="lm-hero-copy">
            <div className="lm-eyebrow">Market integrity for tokenized stocks on Base</div>
            <h1>Know where the price stands.</h1>
            <p>Reference feeds and executable pool prices, read directly from the chain and placed side by side.</p>
            <button className="lm-verify-link" onClick={() => document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" })}>Verify a token or pool</button>
            <div className="lm-data-note">BLOCK {snapshot.blockNumber.toLocaleString("en-US")} &nbsp;·&nbsp; {snapshot.capturedAtUtc.replace("T", " ").slice(0, 16)} UTC<br />{snapshot.market.reason}. All reference feeds are held at Friday&apos;s last print.</div>
          </div>
          <article className="lm-feature">
            <div className="lm-feature-head"><div className="lm-feature-name"><div className="lm-token-square">NV</div><div><div className="lm-feature-title">NVDAc</div><div className="lm-feature-sub">NVIDIA Corporation · {snapshot.stocks[0].venue}</div></div></div><span className="lm-live">Onchain</span></div>
            <div className="lm-figures"><div className="lm-figure"><label>Reference price</label><div className="lm-number">{money(snapshot.stocks[0].referencePrice, 4)}</div></div><div className="lm-figure"><label>Pool price</label><div className="lm-number">{money(snapshot.stocks[0].onchainPrice, 3)}</div></div><div className="lm-figure"><label>Gap</label><div className="lm-number gap">{snapshot.stocks[0].premiumBps} bps</div></div></div>
            <PriceChart />
          </article>
        </div>
      </section>
      <section className="lm-tape">
        <div className="lm-tape-top"><div><span className="lm-section-label">The tape</span><h2 className="lm-tape-title">Thirteen instruments, one view.</h2></div><span className="lm-tape-detail">{snapshot.tokensTotal} tokens · all feeds held</span></div>
        <div className="lm-market-table">
          <div className="lm-table-head"><span>Instrument</span><span>Reference</span><span>Onchain</span><span>Gap</span><span>State</span></div>
          {snapshot.stocks.map((stock) => <div className={`lm-token-row ${selected.ticker === stock.ticker ? "active" : ""}`} key={stock.ticker}><button onClick={() => setSelected(stock)}>{stock.ticker}<span className="lm-token-name">{stock.underlying}</span></button><span className="lm-table-num">{money(stock.referencePrice, 2)}</span><span className="lm-table-num">{money(stock.onchainPrice, 2)}</span><span className="lm-table-num">{stock.premiumBps === null ? "—" : `${stock.premiumBps > 0 ? "+" : ""}${stock.premiumBps} bps`}</span><State state={stock.state} /></div>)}
        </div>
        {!selectedIsNvda && <div className="lm-data-note" style={{ color: "#68728e", marginTop: 13 }}>Selected {selected.ticker} · reference {money(selected.referencePrice, 2)} · pool {money(selected.onchainPrice, 2)}</div>}
      </section>
      <section className="lm-verify-strip" id="verify"><div className="lm-verify-inner"><div><span className="lm-section-label">Read the source</span><h2 className="lm-verify-title">Verify a token, pool, or wallet.</h2></div><div><form className="lm-verify-form" onSubmit={(e) => { e.preventDefault(); setNotice(visibleStocks.length ? `${visibleStocks[0].ticker} is in the current snapshot.` : "No current snapshot match. Enter a token symbol or contract address."); }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Token symbol or Base address" aria-label="Token symbol or Base address" /><button type="submit">Check snapshot</button></form><div className="lm-notice">{notice}</div></div></div></section>
    </main>
  );
}