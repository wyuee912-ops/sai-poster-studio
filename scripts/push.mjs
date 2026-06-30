// Push a brief into the LIVE Poster Studio: parse it, auto-pick + fill a
// template, and write the editable doc to .studio/current.json. Any editor
// open at localhost:5181 loads it within ~2s (no clicks, no PNG export).
//
//   npm run push briefs/launch.md          # or a .json brief
//   node scripts/push.mjs path/to/brief.md
//
// Pure JS — no browser needed (rendering to PNG is the only step that needs one).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBriefText } from "../src/poster/parseBrief.js";
import { posterFromBrief } from "../src/poster/auto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/push.mjs <brief.md|brief.json>");
  process.exit(1);
}
const src = path.resolve(arg);
if (!fs.existsSync(src)) {
  console.error(`brief not found: ${src}`);
  process.exit(1);
}

const brief = parseBriefText(fs.readFileSync(src, "utf8"), src);
const { doc, templateId } = posterFromBrief(brief);
const file = path.join(ROOT, ".studio", "current.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(doc));
console.log(`✓ pushed [${templateId}] to the studio — open editor updates live (${path.relative(ROOT, file)})`);
