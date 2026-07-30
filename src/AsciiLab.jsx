import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAMPS, RAMP_LABELS } from "./ascii/charRamps.js";
import { sampleImage, renderAsciiCanvas, renderAsciiSvg, asciiToText } from "./ascii/asciiEngine.js";
import { adjustSource, applyTonemap, DITHER_MODES, DEFAULT_ADJUST } from "./ascii/adjust.js";
import { BRAND } from "./brand.js";
import { makeSampleCanvas } from "./poster/model.js";

const COLOR_MODES = [
  { id: "mono", label: "Ink" },
  { id: "green", label: "Green" },
  { id: "duotone", label: "Duotone" },
  { id: "color", label: "Full color" },
];
const GLYPH_FONTS = [
  ["ui-monospace, Menlo, Consolas, monospace", "System mono"],
  ["'Courier New', Courier, monospace", "Courier"],
  ["Menlo, Monaco, monospace", "Menlo"],
  ["'JetBrains Mono', ui-monospace, monospace", "JetBrains Mono"],
];
// Ramp keys grouped for the "ASCII gradient" dropdown (glyph styles).
const RAMP_ORDER = ["standard", "normal2", "detailed", "alphabetic", "alphanumeric", "numerical", "code", "math", "arrow", "grayscale", "cp437", "blocks", "minimal", "minimalist", "dots", "hatch", "binary", "maxbw"];

export default function AsciiLab() {
  const [source, setSource] = useState(null);
  const [cols, setCols] = useState(100);
  const [rampKey, setRampKey] = useState("standard");
  const [spaceDensity, setSpaceDensity] = useState(1);
  const [adj, setAdj] = useState({ ...DEFAULT_ADJUST });
  const [tone, setTone] = useState({ thresholdOn: false, threshold: 128, dither: "none" });
  const [colorMode, setColorMode] = useState("mono");
  const [ink, setInk] = useState(BRAND.ink);
  const [invert, setInvert] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [fontPx, setFontPx] = useState(12);
  const [scale, setScale] = useState(3);
  const [glyphFont, setGlyphFont] = useState(GLYPH_FONTS[0][0]);
  const [previewDark, setPreviewDark] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const previewRef = useRef(null);
  const fileRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0, rows: 0 });

  const setA = (patch) => setAdj((a) => ({ ...a, ...patch }));
  const setT = (patch) => setTone((t) => ({ ...t, ...patch }));

  const loadSample = () => {
    const img = new Image();
    img.onload = () => setSource(img);
    img.onerror = () => setSource(makeSampleCanvas());
    img.src = "/butterfly.png";
  };
  useEffect(() => { loadSample(); }, []);

  const ramp = RAMPS[rampKey] || RAMPS.standard;

  // Full pipeline: adjust → sample → tonemap. Re-sampled fresh every change so
  // the in-place tonemap never stacks on a stale grid.
  const sample = useMemo(() => {
    if (!source) return null;
    const adjusted = adjustSource(source, adj);
    const s = sampleImage(adjusted, cols);
    applyTonemap(s, { rampLen: ramp.length, invert, ...tone });
    return s;
  }, [source, cols, adj, tone, rampKey, invert]);

  const renderOpts = useMemo(
    () => ({ fontPx, scale, colorMode, invert, transparent, spaceDensity, ink, bg: BRAND.white, accent: BRAND.green, fontFamily: glyphFont }),
    [fontPx, scale, colorMode, invert, transparent, spaceDensity, ink, glyphFont]
  );

  useEffect(() => {
    if (!sample || !previewRef.current) return;
    const cv = renderAsciiCanvas(sample, ramp, renderOpts);
    Object.assign(cv.style, { width: "100%", height: "auto", display: "block", borderRadius: "8px" });
    previewRef.current.replaceChildren(cv);
    setDims({ w: cv.width, h: cv.height, rows: sample.rows });
  }, [sample, ramp, renderOpts]);

  const loadFile = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => setSource(img);
    img.src = URL.createObjectURL(file);
  };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]); };

  const downloadPng = () => renderAsciiCanvas(sample, ramp, { ...renderOpts, scale: Math.max(scale, 4) }).toBlob((b) => dl(b, "sai-ascii.png"));
  const downloadSvg = () => dl(new Blob([renderAsciiSvg(sample, ramp, renderOpts)], { type: "image/svg+xml" }), "sai-ascii.svg");
  const copyText = () => navigator.clipboard?.writeText(asciiToText(sample, ramp, invert));
  const resetAll = () => { setAdj({ ...DEFAULT_ADJUST }); setTone({ thresholdOn: false, threshold: 128, dither: "none" }); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", height: "100%" }}>
      <aside style={{ borderRight: "1px solid var(--line)", padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
        {/* Source */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{ border: `1.5px dashed ${dragOver ? "var(--green)" : "var(--line2)"}`, background: dragOver ? "var(--green-soft)" : "#fff", borderRadius: 10, padding: "16px 12px", textAlign: "center", cursor: "pointer", fontSize: 12.5, color: "var(--soft)" }}
        >
          Drag &amp; drop an image here, or <b style={{ color: "var(--green-ink)" }}>click to select</b>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => loadFile(e.target.files?.[0])} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={loadSample}>Reset to sample</button>
          <button className="btn" style={{ flex: 1 }} onClick={resetAll}>Reset adjustments</button>
        </div>

        <Slider label={`Characters`} value={cols} min={40} max={400} onChange={setCols} />

        <Group title="Image adjustments">
          <Slider label="Brightness" value={adj.brightness} min={0} max={200} onChange={(v) => setA({ brightness: v })} suffix="%" />
          <Slider label="Contrast" value={adj.contrast} min={0} max={200} onChange={(v) => setA({ contrast: v })} suffix="%" />
          <Slider label="Saturation" value={adj.saturation} min={0} max={200} onChange={(v) => setA({ saturation: v })} suffix="%" />
          <Slider label="Hue" value={adj.hue} min={0} max={360} onChange={(v) => setA({ hue: v })} suffix="°" />
          <Slider label="Grayscale" value={adj.grayscale} min={0} max={100} onChange={(v) => setA({ grayscale: v })} suffix="%" />
          <Slider label="Sepia" value={adj.sepia} min={0} max={100} onChange={(v) => setA({ sepia: v })} suffix="%" />
          <Slider label="Invert colors" value={adj.invertColors} min={0} max={100} onChange={(v) => setA({ invertColors: v })} suffix="%" />
        </Group>

        <Group title="Quality enhancements">
          <Check label="Thresholding" checked={tone.thresholdOn} onChange={(v) => setT({ thresholdOn: v })} />
          {tone.thresholdOn && <Slider label="Threshold" value={tone.threshold} min={0} max={255} onChange={(v) => setT({ threshold: v })} />}
          <Check label="Sharpness" checked={adj.sharpenOn} onChange={(v) => setA({ sharpenOn: v })} />
          {adj.sharpenOn && <Slider label="Sharpness" value={adj.sharpness} min={0} max={20} onChange={(v) => setA({ sharpness: v })} />}
          <Check label="Edge detection" checked={adj.edgeOn} onChange={(v) => setA({ edgeOn: v })} />
          {adj.edgeOn && <Slider label="Edge" value={adj.edge} min={0} max={5} step={0.5} onChange={(v) => setA({ edge: v })} />}
          <div className="col" style={{ gap: 3 }}>
            <span className="field-label">Dithering</span>
            <select value={tone.dither} onChange={(e) => setT({ dither: e.target.value })} disabled={tone.thresholdOn}>
              {DITHER_MODES.map((d) => <option key={d} value={d}>{d === "none" ? "None" : d.replace(/(^|-)([a-z])/g, (_, s, c) => s + c.toUpperCase())}</option>)}
            </select>
          </div>
        </Group>

        <Group title="Glyphs">
          <div className="col" style={{ gap: 3 }}>
            <span className="field-label">ASCII gradient</span>
            <select value={rampKey} onChange={(e) => setRampKey(e.target.value)}>
              {RAMP_ORDER.filter((k) => RAMPS[k]).map((k) => <option key={k} value={k}>{RAMP_LABELS[k] || k}</option>)}
            </select>
          </div>
          <div className="col" style={{ gap: 3 }}>
            <span className="field-label">Glyph style (font)</span>
            <select value={glyphFont} onChange={(e) => setGlyphFont(e.target.value)} style={{ fontFamily: glyphFont }}>
              {GLYPH_FONTS.map(([f, n]) => <option key={n} value={f} style={{ fontFamily: f }}>{n}</option>)}
            </select>
          </div>
          <Slider label="Space density" value={spaceDensity} min={0.5} max={2} step={0.05} onChange={setSpaceDensity} />
        </Group>

        <Group title="Colour">
          <div className="col" style={{ gap: 3 }}>
            <span className="field-label">Colour mode</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {COLOR_MODES.map((m) => (
                <button key={m.id} className={`btn ${colorMode === m.id ? "active" : ""}`} style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => setColorMode(m.id)}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="row" style={{ gap: 6, alignItems: "center" }}>
            <span className="field-label" style={{ flex: 1 }}>Ink colour</span>
            <input type="color" value={/^#([0-9a-f]{6})$/i.test(ink) ? ink : "#0c0c0c"} onChange={(e) => setInk(e.target.value)} style={{ width: 34, height: 30, padding: 0, border: "1px solid var(--line2)", borderRadius: 6 }} />
            <button className="btn" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setInk("#ffffff")}>White</button>
          </div>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <Check label="Invert" checked={invert} onChange={setInvert} />
            <Check label="Transparent bg" checked={transparent} onChange={setTransparent} />
            <Check label="Dark preview" checked={previewDark} onChange={setPreviewDark} />
          </div>
        </Group>

        <Group title="Output">
          <Slider label="Glyph size" value={fontPx} min={6} max={22} onChange={setFontPx} suffix="px" />
          <Slider label="Export scale" value={scale} min={1} max={6} onChange={setScale} suffix="×" />
          <button className="btn primary" onClick={downloadPng}>Export PNG (high-DPI)</button>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={downloadSvg}>SVG</button>
            <button className="btn" style={{ flex: 1 }} onClick={copyText}>Copy text</button>
          </div>
        </Group>
      </aside>

      <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, overflow: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="eyebrow">Preview — {dims.w} × {dims.h}px · {RAMP_LABELS[rampKey] || rampKey}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{(cols * (sample?.rows || 0)).toLocaleString()} characters</div>
        </div>
        <div style={{ background: previewDark ? "#0c0c0c" : "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 16, overflow: "auto", flex: 1, display: "grid", placeItems: "center" }}>
          <div ref={previewRef} style={{ width: "100%" }} />
        </div>
      </main>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="col" style={{ gap: 8, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
      <span className="eyebrow">{title}</span>
      {children}
    </div>
  );
}
function Slider({ label, value, min, max, step = 1, onChange, suffix = "" }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="field-label">{label}</span>
        <span style={{ fontSize: 11, color: "var(--soft)", fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}
function Check({ label, checked, onChange }) {
  return (
    <label className="row" style={{ gap: 6, fontSize: 12.5, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

function dl(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
