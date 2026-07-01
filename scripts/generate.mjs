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
    briefs.push(...fs.readdirSync(p).filter((f) => /\.(json|md|markdown)$/i.test(f) && !/^readme\b/i.test(f)).map((f) => path.join(p, f)));
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
const results = [];
for (const bf of briefs) {
  const base = path.basename(bf).replace(/\.(json|md|markdown)$/i, "");
  try {
    const brief = parseBriefText(fs.readFileSync(bf, "utf8"), bf);
    const picked = await page.evaluate((b) => window.pickTemplate(b), brief);
    if (flags.svg) {
      const svg = await page.evaluate((b) => window.renderSVG(b), brief);
      fs.writeFileSync(path.join(flags.out, `${base}.svg`), svg);
      results.push({ base, file: `${base}.svg`, picked });
      console.log(`✓ ${base}.svg  [${picked}]`);
    } else {
      const dataUrl = await page.evaluate(({ b, s }) => window.renderPNG(b, s), { b: brief, s: flags.scale });
      fs.writeFileSync(path.join(flags.out, `${base}.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
      results.push({ base, file: `${base}.png`, picked });
      console.log(`✓ ${base}.png  [${picked}]`);
    }
    ok++;
  } catch (e) {
    console.error(`✗ ${base} — ${e.message}`);
  }
}

// Contact sheet — one page that shows every poster in the batch, so you can
// view all of them at once (open gallery.html, or serve the folder).
if (results.length) {
  const cells = results
    .map((r) => `      <figure><a href="./${r.file}" target="_blank" title="Open ${r.base}"><img loading="lazy" src="./${r.file}" alt="${r.base}"></a><figcaption><span class="n">${r.base}</span><span class="t">${r.picked}</span></figcaption></figure>`)
    .join("\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sai poster batch — ${results.length} poster${results.length === 1 ? "" : "s"}</title>
<style>
  :root { --green:#16D342; --ink:#15161a; --soft:#8a8b86; --line:#e7e7e2; }
  * { box-sizing:border-box; } body { margin:0; font-family:Manrope,-apple-system,Segoe UI,Roboto,sans-serif; color:var(--ink); background:#fbfbf9; }
  header { padding:22px 28px; border-bottom:1px solid var(--line); }
  header h1 { margin:0; font-size:18px; font-weight:800; } header p { margin:4px 0 0; color:var(--soft); font-size:13px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:18px; padding:24px 28px; }
  figure { margin:0; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.05); }
  figure a { display:block; background:#f4f4f2; } figure img { display:block; width:100%; height:260px; object-fit:contain; }
  figcaption { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; font-size:12.5px; }
  figcaption .n { font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  figcaption .t { flex:none; color:#063d15; background:var(--green); border-radius:20px; padding:2px 9px; font-weight:700; font-size:11px; }
</style></head>
<body>
  <header><h1>Sai poster batch</h1><p>${results.length} poster${results.length === 1 ? "" : "s"} · click any to open full size</p></header>
  <div class="grid">
${cells}
  </div>
</body></html>`;
  fs.writeFileSync(path.join(flags.out, "gallery.html"), html);
  console.log(`▸ gallery: ${path.join(flags.out, "gallery.html")}`);
}

await browser.close();
server.close();
console.log(`\nDone: ${ok}/${briefs.length} → ${flags.out}`);
