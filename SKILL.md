---
name: sai-poster-studio
user_invocable: true
description: >
  Turn a line of text or a post into a finished, on-brand Sai/Simular poster.
  11 brand templates (event, talk, benchmark, launch, hackathon, editorial,
  mixer, enterprise…), every social size (Instagram, LinkedIn, X), a free-form
  editor (align, rotate, fonts, background patterns, keyword highlight), and
  print-resolution PNG/SVG export. No API keys — Claude writes the brief, the
  local Vite app renders it in the browser.
  Triggers: sai poster, simular poster, poster studio, make a poster, social
  graphic, instagram poster, linkedin poster, launch poster, event poster,
  benchmark poster, sai social, simular social.
---

# Sai Poster Studio

Converts a text idea into a finished, on-brand poster for Sai (the product) /
Simular (the company). **You (Claude) are the brain** — you turn the user's text
into a structured *brief*; the local app renders it in the browser and exports.
There are **no API keys**: the LLM work is this Claude session, the rendering is
100% client-side.

## Invocation

```
/sai-poster-studio <idea or post text>
/sai-poster-studio path/to/post.md
```

If invoked with nothing, ask the user for the idea / text in one line.

## What it makes — templates (11)

Each template has a native size and brand-correct layout. You usually let the
brief **auto-pick**; override with `template:` in front-matter.

| Template id | Use it for |
|---|---|
| `cal-hacks` *(default)* | events — date + venue, green "sai" tile + white card |
| `hackathon-dark` | hackathons — big title, date/venue/sponsors |
| `happy-hour` | mixers / drinks / socials |
| `launch` | launches, announcements, campaign statements (eyebrow / title / subhead / CTA pill / footer) |
| `benchmark-dark` | results — up to 3 big stats (e.g. OSWorld %) |
| `talk-dark` | talks / webinars / panels — speaker list + session code |
| `editorial-cream` | editorial features / quotes (Adamina serif, rotated sidebar) |
| `feature-grid` | 2×2 feature cards |
| `agent-hour` | square two-tone with the brand butterfly |
| `ascii-hero` | full-bleed ASCII butterfly hero |
| `enterprise` | clean white + blue accent (healthcare / enterprise) |

**Sizes** (set with the size picker in-app, or it follows the template):
`instagram-square` 1080×1080 · `instagram-portrait` 1080×1350 · `linkedin` 1200×627 · `x` 1600×900.

## The brief (what you write)

A brief is Markdown. The H1 is the title; `Key: value` lines fill fields; a key
followed by a bullet list joins the bullets; front-matter picks type/template.

```md
---
type: launch          # optional: event | launch | article — nudges the template
template: launch      # optional: force a template, skip auto-pick
---
# Your wildest idea   ← the H1 is the Title

Eyebrow: Day 1 · #saicoded
Subtitle: The boldest thing you'd try with Sai — what is it?
CTA: Reply with yours
Footer: #trysai · simular.ai
```

**Convenience fields** (mapped for you): `headline` (or the `# H1`) → Title ·
`proofLine` → Proof/Subtitle · `date` · `location` · `eyebrow` · `type` · `template`.

**Direct slot fields** — use the exact label as the key:
`Title`, `Title2`, `Subtitle`, `Eyebrow`, `Partners`, `Location`, `Date`,
`Category`, `Speakers`, `Featuring`, `Quote`, `Quote sub`, `Prize`, `Code`,
`CTA`, `Stat 1`–`Stat 3`, `Card 1`–`Card 4` (+ `Card N body`), `Sidebar`, `Footer`.
(`\n` in a value forces a line break.)

**Auto-template priority:** explicit `template` → explicit `type`
(event→cal-hacks/hackathon/happy-hour, launch→launch, article→editorial) →
keywords (`hack`→hackathon, `mixer`/`happy hour`→happy-hour, `%`/`OSWorld`/
`benchmark`→benchmark, `Speakers`→talk, `Quote`→editorial, `date`/`location`→
event) → `cal-hacks`.

## Brand rules (non-negotiable)

- **No emoji** anywhere — strip them out of the user's text.
- Accent color is the signal-green **`#16D342`** only. No other accent colors.
- Type is **Manrope** (headlines/body) + **Adamina** (serif accents, editorial).
- Keep copy tight: one idea per poster, short punchy headline, ≤ ~14-word subhead.
- Footer is usually `simular.ai` (or a campaign tag like `#trysai · simular.ai`).

## Workflow

### Step 1 — Get the text
Use inline text if given; read the file if a path; if it's long, confirm it's complete.

### Step 2 — Plan the brief
Pull out: the **headline** (the single sharpest line), an optional **eyebrow**
(series/context), a **subtitle** (one supporting line), a **CTA**, and a
**footer**. Pick (or let auto-pick choose) a template and set `type:`. Strip
emoji. Show the user the brief you intend to use before generating.

### Step 3 — Generate (push it into the live studio)

```bash
cd ~/.claude/skills/sai-poster-studio          # the skill directory (this app)
[ -d node_modules ] || npm install             # first run only
# start the dev server in the background if it isn't already on :5181
(curl -sf localhost:5181 >/dev/null) || (npm run dev >/tmp/sai-studio.log 2>&1 &)
# write the brief to a temp file and push it onto the canvas
cat > /tmp/sai-brief.md <<'BRIEF'
---
type: launch
---
# Your wildest idea
Eyebrow: Day 1 · #saicoded
Subtitle: The boldest thing you'd try with Sai — what is it?
CTA: Reply with yours
Footer: #trysai · simular.ai
BRIEF
npm run push /tmp/sai-brief.md                 # appears in the open editor within ~2s
```

`npm run push` is pure Node (no browser, no keys) — it parses the brief,
auto-picks a template, fills it, and writes the live document (`.studio/current.json`),
which the open editor loads automatically.

### Step 4 — Preview & export
Tell the user to open **http://localhost:5181**. There they can:
- Edit text live in the **Content** panel; drag / resize / **rotate** elements; use the **Align to canvas** buttons and snap-to-element guides.
- Restyle: **Background pattern** (grid / dots / glow), **font**, color, **highlight words**, per-layer opacity.
- Add a background photo: select/add an **image** layer → *Choose image* (upload). (Briefs can't carry images — this is a manual step in the editor.)
- Switch **size** (Instagram / LinkedIn / X) — the layout reflows.
- **Export PNG** (2×/3×/4×, e.g. 3240²), **SVG** (vector), or **JSON** (re-editable).

To make more posters in the same session, just write another brief and
`npm run push` it again — the canvas updates live.

## Editing capabilities (mention to the user as needed)
Free-form drag/resize, rotation handle (snaps to 15°), align-to-canvas + snap-to-element
guides, font picker (Manrope/Inter/Adamina/Instrument/Mono), per-word keyword highlighting,
decorative background patterns, per-layer opacity, layers panel, zoom, localStorage + disk sync.

## Batch — dump many ideas, get all posters at once

When the user gives a **list of ideas** (e.g. "make 10 posters: …" or 10 lines/paragraphs), don't
push them one at a time. Write one brief per idea into a dedicated folder, render them all, and open
the **gallery** (a contact sheet of every poster). Needs `npx playwright install chromium` once.

```bash
mkdir -p briefs/<batch>                 # e.g. briefs/saicoded
# write one brief per idea, numbered so the gallery is ordered:
#   briefs/<batch>/01-slug.md, briefs/<batch>/02-slug.md, …
npm run generate briefs/<batch> --out posters/<batch> --scale 3
open posters/<batch>/gallery.html       # every poster in a grid; click any to open full size
```

`gallery.html` is a self-contained contact sheet written next to the PNGs — this is how the user
"views all of them at once." Rules: one idea per brief, number the files (`01-`…) for order, keep each
on-brand (strip emoji, tight copy), let templates auto-pick unless a `type:`/`template:` is obvious.
Any single poster can then be opened in the editor for fine-tuning: `npm run push briefs/<batch>/03-foo.md`.

Also available: `npm run watch` — auto-renders anything dropped into `briefs/`.

## Common mistakes
| Mistake | Fix |
|---|---|
| Emoji left in the copy | Strip all emoji — brand rule |
| Two ideas on one poster | One idea per poster; make a second |
| Headline too long | Tighten to a punchy line (display titles auto-shrink, but shorter reads better) |
| Wrong template for the content | Set `type:` or `template:` explicitly instead of fighting the keywords |
| Using a non-green accent | Accent is `#16D342` only |
| Expecting a background image from the brief | Images are added in the editor (upload), not via the brief |

## Notes
- **No API keys, ever.** Claude writes the brief; the app renders in the browser. The only network use is loading Google Fonts.
- This skill bundles the full Vite app (`src/`, `scripts/`, `briefs/`). Don't edit the engine — just write briefs and push them.
- Source / updates: github.com/wyuee912-ops/sai-poster-studio
