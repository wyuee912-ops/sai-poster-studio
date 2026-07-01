// Automation core: turn a brief into a finished poster with no manual steps.
// Shared by the in-app "Auto-generate" button and (later) a headless CLI.
import { TEMPLATES_BY_ID, buildTemplate, templateSize } from "./templates.js";

const SLOTS = [
  "Eyebrow", "Partners", "Location", "Sidebar", "Title", "Title2", "Subtitle", "Quote", "Quote sub",
  "Category", "Speakers", "Featuring", "Proof", "Stat 1", "Stat 2", "Stat 3",
  "Card 1", "Card 1 body", "Card 2", "Card 2 body", "Card 3", "Card 3 body", "Card 4", "Card 4 body",
  "Prize", "Code", "CTA", "Date", "Footer",
];

// Pick the best template for a brief. Priority: explicit template > explicit
// type (authoritative — beats incidental keywords like an OSWorld stat in the
// proof) > keyword heuristics > default.
export function autoTemplateId(b) {
  if (b.template && TEMPLATES_BY_ID[b.template]) return b.template;
  { // the #SaiCoded campaign look — daily variant if a "Day N" marker is present
    const s = JSON.stringify(b);
    if (/sai[\s-]?coded/i.test(s)) return /\bday\s*\d/i.test(s) ? "sai-coded-day" : "sai-coded";
  }
  const type = String(b.detectedType || b.type || "").toLowerCase();
  const blob = JSON.stringify(b).toLowerCase();
  const isHack = /hack(athon)?\b/.test(blob);
  const isMixer = /happy hour|mixer|\bdrinks\b/.test(blob);

  // explicit content type wins
  if (type === "launch") return "launch";
  if (type === "article") return "editorial-cream";
  if (type === "event") return isHack ? "hackathon-dark" : isMixer ? "happy-hour" : "cal-hacks";

  // no explicit type → keyword heuristics
  if (isHack) return "hackathon-dark";
  if (isMixer) return "happy-hour";
  if (/launch|announc|now live|\bv?\d\.\d\b/.test(blob)) return "launch";
  if (/%|benchmark|osworld|webvoyager|androidworld/.test(blob)) return "benchmark-dark";
  if (b.Speakers || /\bspeaker|webinar|on demand|fireside|panel\b/.test(blob)) return "talk-dark";
  if (b.Quote || b["Quote sub"]) return "editorial-cream";
  if (b.date || b.Date || b.location || b.Location) return "cal-hacks";
  return "cal-hacks";
}

// Map a brief's fields onto template slots.
export function briefToContent(b) {
  const c = {};
  for (const s of SLOTS) if (b[s] != null && b[s] !== "") c[s] = b[s]; // direct slot passthrough
  if (b.headline) c.Title = b.headline;
  if (b.proofLine) { c.Proof = b.proofLine; if (c.Subtitle == null) c.Subtitle = b.proofLine; }
  if (b.date && c.Date == null) c.Date = b.date;
  if (b.location && c.Location == null) c.Location = b.location;
  if (b.eyebrow && c.Eyebrow == null) c.Eyebrow = b.eyebrow;
  return c;
}

// brief -> finished poster document (auto template + auto fill).
export function posterFromBrief(b) {
  const id = autoTemplateId(b);
  const doc = buildTemplate(id, templateSize(id), briefToContent(b));
  return { doc, templateId: id };
}
