// One-off: screenshot the ASCII lab for the README. Serves the built dist/,
// drives the lab UI with Playwright, writes PNGs into docs/.
//   npm run build && node scripts/shots.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const DOCS = path.join(ROOT, "docs");
if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/index.html not found — run `npm run build` first.");
  process.exit(1);
}
fs.mkdirSync(DOCS, { recursive: true });

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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/`);
await page.getByRole("button", { name: "ASCII lab" }).click();
await page.waitForSelector("#ascii-preview-card canvas");
const settle = () => page.waitForTimeout(350);

// React-controlled <input type=range> needs the native setter + input event.
async function setRange(label, value) {
  await page.$eval(`input[aria-label="${label}"]`, (el, val) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, String(val));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
const setGradient = (label) => page.selectOption('select[aria-label="ASCII gradient"]', { label });
const setDither = (label) => page.selectOption('select[aria-label="Dithering"]', { label });
const clickBtn = (name) => page.getByRole("button", { name, exact: true }).click();
const check = (name) => page.getByText(name, { exact: true }).click();
const shotCard = (file) => page.locator("#ascii-preview-card").screenshot({ path: path.join(DOCS, file) });

// 1) Hero — full lab, rich detailed green butterfly.
await setGradient("Extended High");
await settle();
await page.screenshot({ path: path.join(DOCS, "ascii-lab.png") });
console.log("✓ docs/ascii-lab.png (hero)");

// 2) Dark preview — green glyphs on black (transparent frame).
await check("Transparent bg");
await check("Dark preview");
await settle();
await shotCard("ascii-var-dark.png");
console.log("✓ docs/ascii-var-dark.png");
await check("Dark preview");
await check("Transparent bg");

// 3) Colour-shifted (hue) + blocks + dithering.
await setGradient("Blocks");
await setRange("Hue", 285);
await setDither("Floyd-Steinberg");
await settle();
await shotCard("ascii-var-color.png");
console.log("✓ docs/ascii-var-color.png");

// 4) Edge-detection detail, duotone.
await setRange("Hue", 0);
await setDither("None");
await setGradient("Normal");
await clickBtn("Duotone");
await check("Edge detection");
await settle();
await shotCard("ascii-var-edge.png");
console.log("✓ docs/ascii-var-edge.png");

await browser.close();
server.close();
console.log("done");
