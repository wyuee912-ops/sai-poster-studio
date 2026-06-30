<div align="center">

# Sai Poster Studio

**Turn a line of text into a finished, on-brand Sai poster — in the browser, in seconds.**

A local Vite + React design tool: start from one of 11 Simular-brand templates, drop in your
copy (or a one-line *brief*), and export print-resolution PNG / SVG. It pairs a free-form layout
editor with a high-resolution ASCII-art engine and an automation pipeline that renders posters
from plain text files — no manual design, no clicks.

![The Poster Studio editor](docs/editor.png)

</div>

---

## What it can do

- **11 on-brand templates** — event cards, talk/speaker layouts, benchmark stat sheets, launch
  statements, hackathon posters, editorial features, mixers, and more. Every one is built to the
  Simular brand: Manrope + Adamina type, the signal-green `#16D342`, and the Sai mark.
- **Fill-in-the-blank *or* free-form** — type into the Content panel and the poster updates live,
  or select any element on the canvas to drag, resize, rotate, and restyle it (font, size, colour,
  alignment, opacity, tracking).
- **Every platform size** — Instagram square / portrait, LinkedIn, X. Switch and the layout reflows.
- **Text → poster, automatically** — a tiny Markdown or JSON *brief* auto-picks a template, fills
  it, and renders it. Run one-off, batch a whole folder, watch a folder, or push straight into the
  open editor.
- **High-resolution ASCII art** — a built-in engine renders crisp vector / high-DPI ASCII (8 ramps,
  multiple colour modes). The brand butterfly ships in `public/`.
- **Print-quality export** — PNG at 2× / 3× / 4× (up to ~4800 px), true-vector SVG, or re-editable JSON.
- **One shared live document** — the editor, the CLI, and `npm run push` all read and write a single
  file, so every browser shows the same poster and a freshly generated poster appears in your open
  editor within ~2 seconds.

---

## Templates

![Template gallery](docs/templates.png)

`cal-hacks` · `agent-hour` · `talk-dark` · `editorial-cream` · `ascii-hero` · `benchmark-dark`
· `feature-grid` · `hackathon-dark` · `happy-hour` · `launch` · `enterprise`

Picking a template switches to its native size and **carries your typed text across by slot**, so you
can try the same content in several layouts without retyping. Long headlines auto-shrink to fit —
they never clip.

---

## Made with the Studio

Each poster below was produced by the Studio from a short brief — no manual layout work.

<table>
  <tr>
    <td align="center"><img src="docs/examples/benchmark.png" width="240"><br><sub><b>benchmark-dark</b><br>stat showcase</sub></td>
    <td align="center"><img src="docs/examples/saicoded-day1.png" width="240"><br><sub><b>launch</b><br>campaign / announcement</sub></td>
    <td align="center"><img src="docs/examples/agent-mixer.png" width="240"><br><sub><b>happy-hour</b><br>mixer / social</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/examples/talk.png" width="240"><br><sub><b>talk-dark</b><br>talk / speakers</sub></td>
    <td align="center"><img src="docs/examples/cal-hacks.png" width="240"><br><sub><b>cal-hacks</b><br>event card</sub></td>
    <td align="center"><img src="docs/examples/nyc-tech-week.png" width="240"><br><sub><b>editorial-cream</b><br>editorial feature</sub></td>
  </tr>
</table>

---

## Quick start

```bash
git clone git@github.com:wyuee912-ops/sai-poster-studio.git
cd sai-poster-studio
npm install
npm run dev        # http://localhost:5181
```

---

## Three ways to make a poster

**1. By hand** — open the editor, pick a template, type your copy, nudge things into place, export.

**2. From a brief** — write a short `.md` / `.json` brief, then:

```bash
npm run push briefs/launch.md                       # → appears live in the open editor (~2s)
npm run generate briefs/ --out posters --scale 3    # → high-res PNG files (folder or specific files)
npm run watch                                       # → auto-render anything dropped into briefs/
```

`generate` / `watch` drive the **same renderer** the app uses (via headless Chromium), so output is
identical. SVG instead of PNG: add `--svg`. One-time setup for headless: `npx playwright install chromium`.

**3. From plain English** — describe the poster to Claude (the Content Engine half of this project);
it extracts a brief and pushes it for you. e.g. *"Day 1 of our countdown, theme 'your wildest idea',
tag #trysai"* → a finished launch poster on the canvas.

---

## The brief format

A brief is the text of a poster. Markdown is the friendly way:

```md
---
type: launch            # optional: event | launch | article — nudges the template
---
# Your wildest idea     ← the H1 is the Title

Eyebrow: Day 1 · #saicoded
Subtitle: The boldest thing you'd try with Sai — what is it?
CTA: Reply with yours
Footer: #trysai · simular.ai
```

`# Heading` → Title · `Key: value` → that field · a key followed by a bullet list joins the bullets
(e.g. `Speakers:`) · front-matter `type` / `template` chooses the layout. Full reference and more
examples: **[`briefs/README.md`](briefs/README.md)** (sample briefs live in [`briefs/`](briefs/)).

---

## Export

| Format | Notes |
|--------|-------|
| **PNG** | 2× / 3× / 4× — text drawn with the real Manrope font, ASCII rendered at full scale (e.g. 1080² → 3240²) |
| **SVG** | true vector — text as `<tspan>`s, shapes and the Sai mark as paths, ASCII embedded high-res |
| **JSON** | the editable poster document — re-open it later with **Import JSON** |

---

## How it works

```
brief (.md/.json) ──▶ auto-pick template ──▶ fill slots ──▶ render (canvas / SVG) ──▶ export
        │                src/poster/auto.js        │
        └──────────────────────────────────────────┴──▶ .studio/current.json  (the live document)
```

The live document is one file (`.studio/current.json`) served by the dev server at `/api/doc`. The
editor loads it on startup, saves edits back, and polls for external changes — which is why
`npm run push` lands in an already-open editor and every browser stays in sync. On a static host
(no server) it falls back to per-browser storage, so a deployed build still works.

### Why the ASCII renders crisp
The source image is sampled at full resolution, mapped to a character ramp, then drawn as vector SVG
text or a high-DPI canvas — never a coarse low-res raster. That's the resolution fix over a naïve
ASCII export.

---

## Project layout

```
src/poster/      templates, the editor, auto-routing, export, the live-sync client
src/ascii/       the ASCII engine (ramps, colour modes, vector/high-DPI render)
scripts/         generate.mjs (batch CLI) · watch.mjs (folder watcher) · push.mjs (live push)
briefs/          example briefs + the brief format reference
public/          butterfly.png (brand ASCII art) + favicon
docs/            screenshots and example outputs (this README)
```

---

## Credits / licenses
- ASCII algorithm adapted from **[vietnh1009/ASCII-generator](https://github.com/vietnh1009/ASCII-generator)**
  (MIT) — reimplemented in client-side JS with vector / high-DPI output.
- Layer/inspector editor model inspired by **[openposter/OpenPoster](https://github.com/openposter/OpenPoster)**
  (MIT). This app uses a plain-JSON document, not OpenPoster's Apple `.ca` format.
- Manrope & Adamina (SIL Open Font License). Sai / Simular brand assets © Simular.
