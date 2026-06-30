// Parse a friendly Markdown brief into a brief object (same shape as brief.json).
// DOM-free, so both the browser app and the Node CLI/watch can use it.
//
// Supported markdown:
//   ---                      (optional front-matter)
//   template: talk-dark
//   ---
//   # Big Headline           -> headline (the Title)
//   Eyebrow: ICML 2026 Week  -> field (any Content-panel label, case-insensitive)
//   **Date:** 7 July 2026    -> field (bold key ok)
//   Speakers:                -> a key followed by bullets joins them
//   - Jiachen Yang — Simular
//   - Sam Shapiro — Microsoft
//   A loose line after the title with no "Key:" becomes the Subtitle.

const FIELD = {
  template: "template", type: "type",
  headline: "headline", title: "Title", title2: "Title2", subtitle: "Subtitle",
  proof: "Proof", proofline: "proofLine", "proof line": "proofLine",
  eyebrow: "Eyebrow", date: "date", location: "location",
  partners: "Partners", speakers: "Speakers", featuring: "Featuring",
  quote: "Quote", "quote sub": "Quote sub", prize: "Prize", code: "Code",
  cta: "CTA", category: "Category", footer: "Footer", sidebar: "Sidebar",
  "stat 1": "Stat 1", "stat 2": "Stat 2", "stat 3": "Stat 3",
  "card 1": "Card 1", "card 1 body": "Card 1 body", "card 2": "Card 2", "card 2 body": "Card 2 body",
  "card 3": "Card 3", "card 3 body": "Card 3 body", "card 4": "Card 4", "card 4 body": "Card 4 body",
};

function setField(brief, key, val) {
  const canon = FIELD[String(key).trim().toLowerCase()];
  if (!canon || val == null) return;
  brief[canon] = String(val).replace(/\\n/g, "\n").trim();
}

export function parseMarkdownBrief(md) {
  const brief = {};
  let body = String(md).replace(/\r\n/g, "\n");

  // front-matter
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9 ]*?):\s*(.*)$/);
      if (m) setField(brief, m[1], m[2]);
    }
    body = body.slice(fm[0].length);
  }

  let pendingKey = null;
  let bullets = [];
  const flush = () => {
    if (pendingKey) {
      const sep = /partner/i.test(pendingKey) ? " · " : "\n";
      setField(brief, pendingKey, bullets.join(sep));
      pendingKey = null;
      bullets = [];
    }
  };

  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s+/.test(line)) { flush(); if (brief.headline == null) brief.headline = line.replace(/^#{1,3}\s+/, "").trim(); continue; }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) { if (pendingKey) bullets.push(bullet[1].trim()); continue; }
    flush();
    const kv = line.match(/^\s*\*{0,2}([A-Za-z][A-Za-z0-9 ]*?)\*{0,2}:\s*(.*)$/);
    if (kv && FIELD[kv[1].trim().toLowerCase()]) {
      const val = kv[2].trim();
      if (val === "") pendingKey = kv[1].trim();
      else setField(brief, kv[1], val);
      continue;
    }
    // a loose paragraph right after the title → Subtitle
    if (line.trim() && brief.headline && brief.Subtitle == null) brief.Subtitle = line.trim();
  }
  flush();
  return brief;
}

// Accepts a filename + text; returns a brief object whether it's .md or .json.
export function parseBriefText(text, filename = "") {
  const t = String(text);
  if (/\.(md|markdown)$/i.test(filename)) return parseMarkdownBrief(t);
  try { return JSON.parse(t); } catch { return parseMarkdownBrief(t); }
}
