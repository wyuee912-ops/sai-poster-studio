# brief — the input for auto-generation (JSON **or** Markdown)

You can write a brief as `.json` or, more easily, as **`.md` (Markdown)** — drop
either onto **Auto-generate** in the app, pass it to `npm run generate`, or drop
it in `briefs/` while `npm run watch` runs.

## Markdown brief (the friendly way)
```md
---
template: talk-dark          ← optional; otherwise auto-picked
---

# // On demand               ← the H1 is the Title

Eyebrow: Microsoft Build
Subtitle: Windows 365 for Agents
Code: OD852
Speakers:                    ← a key + bullets joins them
- Jiachen Yang — Simular
- Sam Shapiro — Microsoft
```
Rules: `# H1` → Title · `Key: value` (or `**Key:** value`) → that field · a key
followed by a bullet list joins the bullets · a loose line after the title →
Subtitle · `\n` in a value forces a line break. Keys are the same labels as
below (case-insensitive). See `nyc-tech-week.md` and `talk.md` for examples.

---

## brief.json — the input for auto-generation

A `brief.json` is the text for a poster. Auto-generation reads it, **picks a
template, fills the fields, and exports a poster**. Drop one here (with
`npm run watch` running) or pass it to `npm run generate` / the Auto-generate
button in the app.

## Fields

**Convenience fields** (mapped for you):
| key | maps to |
|-----|---------|
| `headline`  | the big **Title** |
| `proofLine` | **Proof** (and Subtitle if empty) |
| `date`      | **Date** |
| `location`  | **Location** |
| `eyebrow`   | small tag above the title |
| `type`      | `"event"` / `"launch"` / `"article"` — nudges the template |
| `template`  | force a template, skipping auto-pick |

**Direct slot fields** — use the exact label shown in the app's **Content** panel
as the JSON key:
`Title`, `Title2`, `Subtitle`, `Eyebrow`, `Partners`, `Location`, `Date`,
`Category`, `Speakers`, `Featuring`, `Quote`, `Quote sub`, `Prize`, `Code`,
`Stat 1`–`Stat 3`, `Card 1`–`Card 4` (+ `Card N body`), `Sidebar`, `Footer`.

(`\n` in a value forces a line break.)

## Auto-template selection
Priority: an explicit `"template"` wins; then an explicit **`type`** is
authoritative (`event`→cal-hacks — or hackathon/happy-hour if those words
appear, `launch`→launch, `article`→editorial) so an OSWorld stat in your proof
line can't hijack an event into the benchmark layout; otherwise keywords decide:
`hack`→hackathon, `mixer`/`happy hour`→happy-hour, `launch`/`now live`→launch,
`%`/`OSWorld`/`benchmark`→benchmark, `Speakers`/`fireside`/`on demand`→talk,
`Quote`→editorial, `date`/`location`→event (Cal Hacks). Otherwise → cal-hacks.
Override anytime with `"template": "<id>"`.

Template ids: `cal-hacks`, `agent-hour`, `talk-dark`, `editorial-cream`,
`ascii-hero`, `benchmark-dark`, `feature-grid`, `hackathon-dark`, `happy-hour`,
`launch`, `enterprise`.

## Examples
See `cal-hacks.json`, `launch.json`, `benchmark.json`, `agent-mixer.json` in
this folder. Minimal is just:

```json
{ "headline": "Simular at Cal Hacks", "date": "June 20-21", "location": "UC Berkeley" }
```
