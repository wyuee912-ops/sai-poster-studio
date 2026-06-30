// Headless poster generator. brief.json (or a folder of them) -> PNG/SVG, no UI.
// Drives the SAME renderer the app uses via headless Chromium (Playwright),
// served from the built dist/ over a tiny local static server.
//
//   npm run build                                  # once (and after code changes)
//   node scripts/generate.mjs briefs/ --out posters/        # all briefs in a folder
//   node scripts/generate.mjs a.json b.json --scale 4       # specific files, 4x PNG
//   node scripts/generate.mjs briefs/ --svg                 # vector SVG instead
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
const flags = { scale: 3, out: path.join(ROOT, "posters"), svg: false };
const inputs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--out") flags.out = argv[++i];
  else if (a === "--scale") flags.scale = Number(argv[++i]) || 3;
  else if (a === "--svg") flags.svg = true;
  else inputs.push(a);
}

// expand folders → *.json inside
const briefs = [];
for (const inp of inputs) {
  const p = path.resolve(inp);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory())
    briefs.push(...fs.readdirSync(p).filter((f) => /\.(json|md|markdown)$/i.test(f)).map((f) => path.join(p, f)));
  else briefs.push(p);
}

if (!briefs.length) {
  console.error("Usage: node scripts/generate.mjs <brief.json | folder> [--out posters/] [--scale 3] [--svg]");
  process.exit(1);
}
if (!fs.existsSync(path.join(DIST, "render.html"))) {
  console.error("dist/render.html not found — run `npm run build` first.");
  process.exit(1);
}
fs.mkdirSync(flags.out, { recursive: true });

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

let ok = 0;
for (const bf of briefs) {
  const base = path.basename(bf).replace(/\.(json|md|markdown)$/i, "");
  try {
    const brief = parseBriefText(fs.readFileSync(bf, "utf8"), bf);
    const picked = await page.evaluate((b) => window.pickTemplate(b), brief);
    if (flags.svg) {
      const svg = await page.evaluate((b) => window.renderSVG(b), brief);
      fs.writeFileSync(path.join(flags.out, `${base}.svg`), svg);
      console.log(`✓ ${base}.svg  [${picked}]`);
    } else {
      const dataUrl = await page.evaluate(({ b, s }) => window.renderPNG(b, s), { b: brief, s: flags.scale });
      fs.writeFileSync(path.join(flags.out, `${base}.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
      console.log(`✓ ${base}.png  [${picked}]`);
    }
    ok++;
  } catch (e) {
    console.error(`✗ ${base} — ${e.message}`);
  }
}

await browser.close();
server.close();
console.log(`\nDone: ${ok}/${briefs.length} → ${flags.out}`);
