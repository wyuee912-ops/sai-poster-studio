// Poster document model. Plain JSON — the OpenPoster layer idea, none of its
// Apple .ca format. Stacking is array order (first = bottom).
import { BRAND, SIZES } from "../brand.js";

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "el" + Math.random().toString(36).slice(2, 9));

function base(type, name, x, y, w, h, props) {
  return { id: uid(), type, name, x, y, w, h, rotation: 0, visible: true, props };
}

export const factories = {
  text: (o = {}) =>
    base("text", o.name || "Text", o.x ?? 80, o.y ?? 80, o.w ?? 760, o.h ?? 180, {
      text: "Headline",
      fontSize: 80,
      weight: 800,
      color: BRAND.ink,
      align: "left",
      lineHeight: 1.06,
      uppercase: false,
      tracking: 0,
      font: "manrope",
      ...o.props,
    }),
  shape: (o = {}) =>
    base("shape", o.name || "Shape", o.x ?? 0, o.y ?? 0, o.w ?? 300, o.h ?? 200, {
      kind: o.kind || "rect", // "rect" | "polygon"
      points: o.points || null, // [[x,y],...] in 0..1 of the box (polygon)
      fill: o.fill || BRAND.green,
      radius: o.radius || 0,
      ...o.props,
    }),
  tile: (o = {}) =>
    base("tile", o.name || "Pattern", o.x ?? 0, o.y ?? 0, o.w ?? 1080, o.h ?? 1080, {
      text: "sai",
      fontSize: 30,
      weight: 700,
      fill: "#0c0c0c",
      gapX: 160,
      gapY: 128,
      ...o.props,
    }),
  accent: (o = {}) =>
    base("accent", o.name || "Accent bar", o.x ?? 84, o.y ?? 300, o.w ?? 150, o.h ?? 14, {
      fill: BRAND.green,
      radius: 3,
      ...o.props,
    }),
  saiMark: (o = {}) =>
    base("saiMark", o.name || "Sai mark", o.x ?? 80, o.y ?? 60, o.w ?? 84, o.h ?? 84, { ...o.props }),
  image: (o = {}) =>
    base("image", o.name || "Image", o.x ?? 200, o.y ?? 200, o.w ?? 420, o.h ?? 420, {
      src: o.src || "",
      fit: "cover",
      opacity: 1,
      ...o.props,
    }),
  ascii: (o = {}) =>
    base("ascii", o.name || "ASCII art", o.x ?? 820, o.y ?? 120, o.w ?? 660, o.h ?? 640, {
      src: o.src || "",
      cols: 130,
      rampKey: "detailed",
      colorMode: "mono",
      invert: false,
      fontPx: 11,
      ...o.props,
    }),
};

// Default ASCII source. Drop a real image at poster-studio/public/butterfly.png
// and it's used automatically (same-origin = CORS-safe); otherwise the engine
// falls back to the drawn butterfly below.
export const DEFAULT_ASCII_SRC = "/butterfly.png";

// Drawn fallback butterfly (spread wings) for when no butterfly.png is present.
export function makeSampleCanvas() {
  const W = 900, H = 640, cx = 450, cy = 320;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // wings: light centers, dark edges -> dense ASCII along the wing outlines
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 380);
  grad.addColorStop(0, "#cfcfcf");
  grad.addColorStop(0.55, "#3c3c3c");
  grad.addColorStop(1, "#060606");
  ctx.fillStyle = grad;
  const wing = (dx, dy, rx, ry, rot) => {
    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  wing(-175, -75, 205, 145, -0.55); // upper left (wide, fanned up)
  wing(175, -75, 205, 145, 0.55); // upper right
  wing(-105, 145, 110, 150, -0.12); // lower left (narrow, tall)
  wing(105, 145, 110, 150, 0.12); // lower right
  // body + head
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 16, 155, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - 158, 18, 0, Math.PI * 2);
  ctx.fill();
  // antennae
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 168);
  ctx.quadraticCurveTo(cx - 55, cy - 240, cx - 90, cy - 262);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 168);
  ctx.quadraticCurveTo(cx + 55, cy - 240, cx + 90, cy - 262);
  ctx.stroke();
  return c;
}

export function makeSampleDataUrl() {
  return makeSampleCanvas().toDataURL();
}

export function defaultDoc(sizeKey = "x", seed = {}) {
  const size = SIZES[sizeKey] || SIZES.x;
  const sample = makeSampleDataUrl();
  const headline = seed.headline || "An always-on AI coworker.";
  const proof = seed.proofLine || "72.6% super-human success rate on OSWorld";
  return {
    size: { w: size.w, h: size.h, key: sizeKey },
    background: BRAND.white,
    elements: [
      factories.ascii({ x: size.w * 0.54, y: 60, w: size.w * 0.42, h: size.h - 120, src: sample, props: { colorMode: "green", cols: 120, fontPx: 11 } }),
      factories.saiMark({ x: 84, y: 70, w: 80, h: 80 }),
      factories.text({ name: "Headline", x: 84, y: Math.round(size.h * 0.3), w: Math.round(size.w * 0.46), h: 280, props: { text: headline, fontSize: Math.round(size.w / 19), weight: 800, color: "#0c0c0c", lineHeight: 1.05 } }),
      factories.accent({ x: 88, y: Math.round(size.h * 0.58), w: 150, h: 14 }),
      factories.text({ name: "Proof line", x: 84, y: Math.round(size.h * 0.64), w: Math.round(size.w * 0.46), h: 120, props: { text: proof, fontSize: Math.round(size.w / 42), weight: 600, color: "#43454d" } }),
      factories.text({ name: "Footer", x: 84, y: size.h - 80, w: 320, h: 48, props: { text: "simular.ai", fontSize: Math.round(size.w / 60), weight: 700, color: "#9a9b96" } }),
    ],
  };
}

export function clone(doc) {
  return JSON.parse(JSON.stringify(doc));
}
