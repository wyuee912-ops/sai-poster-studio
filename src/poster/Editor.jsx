import React, { useEffect, useMemo, useRef, useState } from "react";
import { BRAND, fontStack } from "../brand.js";
import { RAMPS } from "../ascii/charRamps.js";
import { sampleImage, renderAsciiCanvas } from "../ascii/asciiEngine.js";
import { fitFont } from "./textfit.js";
import { makeSampleCanvas } from "./model.js";
import { decorStyle } from "./decor.js";
import { hiSetOf, tokenize, isHi } from "./richtext.js";
import { fadeCss } from "./fade.js";

const HANDLES = [
  ["nw", 0, 0],
  ["ne", 1, 0],
  ["sw", 0, 1],
  ["se", 1, 1],
];

export default function Editor({ doc, selectedId, onSelect, onUpdate, stageRef }) {
  const wrapRef = useRef(null);
  const [vp, setVp] = useState({ w: 820, h: 600 });
  const [zoom, setZoom] = useState(1); // 1 = fit-to-screen
  const [guides, setGuides] = useState([]);
  const gesture = useRef(null);
  const [dragging, setDragging] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setVp({ w: Math.max(200, el.clientWidth), h: Math.max(200, el.clientHeight) });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // re-fit whenever the poster size changes (template/size switch)
  useEffect(() => { setZoom(1); }, [doc.size.w, doc.size.h]);

  // ctrl/cmd + wheel to zoom
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => Math.max(0.1, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 1 / 1.1))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const PAD = 56;
  const fitScale = Math.max(0.05, Math.min((vp.w - PAD) / doc.size.w, (vp.h - PAD) / doc.size.h));
  const scale = fitScale * zoom;
  const stageW = doc.size.w * scale;
  const stageH = doc.size.h * scale;
  const pct = Math.round(scale * 100);
  const zoomBy = (f) => setZoom((z) => Math.max(0.1, Math.min(5, z * f)));

  useEffect(() => {
    if (!dragging) return;
    const SNAP = 6 / scale;
    const W = doc.size.w, H = doc.size.h;
    const move = (e) => {
      const g = gesture.current;
      if (!g) return;
      if (g.mode === "rotate") {
        const ang = Math.atan2(e.clientY - g.cy, e.clientX - g.cx);
        let deg = g.startRot + ((ang - g.startAng) * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;
        const near = Math.round(deg / 15) * 15;          // soft-snap to 15° steps
        if (Math.abs(deg - near) < 4) deg = near % 360;
        onUpdateRef.current(g.id, { rotation: Math.round(deg) });
        return;
      }
      const dx = (e.clientX - g.sx) / scale;
      const dy = (e.clientY - g.sy) / scale;
      if (g.mode === "move") {
        let nx = g.ox + dx;
        let ny = g.oy + dy;
        // snap lines: the canvas (edges + center) AND every other element's edges + centers
        const vlines = [0, W / 2, W];
        const hlines = [0, H / 2, H];
        for (const o of doc.elements) {
          if (o.id === g.id || o.visible === false) continue;
          vlines.push(o.x, o.x + o.w / 2, o.x + o.w);
          hlines.push(o.y, o.y + o.h / 2, o.y + o.h);
        }
        const gl = [];
        // X: snap left/center/right of the dragged box to the nearest line within SNAP
        let bestX = SNAP, snapX = null, guideX = null;
        for (const [anchor, off] of [[nx, 0], [nx + g.ow / 2, g.ow / 2], [nx + g.ow, g.ow]])
          for (const ln of vlines) { const d = Math.abs(anchor - ln); if (d < bestX) { bestX = d; snapX = ln - off; guideX = ln; } }
        if (snapX != null) { nx = snapX; gl.push({ x: guideX }); }
        let bestY = SNAP, snapY = null, guideY = null;
        for (const [anchor, off] of [[ny, 0], [ny + g.oh / 2, g.oh / 2], [ny + g.oh, g.oh]])
          for (const ln of hlines) { const d = Math.abs(anchor - ln); if (d < bestY) { bestY = d; snapY = ln - off; guideY = ln; } }
        if (snapY != null) { ny = snapY; gl.push({ y: guideY }); }
        setGuides(gl);
        onUpdateRef.current(g.id, { x: Math.round(nx), y: Math.round(ny) });
      } else {
        let { ox, oy, ow, oh } = g;
        let nx = ox, ny = oy, nw = ow, nh = oh;
        if (g.corner.includes("e")) nw = Math.max(20, ow + dx);
        if (g.corner.includes("s")) nh = Math.max(20, oh + dy);
        if (g.corner.includes("w")) { nw = Math.max(20, ow - dx); nx = ox + (ow - nw); }
        if (g.corner.includes("n")) { nh = Math.max(20, oh - dy); ny = oy + (oh - nh); }
        onUpdateRef.current(g.id, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
      }
    };
    const up = () => { setDragging(false); gesture.current = null; setGuides([]); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, scale, doc.size.w, doc.size.h, doc.elements]);

  function startMove(e, el) {
    e.stopPropagation();
    onSelect(el.id);
    gesture.current = { mode: "move", id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h };
    setDragging(true);
  }
  function startResize(e, el, corner) {
    e.stopPropagation();
    onSelect(el.id);
    gesture.current = { mode: "resize", corner, id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h };
    setDragging(true);
  }
  function startRotate(e, el) {
    e.stopPropagation();
    onSelect(el.id);
    const rect = stageRef.current.getBoundingClientRect();
    const cx = rect.left + (el.x + el.w / 2) * scale; // element centre in screen coords (rotation pivot)
    const cy = rect.top + (el.y + el.h / 2) * scale;
    gesture.current = { mode: "rotate", id: el.id, cx, cy, startAng: Math.atan2(e.clientY - cy, e.clientX - cx), startRot: el.rotation || 0 };
    setDragging(true);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={wrapRef} style={{ width: "100%", height: "100%", overflow: "auto", background: "#eceee8" }}>
        <div style={{ minWidth: "100%", minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, boxSizing: "border-box" }}>
          <div
            ref={stageRef}
            onPointerDown={() => onSelect(null)}
            style={{
              position: "relative",
              width: stageW,
              height: stageH,
              background: doc.background,
              boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
              overflow: "hidden",
              flex: "0 0 auto",
            }}
          >
            {decorStyle(doc.decor, scale) && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...decorStyle(doc.decor, scale) }} />
            )}
            {doc.elements.map((el) =>
              el.visible === false ? null : (
                <ElementView
                  key={el.id}
                  el={el}
                  scale={scale}
                  selected={el.id === selectedId}
                  onStartMove={(e) => startMove(e, el)}
                  onStartResize={(e, c) => startResize(e, el, c)}
                  onStartRotate={(e) => startRotate(e, el)}
                />
              )
            )}
            {guides.map((g, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  background: "#16d342",
                  ...(g.x != null
                    ? { left: g.x * scale, top: 0, width: 1, height: "100%" }
                    : { top: g.y * scale, left: 0, height: 1, width: "100%" }),
                  pointerEvents: "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, alignItems: "center", background: "#fff", border: "1px solid #d6d6d0", borderRadius: 10, padding: "5px 6px", boxShadow: "0 2px 12px rgba(0,0,0,0.14)" }}>
        <button onClick={() => zoomBy(1 / 1.25)} title="Zoom out" style={ZB}>−</button>
        <span style={{ minWidth: 46, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#15161a" }}>{pct}%</span>
        <button onClick={() => zoomBy(1.25)} title="Zoom in" style={ZB}>+</button>
        <div style={{ width: 1, height: 18, background: "#e7e7e2", margin: "0 2px" }} />
        <button onClick={() => setZoom(1)} title="Fit to screen" style={ZBW}>Fit</button>
        <button onClick={() => setZoom(1 / fitScale)} title="Actual size (100%)" style={ZBW}>100%</button>
      </div>
    </div>
  );
}

const ZB = { width: 28, height: 28, border: "1px solid #d6d6d0", background: "#fff", borderRadius: 7, fontSize: 17, fontWeight: 700, lineHeight: 1, color: "#15161a", cursor: "pointer", display: "grid", placeItems: "center" };
const ZBW = { ...ZB, width: "auto", padding: "0 10px", fontSize: 12 };

function ElementView({ el, scale, selected, onStartMove, onStartResize, onStartRotate }) {
  const style = {
    position: "absolute",
    left: el.x * scale,
    top: el.y * scale,
    width: el.w * scale,
    height: el.h * scale,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    cursor: "move",
    outline: selected ? "1.5px solid #16d342" : "none",
    outlineOffset: 0,
  };
  return (
    <div style={style} onPointerDown={onStartMove}>
      <div style={{ width: "100%", height: "100%", opacity: el.props?.opacity ?? 1 }}>
        <ElementContent el={el} scale={scale} />
      </div>
      {selected && (
        <>
          <div style={{ position: "absolute", left: "50%", top: -22, width: 1, height: 22, background: "#16d342", pointerEvents: "none" }} />
          <div
            onPointerDown={onStartRotate}
            title="Drag to rotate (snaps to 15°)"
            style={{ position: "absolute", left: "calc(50% - 7px)", top: -29, width: 14, height: 14, background: "#fff", border: "1.5px solid #16d342", borderRadius: "50%", cursor: "grab" }}
          />
        </>
      )}
      {selected &&
        HANDLES.map(([c, hx, hy]) => (
          <div
            key={c}
            onPointerDown={(e) => onStartResize(e, c)}
            style={{
              position: "absolute",
              left: `calc(${hx * 100}% - 6px)`,
              top: `calc(${hy * 100}% - 6px)`,
              width: 12,
              height: 12,
              background: "#fff",
              border: "1.5px solid #16d342",
              borderRadius: 3,
              cursor: `${c}-resize`,
            }}
          />
        ))}
    </div>
  );
}

function ElementContent({ el, scale }) {
  const p = el.props;
  if (el.type === "text") {
    const stack = fontStack(p.font);
    const effSize = p.shrink ? fitFont(p.text, p.fontSize, p.weight, el.w, p.uppercase, stack) : p.fontSize;
    const hiSet = hiSetOf(p.highlight);
    const hiColor = p.highlightColor || BRAND.green;
    const body = hiSet.size
      ? tokenize(p.text).map((t, i) => (isHi(t, hiSet) ? <span key={i} style={{ color: hiColor }}>{t}</span> : t))
      : p.text;
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          fontFamily: stack,
          fontWeight: p.weight,
          color: p.color,
          fontSize: effSize * scale,
          lineHeight: p.lineHeight,
          textAlign: p.align,
          textTransform: p.uppercase ? "uppercase" : "none",
          letterSpacing: p.tracking ? p.tracking * scale : undefined,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {body}
      </div>
    );
  }
  if (el.type === "accent") {
    return <div style={{ width: "100%", height: "100%", background: p.fill, borderRadius: (p.radius || 0) * scale }} />;
  }
  if (el.type === "tile") {
    const sx = p.gapX || 160, sy = p.gapY || 128;
    const cells = [];
    for (let yy = sy / 2; yy < el.h; yy += sy) {
      const off = (Math.round(yy / sy) % 2) * (sx / 2);
      for (let xx = -sx + off; xx < el.w + sx; xx += sx) {
        cells.push(
          <text key={`${xx}-${yy}`} x={xx} y={yy} textAnchor="middle" dominantBaseline="middle" fontFamily={BRAND.font} fontWeight={p.weight || 700} fontSize={p.fontSize || 30} fill={p.fill || "#000"}>
            {p.text || "sai"}
          </text>
        );
      }
    }
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ display: "block" }}>
        {cells}
      </svg>
    );
  }
  if (el.type === "shape") {
    if (p.kind === "polygon" && p.points) {
      return (
        <svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ display: "block" }}>
          <polygon points={p.points.map(([x, y]) => `${x},${y}`).join(" ")} fill={p.fill} />
        </svg>
      );
    }
    return <div style={{ width: "100%", height: "100%", background: p.fill, borderRadius: (p.radius || 0) * scale }} />;
  }
  if (el.type === "saiMark") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 256 256" preserveAspectRatio="xMidYMid meet">
        <rect width="256" height="256" rx="56" fill={p.fill || "#16D342"} />
        <path d="M40.0264 71.5094C36.5453 68.1207 30.9515 68.1703 27.5321 71.6202C24.1128 75.07 24.1629 80.6137 27.6439 84.0024L66.2618 120.633C66.2618 120.633 71.1345 125.091 71.1345 126.948C71.1345 128.805 66.6367 133.265 66.2618 133.634C65.887 134.002 27.5799 171.061 27.5799 171.061C24.1339 174.484 24.1409 180.028 27.5956 183.443C31.0504 186.858 36.6444 186.851 40.0904 183.428L86.1273 136.977C87.7905 135.325 91 132.628 91 126.948C91 121.267 87.8074 118.182 86.1273 116.547L40.0264 71.5094Z" fill="white" />
        <path d="M137 177.244C137 182.08 132.971 186 128 186C123.029 186 119 182.08 119 177.244L119 77.756C119 72.9202 123.029 69 128 69C132.971 69 137 72.9202 137 77.756L137 177.244Z" fill="white" />
        <path d="M216.201 71.5094C219.63 68.1207 225.139 68.1703 228.506 71.6202C231.874 75.07 231.824 80.6137 228.396 84.0024L190.363 120.633C190.363 120.633 185.565 125.091 185.565 126.948C185.565 128.805 189.994 133.265 190.363 133.634C190.733 134.002 228.459 171.061 228.459 171.061C231.853 174.484 231.846 180.028 228.444 183.443C225.041 186.858 219.532 186.851 216.138 183.428L170.799 136.977C169.161 135.325 166 132.628 166 126.948C166 121.267 169.144 118.182 170.799 116.547L216.201 71.5094Z" fill="white" />
      </svg>
    );
  }
  if (el.type === "image") {
    const fm = fadeCss(p.fade);
    return p.src ? (
      <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: p.fit || "cover", display: "block", ...(fm ? { WebkitMaskImage: fm, maskImage: fm } : {}) }} />
    ) : (
      <Placeholder label="Image — upload in inspector" />
    );
  }
  if (el.type === "ascii") return <AsciiElement el={el} />;
  return null;
}

function AsciiElement({ el }) {
  const [url, setUrl] = useState(null);
  const p = el.props;
  useEffect(() => {
    let cancelled = false;
    if (!p.src) { setUrl(null); return; }
    const renderFrom = (source) => {
      if (cancelled) return;
      try {
        const sample = sampleImage(source, p.cols);
        const cv = renderAsciiCanvas(sample, RAMPS[p.rampKey] || RAMPS.detailed, {
          fontPx: p.fontPx, scale: 2, colorMode: p.colorMode, invert: p.invert,
          transparent: true, ink: BRAND.ink, bg: BRAND.white, accent: BRAND.green, fontFamily: BRAND.mono,
        });
        setUrl(cv.toDataURL());
      } catch {
        setUrl(null);
      }
    };
    const img = new Image();
    img.onload = () => renderFrom(img);
    img.onerror = () => renderFrom(makeSampleCanvas()); // missing /butterfly.png -> drawn fallback
    img.src = p.src;
    return () => { cancelled = true; };
  }, [p.src, p.cols, p.rampKey, p.colorMode, p.invert, p.fontPx]);

  const fm = fadeCss(p.fade);
  return url ? (
    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none", ...(fm ? { WebkitMaskImage: fm, maskImage: fm } : {}) }} />
  ) : (
    <Placeholder label="ASCII — set a source in inspector" />
  );
}

function Placeholder({ label }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9a9b96", fontSize: 12, border: "1px dashed #d6d6d0", textAlign: "center", padding: 8 }}>
      {label}
    </div>
  );
}
