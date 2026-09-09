// Screenshot a URL at a fixed viewport with headless Chromium over CDP, after a wait and optional scroll.
//   node shoot-url.mjs <url> <out.jpg|png> <width> <height> [scale=1] [waitMs=3000] [scrollY=0] [evalJs]
// If evalJs is given it is evaluated in the page before the shot and its JSON result is printed.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, out, W, H, S = "1", WAIT = "3000", SCROLL = "0", EVAL = ""] = process.argv.slice(2);
if (!url || !out || !W || !H) {
  console.error("usage: node shoot-url.mjs <url> <out> <width> <height> [scale] [waitMs] [scrollY] [evalJs]");
  process.exit(1);
}
const port = 9700 + Math.floor(Math.random() * 90);
const chrome = spawn(
  "/repl/tools/bin/chromium",
  ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, "about:blank"],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let targets = null;
  for (let i = 0; i < 40 && !targets; i++) {
    await sleep(250);
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      /* not up yet */
    }
  }
  if (!targets) throw new Error("chromium did not expose a debugging endpoint");
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    } else if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
      logs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)}`);
    } else if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
      logs.push(`http ${m.params.response.status}: ${m.params.response.url.slice(0, 200)}`);
    } else if (m.method === "Runtime.exceptionThrown") {
      logs.push(`exception: ${m.params.exceptionDetails.text} ${m.params.exceptionDetails.exception?.description ?? ""}`.slice(0, 400));
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id;
      pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  await send("Page.enable");
  await send("Runtime.enable");
  // NET=1 also records every response with a 4xx/5xx status, the way a browser console reports failed resources.
  if (process.env.NET) await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: +S, mobile: +W < 600 });
  // REDUCED=1 emulates prefers-reduced-motion: reduce before navigation, so the no-motion paths are what gets photographed.
  if (process.env.REDUCED) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.navigate", { url });
  await sleep(+WAIT);
  if (+SCROLL) {
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${+SCROLL})` });
    await sleep(700);
  }
  // TABS=<n> presses Tab n times with real key events, so :focus-visible styles can be photographed.
  for (let i = 0; i < +(process.env.TABS || 0); i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(60);
  }
  if (process.env.TABS) await sleep(400);
  if (EVAL) {
    const r = await send("Runtime.evaluate", { expression: `JSON.stringify((() => { ${EVAL} })())`, returnByValue: true });
    console.log("eval:", r.result?.result?.value ?? JSON.stringify(r.result));
    // EVALWAIT=<ms> lets state changes made by evalJs (a click, a focus) settle before the capture.
    if (process.env.EVALWAIT) await sleep(+process.env.EVALWAIT);
  }
  const png = out.endsWith(".png");
  const fmt = png ? { format: "png" } : { format: "jpeg", quality: 90 };
  // FULLPAGE=1 captures the whole document (layout viewport stays at <height>, so dvh-based sizes hold).
  let clip;
  if (process.env.FULLPAGE) {
    const r = await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
    const h = Math.min(Number(r.result?.result?.value) || +H, 6000);
    // Walk the page so in-view reveals have fired, then return to the top before the capture.
    for (let y = 0; y < h; y += Math.round(+H * 0.6)) {
      await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y})` });
      await sleep(180);
    }
    await sleep(900);
    await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
    // Sticky elements are positioned against the visual viewport, which a beyond-viewport capture does not have; pin them in flow.
    await send("Runtime.evaluate", {
      expression: "Array.from(document.querySelectorAll('*')).filter((el) => getComputedStyle(el).position === 'sticky').forEach((el) => { el.style.position = 'static'; })",
    });
    await sleep(600);
    clip = { x: 0, y: 0, width: +W, height: h, scale: 1 };
    console.log("fullpage height", h);
  }
  const shot = await send("Page.captureScreenshot", clip ? { ...fmt, clip, captureBeyondViewport: true } : fmt);
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("saved", out);
  if (logs.length) console.log("console:\n" + logs.join("\n"));
} finally {
  try {
    ws?.close();
  } catch {
    /* closed */
  }
  chrome.kill("SIGKILL");
}
