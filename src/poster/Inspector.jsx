import React from "react";
import { RAMPS, RAMP_LABELS } from "../ascii/charRamps.js";
import { FONTS } from "../brand.js";
import { DECOR_KINDS } from "./decor.js";
import { FADE_DIRS } from "./fade.js";

const COLOR_MODES = [
  ["mono", "Mono"],
  ["green", "Green"],
  ["duotone", "Duotone"],
  ["color", "Color"],
];

export default function Inspector({ el, onUpdate, background, onBackground, size, decor, onDecor }) {
  if (!el) {
    return (
      <div className="col" style={{ gap: 14 }}>
        <div style={{ color: "var(--soft)", fontSize: 13 }}>Select a layer to edit it.</div>
        <div className="col" style={{ gap: 6 }}>
          <span className="eyebrow">Canvas</span>
          <span className="field-label">Background</span>
          <div className="row" style={{ gap: 6 }}>
            <input type="color" value={/^#([0-9a-f]{6})$/i.test(background || "") ? background : "#ffffff"} onChange={(e) => onBackground(e.target.value)} style={{ width: 34, height: 32, padding: 0, border: "1px solid var(--line2)", borderRadius: 6, background: "#fff" }} />
            <input type="text" value={background || ""} onChange={(e) => onBackground(e.target.value)} />
          </div>
          <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {["#ffffff", "#0c0c0c", "#fff2e2", "#16d342"].map((c) => (
              <button key={c} title={c} onClick={() => onBackground(c)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--line2)", background: c, cursor: "pointer" }} />
            ))}
          </div>
        </div>
        {onDecor && (
          <div className="col" style={{ gap: 6 }}>
            <span className="field-label">Background pattern</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {DECOR_KINDS.map((k) => (
                <button key={k} className={`btn ${(decor?.kind || "none") === k ? "active" : ""}`} style={{ padding: "5px 9px", fontSize: 12, textTransform: "capitalize" }} onClick={() => onDecor({ ...(decor || {}), kind: k })}>{k}</button>
              ))}
            </div>
            {decor?.kind && decor.kind !== "none" && (
              <div className="col" style={{ gap: 8, marginTop: 2 }}>
                <ColorField label="Pattern color" value={decor.color || "#16d342"} onChange={(v) => onDecor({ ...decor, color: v })} />
                <div className="col" style={{ gap: 4 }}>
                  <span className="field-label">Pattern opacity — {Math.round((decor.opacity ?? 0.14) * 100)}%</span>
                  <input type="range" min="0" max="100" value={Math.round((decor.opacity ?? 0.14) * 100)} onChange={(e) => onDecor({ ...decor, opacity: +e.target.value / 100 })} />
                </div>
              </div>
            )}
          </div>
        )}
        <p style={{ color: "var(--soft)", fontSize: 12, lineHeight: 1.5 }}>Tip: Del removes a layer, arrow keys nudge, ⌘/Ctrl+D duplicates.</p>
      </div>
    );
  }
  const set = (patch) => onUpdate(el.id, patch);
  const setProp = (patch) => onUpdate(el.id, { props: patch });
  const p = el.props;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="col" style={{ gap: 6 }}>
        <span className="eyebrow">{el.type} layer</span>
        <input type="text" value={el.name} onChange={(e) => set({ name: e.target.value })} />
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="field-label">Position & size</span>
        <div className="row" style={{ gap: 6 }}>
          <Number label="X" value={el.x} onChange={(v) => set({ x: v })} />
          <Number label="Y" value={el.y} onChange={(v) => set({ y: v })} />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Number label="W" value={el.w} onChange={(v) => set({ w: v })} />
          <Number label="H" value={el.h} onChange={(v) => set({ h: v })} />
        </div>
        {size && (
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Align to canvas</span>
            <div className="row" style={{ gap: 6 }}>
              <AlignBtn title="Left edge" onClick={() => set({ x: 0 })}>⇤</AlignBtn>
              <AlignBtn title="Center horizontally" onClick={() => set({ x: Math.round((size.w - el.w) / 2) })}>↔</AlignBtn>
              <AlignBtn title="Right edge" onClick={() => set({ x: size.w - el.w })}>⇥</AlignBtn>
              <AlignBtn title="Top edge" onClick={() => set({ y: 0 })}>⤒</AlignBtn>
              <AlignBtn title="Center vertically" onClick={() => set({ y: Math.round((size.h - el.h) / 2) })}>↕</AlignBtn>
              <AlignBtn title="Bottom edge" onClick={() => set({ y: size.h - el.h })}>⤓</AlignBtn>
            </div>
          </div>
        )}
        <div className="row" style={{ gap: 6, alignItems: "flex-end" }}>
          <Number label="Rotation°" value={el.rotation || 0} onChange={(v) => set({ rotation: v })} />
          <AlignBtn title="Rotate −15°" onClick={() => set({ rotation: Math.round((el.rotation || 0) - 15) })}>−15</AlignBtn>
          <AlignBtn title="Rotate +15°" onClick={() => set({ rotation: Math.round((el.rotation || 0) + 15) })}>+15</AlignBtn>
          <AlignBtn title="Reset rotation" onClick={() => set({ rotation: 0 })}>0°</AlignBtn>
        </div>
      </div>

      <div className="col" style={{ gap: 4 }}>
        <span className="field-label">Opacity — {Math.round((p.opacity ?? 1) * 100)}%</span>
        <input type="range" min="0" max="100" value={Math.round((p.opacity ?? 1) * 100)} onChange={(e) => setProp({ opacity: +e.target.value / 100 })} />
      </div>

      {el.type === "text" && (
        <div className="col" style={{ gap: 8 }}>
          <span className="field-label">Text</span>
          <textarea rows={3} value={p.text} onChange={(e) => setProp({ text: e.target.value })} style={{ width: "100%", border: "1px solid var(--line2)", borderRadius: 8, padding: 8, font: "inherit", fontSize: 13, resize: "vertical" }} />
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Font</span>
            <select value={p.font || "manrope"} onChange={(e) => setProp({ font: e.target.value })} style={{ fontFamily: (FONTS[p.font] || FONTS.manrope).stack }}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k} style={{ fontFamily: f.stack }}>{f.label}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Number label="Size" value={p.fontSize} onChange={(v) => setProp({ fontSize: v })} />
            <div className="col" style={{ gap: 4, flex: 1 }}>
              <span className="field-label">Weight</span>
              <select value={p.weight} onChange={(e) => setProp({ weight: +e.target.value })}>
                {[400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <ColorField label="Color" value={p.color} onChange={(v) => setProp({ color: v })} />
            <div className="col" style={{ gap: 4, flex: 1 }}>
              <span className="field-label">Align</span>
              <select value={p.align} onChange={(e) => setProp({ align: e.target.value })}>
                {["left", "center", "right"].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Highlight words (comma-separated)</span>
            <input type="text" placeholder="e.g. now, free" value={(p.highlight || []).join(", ")} onChange={(e) => setProp({ highlight: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
          {(p.highlight || []).length > 0 && (
            <ColorField label="Highlight color" value={p.highlightColor || "#16D342"} onChange={(v) => setProp({ highlightColor: v })} />
          )}
        </div>
      )}

      {el.type === "accent" && (
        <div className="col" style={{ gap: 8 }}>
          <ColorField label="Fill" value={p.fill} onChange={(v) => setProp({ fill: v })} />
          <Number label="Corner radius" value={p.radius} onChange={(v) => setProp({ radius: v })} />
        </div>
      )}

      {el.type === "saiMark" && (
        <ColorField label="Square color" value={p.fill || "#16D342"} onChange={(v) => setProp({ fill: v })} />
      )}

      {el.type === "image" && (
        <div className="col" style={{ gap: 8 }}>
          <span className="field-label">Source</span>
          <UploadButton onData={(src) => setProp({ src })} />
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Fit</span>
            <select value={p.fit} onChange={(e) => setProp({ fit: e.target.value })}>
              {["cover", "contain"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Fade (gradient transparency)</span>
            <select value={p.fade || "none"} onChange={(e) => setProp({ fade: e.target.value })}>
              {FADE_DIRS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      )}

      {el.type === "ascii" && (
        <div className="col" style={{ gap: 10 }}>
          <div className="col" style={{ gap: 6 }}>
            <span className="field-label">Source image</span>
            <UploadButton onData={(src) => setProp({ src })} />
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Density — {p.cols} cols</span>
            <input type="range" min="40" max="320" value={p.cols} onChange={(e) => setProp({ cols: +e.target.value })} />
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Ramp</span>
            <select value={p.rampKey} onChange={(e) => setProp({ rampKey: e.target.value })}>
              {Object.keys(RAMPS).map((k) => <option key={k} value={k}>{RAMP_LABELS[k]}</option>)}
            </select>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Color mode</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {COLOR_MODES.map(([id, label]) => (
                <button key={id} className={`btn ${p.colorMode === id ? "active" : ""}`} style={{ padding: "5px 8px", fontSize: 12 }} onClick={() => setProp({ colorMode: id })}>{label}</button>
              ))}
            </div>
          </div>
          <label className="row" style={{ gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={p.invert} onChange={(e) => setProp({ invert: e.target.checked })} /> Invert
          </label>
          <div className="col" style={{ gap: 4 }}>
            <span className="field-label">Fade (gradient transparency)</span>
            <select value={p.fade || "none"} onChange={(e) => setProp({ fade: e.target.value })}>
              {FADE_DIRS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function AlignBtn({ title, onClick, children }) {
  return (
    <button title={title} onClick={onClick} style={{ flex: 1, minWidth: 0, height: 30, border: "1px solid var(--line2)", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, lineHeight: 1, color: "#15161a" }}>
      {children}
    </button>
  );
}

function Number({ label, value, onChange }) {
  return (
    <div className="col" style={{ gap: 4, flex: 1 }}>
      <span className="field-label">{label}</span>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="col" style={{ gap: 4, flex: 1 }}>
      <span className="field-label">{label}</span>
      <div className="row" style={{ gap: 6 }}>
        <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 32, padding: 0, border: "1px solid var(--line2)", borderRadius: 6, background: "#fff" }} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
function toHex(v) {
  if (typeof v === "string" && /^#([0-9a-f]{6})$/i.test(v)) return v;
  return "#000000";
}

function UploadButton({ onData }) {
  return (
    <label className="btn" style={{ textAlign: "center", display: "block" }}>
      Choose image
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => onData(r.result);
          r.readAsDataURL(f);
        }}
      />
    </label>
  );
}
