// Watch trigger: render any brief.json dropped into briefs/ automatically.
// The hands-off keystone — whatever writes a brief (a human, the Content Engine,
// Simulang, or a cron) gets a poster out with zero clicks.
//
//   npm run build                          # once
//   npm run watch                          # then drop brief.json files into briefs/
//   node scripts/watch.mjs mybriefs --out out --scale 4 --svg
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBriefText } from "../src/poster/parseBrief.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const argv = process.argv.slice(2);
const flags = { scale: 3, svg: false };
let briefsDir = path.join(ROOT, "briefs");
let outDir = path.join(ROOT, "posters");
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--out") outDir = path.resolve(argv[++i]);
  else if (a === "--scale") flags.scale = Number(argv[++i]) || 3;
  else if (a === "--svg") flags.svg = true;
  else briefsDir = path.resolve(a);
}

if (!fs.existsSync(path.join(DIST, "render.html"))) {
  console.error("dist/render.html not found — run `npm run build` first.");
  process.exit(1);
}
fs.mkdirSync(briefsDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || "/").split("?")[0]);
  if (u === "/") u = "/index.html";
  const fp = path.join(DIST, u);
  if (!fp.startsWith(DIST) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/render.html`);
await page.waitForFunction(() => typeof window.renderPNG === "function", { timeout: 15000 });

async function render(file) {
  if (!/\.(json|md|markdown)$/i.test(file)) return;
  const full = path.join(briefsDir, file);
  if (!fs.existsSync(full)) return;
  const base = file.replace(/\.(json|md|markdown)$/i, "");
  try {
    const brief = parseBriefText(fs.readFileSync(full, "utf8"), full);
    const picked = await page.evaluate((b) => window.pickTemplate(b), brief);
    if (flags.svg) {
      const svg = await page.evaluate((b) => window.renderSVG(b), brief);
      fs.writeFileSync(path.join(outDir, `${base}.svg`), svg);
    } else {
      const dataUrl = await page.evaluate(({ b, s }) => window.renderPNG(b, s), { b: brief, s: flags.scale });
      fs.writeFileSync(path.join(outDir, `${base}.${flags.svg ? "svg" : "png"}`), Buffer.from(dataUrl.split(",")[1], "base64"));
    }
    console.log(`✓ ${base}.${flags.svg ? "svg" : "png"}  [${picked}]  ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    console.error(`✗ ${base} — ${e.message}`);
  }
}

// render whatever already exists, then watch
for (const f of fs.readdirSync(briefsDir).filter((x) => /\.(json|md|markdown)$/i.test(x))) await render(f);
console.log(`\nWatching ${path.relative(ROOT, briefsDir)}/ → ${path.relative(ROOT, outDir)}/  — drop a .json to generate. Ctrl+C to stop.`);

const timers = {};
fs.watch(briefsDir, (_ev, fn) => {
  if (!fn || !/\.(json|md|markdown)$/i.test(fn)) return;
  clearTimeout(timers[fn]);
  timers[fn] = setTimeout(() => render(fn), 250); // debounce editor saves
});

process.on("SIGINT", async () => { await browser.close(); server.close(); process.exit(0); });
