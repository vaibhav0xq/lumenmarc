// Screenshot a local HTML file at a fixed viewport with headless Chromium over CDP.
//   node shoot.mjs <file.html> <out.jpg|png> <width> <height> [deviceScaleFactor=2]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [file, out, W, H, S = "2"] = process.argv.slice(2);
if (!file || !out || !W || !H) { console.error("usage: node shoot.mjs <file.html> <out.jpg|png> <width> <height> [scale]"); process.exit(1); }
const port = 9700 + Math.floor(Math.random() * 90);
const chrome = spawn("/repl/tools/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let targets = null;
  for (let i = 0; i < 40 && !targets; i++) { await sleep(250); try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* not up yet */ } }
  if (!targets) throw new Error("chromium did not expose a debugging endpoint");
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: +S, mobile: false });
  await send("Page.navigate", { url: "file://" + resolve(file) });
  await sleep(2200);
  const png = out.endsWith(".png");
  const shot = await send("Page.captureScreenshot", png ? { format: "png" } : { format: "jpeg", quality: 92 });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("saved", out);
} finally { try { ws?.close(); } catch { /* closed */ } chrome.kill("SIGKILL"); }
