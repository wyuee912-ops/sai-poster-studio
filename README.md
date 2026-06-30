# Sai Poster Studio

A local Vite + React app that turns a Sai caption into a finished, on-brand poster — with a
high-resolution **ASCII art** element and a **free-form layout editor**. It's the visual half of the
Sai Content Engine; the two connect through a `brief.json` file.

## Run (dev)
```bash
git clone <your-repo-url> sai-poster-studio
cd sai-poster-studio
npm install
npm run dev        # http://localhost:5181
```

## Headless generation (CLI — no UI, no clicks)
Turn `brief.json` files into finished posters from the terminal. It drives the
**same renderer** the app uses via headless Chromium, so output is identical.

```bash
npm run build                                   # once (and after code changes)
npx playwright install chromium                 # one-time
node scripts/generate.mjs briefs/ --out posters/        # every brief in a folder
node scripts/generate.mjs a.json b.json --scale 4       # specific files, 4x PNG
node scripts/generate.mjs briefs/ --svg                 # vector SVG instead
```
Each brief auto-picks a template (`src/poster/auto.js`) and auto-fills it, then
exports a high-res PNG (or SVG). `briefs/*.json` are example inputs.

### Hands-off watch trigger
```bash
npm run watch                              # watches briefs/ → posters/
node scripts/watch.mjs mybriefs --out out --scale 4 --svg
```
Leave it running; **anything that writes a `brief.json` into the folder** (a
human, the Content Engine, Simulang, a cron) gets a poster out automatically —
no clicks. This is the zero-touch keystone; the only remaining piece for fully
automatic is a source that *writes* the briefs.

### Push a brief into the LIVE editor
While `npm run dev` is open, push a brief straight onto the canvas — it appears
in the open editor within ~2s, no reload, no clicks:
```bash
npm run push briefs/launch.md        # or any .md / .json brief
```
This works because the document is one shared file on disk (`.studio/current.json`),
served by the dev server at `/api/doc`; the editor loads it on startup, saves
edits back, and polls for external changes. So every browser pointed at
`localhost:5181` sees the same poster, and the loop is: **brief → `npm run push`
→ live in the editor → edit → Export.** Briefs can be Markdown or JSON — see
[`briefs/README.md`](briefs/README.md).

## Build & share (it's 100% client-side — any static host works)
```bash
npm run build      # -> dist/  (index.html + assets + butterfly.png + favicon)
npm run preview    # verify the build locally (http://localhost:4173)
```
Then ship `dist/` anywhere:
- **Netlify Drop** — drag the `dist/` folder onto https://app.netlify.com/drop → instant URL.
- **Vercel** — `npx vercel deploy dist --prod` (or point Vercel at the repo; build cmd `npm run build`, output `dist`).
- **GitHub Pages** — push `dist/` to a `gh-pages` branch. If hosted under a sub-path, set `base: "/<repo>/"` in `vite.config.js` and rebuild.
- **Anything** — `dist/` is plain static files; even `python3 -m http.server` inside it works.

## The two tabs
- **Editor** — a free-form poster canvas. Elements (text, accent bar, Sai mark, image, ASCII art) with
  drag-move, corner-resize, layer reorder/hide/delete, an inspector (text, font, size, colour, align,
  **opacity**, ASCII density/ramp/colour-mode/invert/source), snapping, and multiple platform sizes.
- **ASCII lab** — the standalone ASCII playground (density, 8 ramps, colour modes, high-DPI/vector export).

## How it connects to the Content Engine
The Sai Content Engine's Visual step exports `brief.json`:
```json
{ "platform": "x", "headline": "...", "proofLine": "...", "assets": [ { "label": "...", "value": "...", "status": "confirmed" } ] }
```
Click **Import brief.json** here and the poster is seeded — platform → size, headline, proof line, and any
embedded (data-URL) image → the ASCII layer. Remote asset URLs must be uploaded manually (browsers block
cross-origin pixel sampling). The same `brief.json` also drives `simulang/canva.mts`.

```
caption → brief.json → Poster Studio (arrange + ASCII) → export PNG/SVG → (optional) Simulang → Canva
```

## Exports (high resolution)
- **PNG** at 2× / 3× / 4× (e.g. 1600×900 → 4800×2700). Drawn via the canvas API so text uses the real
  Manrope font; ASCII is rendered by the engine at high scale.
- **SVG** — true vector: text wrapped into `<tspan>`s, shapes and the Sai mark as vector paths, ASCII
  embedded as a high-res image, Manrope referenced via Google Fonts.
- **JSON** — the editable poster document.

## Why ASCII renders crisp (the resolution fix)
The source image is sampled at full resolution, mapped to a character ramp, then rendered either as vector
SVG text or a high-DPI canvas — never a coarse low-res raster.

## Credits / licenses
- ASCII algorithm adapted from **[vietnh1009/ASCII-generator](https://github.com/vietnh1009/ASCII-generator)** (MIT) —
  reimplemented in client-side JS with vector/high-DPI output.
- The layer/inspector editor model is inspired by **[openposter/OpenPoster](https://github.com/openposter/OpenPoster)**
  (MIT). This app uses a plain-JSON document, not OpenPoster's Apple `.ca` format.
- Manrope (SIL Open Font License). Sai / Simular brand assets © Simular.
