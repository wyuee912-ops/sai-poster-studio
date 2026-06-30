import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAMPS, RAMP_LABELS } from "./ascii/charRamps.js";
import { sampleImage, renderAsciiCanvas, renderAsciiSvg, asciiToText } from "./ascii/asciiEngine.js";
import { BRAND } from "./brand.js";
import { makeSampleCanvas } from "./poster/model.js"; // shared drawn butterfly sample

const COLOR_MODES = [
  { id: "mono", label: "Mono ink" },
  { id: "green", label: "Green" },
  { id: "duotone", label: "Duotone (ink→green)" },
  { id: "color", label: "Full color" },
];

export default function AsciiLab() {
  const [source, setSource] = useState(null);
  const [cols, setCols] = useState(160);
  const [rampKey, setRampKey] = useState("detailed");
  const [colorMode, setColorMode] = useState("mono");
  const [invert, setInvert] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [fontPx, setFontPx] = useState(12);
  const [scale, setScale] = useState(3);
  const previewRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0, rows: 0 });

  // Default sample = the real Simular brand butterfly (public/butterfly.png),
  // falling back to the drawn one if the file is absent.
  const loadSample = () => {
    const img = new Image();
    img.onload = () => setSource(img);
    img.onerror = () => setSource(makeSampleCanvas());
    img.src = "/butterfly.png";
  };
  useEffect(() => { loadSample(); }, []);

  const ramp = RAMPS[rampKey];
  const sample = useMemo(() => (source ? sampleImage(source, cols) : null), [source, cols]);
  const renderOpts = useMemo(
    () => ({ fontPx, scale, colorMode, invert, transparent, ink: BRAND.ink, bg: BRAND.white, accent: BRAND.green, fontFamily: BRAND.mono }),
    [fontPx, scale, colorMode, invert, transparent]
  );

  useEffect(() => {
    if (!sample || !previewRef.current) return;
    const cv = renderAsciiCanvas(sample, ramp, renderOpts);
    cv.style.width = "100%";
    cv.style.height = "auto";
    cv.style.display = "block";
    cv.style.borderRadius = "8px";
    cv.style.border = "1px solid var(--line)";
    previewRef.current.replaceChildren(cv);
    setDims({ w: cv.width, h: cv.height, rows: sample.rows });
  }, [sample, ramp, renderOpts]);

  function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setSource(img);
    img.src = URL.createObjectURL(file);
  }
  function downloadPng() {
    const cv = renderAsciiCanvas(sample, ramp, { ...renderOpts, scale: Math.max(scale, 4) });
    cv.toBlob((blob) => triggerDownload(blob, "sai-ascii.png"));
  }
  function downloadSvg() {
    triggerDownload(new Blob([renderAsciiSvg(sample, ramp, renderOpts)], { type: "image/svg+xml" }), "sai-ascii.svg");
  }
  function copyText() {
    navigator.clipboard?.writeText(asciiToText(sample, ramp, invert));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "100%" }}>
      <aside style={{ borderRight: "1px solid var(--line)", padding: 18, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
        <div className="col">
          <span className="field-label">Source image</span>
          <input type="file" accept="image/*" onChange={onUpload} />
          <button className="btn" onClick={loadSample}>Reset to sample</button>
        </div>
        <div className="col">
          <span className="field-label">Density — {cols} cols × {dims.rows} rows</span>
          <input type="range" min="40" max="400" value={cols} onChange={(e) => setCols(+e.target.value)} />
        </div>
        <div className="col">
          <span className="field-label">Character ramp</span>
          <select value={rampKey} onChange={(e) => setRampKey(e.target.value)}>
            {Object.keys(RAMPS).map((k) => <option key={k} value={k}>{RAMP_LABELS[k]}</option>)}
          </select>
        </div>
        <div className="col">
          <span className="field-label">Color mode</span>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {COLOR_MODES.map((m) => (
              <button key={m.id} className={`btn ${colorMode === m.id ? "active" : ""}`} style={{ padding: "6px 9px", fontSize: 12 }} onClick={() => setColorMode(m.id)}>{m.label}</button>
            ))}
          </div>
        </div>
        <div className="col">
          <span className="field-label">Glyph size {fontPx}px · export scale {scale}×</span>
          <input type="range" min="6" max="22" value={fontPx} onChange={(e) => setFontPx(+e.target.value)} />
          <input type="range" min="1" max="6" value={scale} onChange={(e) => setScale(+e.target.value)} />
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <label className="row" style={{ gap: 6, fontSize: 12 }}><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} /> Invert</label>
          <label className="row" style={{ gap: 6, fontSize: 12 }}><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> Transparent bg</label>
        </div>
        <div className="col">
          <button className="btn primary" onClick={downloadPng}>Export PNG (high-DPI)</button>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={downloadSvg}>SVG</button>
            <button className="btn" style={{ flex: 1 }} onClick={copyText}>Copy text</button>
          </div>
        </div>
      </aside>
      <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, overflow: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="eyebrow">Preview — rendered output {dims.w} × {dims.h}px</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{(cols * (sample?.rows || 0)).toLocaleString()} characters</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 16, overflow: "auto" }}>
          <div ref={previewRef} />
        </div>
      </main>
    </div>
  );
}

function triggerDownload(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
