// Renders the README header banner from the product theme (fonts, colours and the
// favicon mark come from the app itself, nothing is hand drawn twice).
//
//   node docs/research/tools/readme-banner.mjs
//   node docs/research/tools/shoot-url.mjs file:///tmp/readme-banner.html docs/brand/lumenmarc-readme-banner.png 1200 360 2 1200
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "../../../artifacts/lumenmarc");
const out = process.argv[2] ?? "/tmp/readme-banner.html";

const icon = readFileSync(`${app}/public/favicon.svg`, "utf8").replace(/<rect[^>]*\/>/, "");
const font = (p) => `file://${app}/node_modules/${p}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Newsreader Variable"; src: url("${font("@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2")}") format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Inter Variable"; src: url("${font("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "IBM Plex Mono"; src: url("${font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2")}") format("woff2"); font-weight: 400; }
html,body{margin:0;width:1200px;height:360px;background:#0A0C10;color:#ECE7DA;font-family:"Inter Variable",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.plate{position:relative;width:1200px;height:360px;box-sizing:border-box;padding:44px 56px 40px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(236,231,218,.10)}
.lamp{position:absolute;inset:0;background:
  radial-gradient(ellipse 42% 70% at 14% 0%,rgba(255,245,228,.075),rgba(10,12,16,0) 70%),
  radial-gradient(ellipse 38% 90% at 96% 78%,rgba(77,124,255,.16),rgba(10,12,16,0) 70%)}
.mark{position:absolute;right:-92px;top:-72px;width:384px;height:384px;opacity:.44}
.mark svg{width:384px;height:384px}
.mark::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,12,16,.55),rgba(10,12,16,0) 55%)}
.top{position:relative;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:12px;font-family:"Newsreader Variable",Georgia,serif;font-size:30px;letter-spacing:-.01em}
.brand svg{width:34px;height:34px}
.url{font-family:"IBM Plex Mono",monospace;font-size:14px;color:rgba(236,231,218,.55);letter-spacing:.02em}
h1{position:relative;font-family:"Newsreader Variable",Georgia,serif;font-weight:400;font-size:66px;line-height:1;letter-spacing:-.025em;margin:0;max-width:760px}
h1 .m{color:rgba(236,231,218,.55)}
.foot{position:relative;display:flex;align-items:center;justify-content:space-between;padding-top:18px;border-top:1px solid rgba(236,231,218,.12);font-family:"IBM Plex Mono",monospace;font-size:14px;color:rgba(236,231,218,.6);letter-spacing:.02em}
.foot .live{color:#7BD88F}.foot .live::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#7BD88F;margin-right:8px;vertical-align:middle}
.foot .dot{color:rgba(236,231,218,.3)}
.foot .group{display:flex;align-items:center;gap:22px}
.foot span{white-space:nowrap}
.foot .url{color:rgba(236,231,218,.78)}
</style></head><body><div class="plate">
<div class="lamp"></div>
<div class="mark">${icon}</div>
<div class="top"><div class="brand">${icon}<span>LumenMarc</span></div></div>
<h1>A clear market mark <span class="m">for tokenized stocks.</span></h1>
<div class="foot"><div class="group"><span class="live">Live readings</span><span class="dot">·</span><span>Coinbase Tokenized Stocks on Base</span><span class="dot">·</span><span>Chainlink reference</span><span class="dot">·</span><span>Read-only, no wallet</span></div><span class="url">lumenmarc.netlify.app</span></div>
</div></body></html>`;

writeFileSync(out, html);
console.log(`wrote ${out}`);
