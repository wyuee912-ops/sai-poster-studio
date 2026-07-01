// Compose the whole poster to a high-res PNG (canvas) or vector SVG (string).
// PNG draws with the canvas 2D API so text uses the page's real Manrope font;
// ASCII layers are rendered by the engine at high scale. SVG is true vector
// (text wrapped into tspans, shapes/paths as vector, ASCII embedded high-res).
import { BRAND, SAI_MARK_PATHS, fontStack, fontName, GOOGLE_FONTS_HREF } from "../brand.js";
import { RAMPS } from "../ascii/charRamps.js";
import { sampleImage, renderAsciiCanvas } from "../ascii/asciiEngine.js";
import { fitFont } from "./textfit.js";
import { makeSampleCanvas } from "./model.js";
import { drawDecor, decorSvg } from "./decor.js";
import { hiSetOf, tokenize, isHi } from "./richtext.js";
import { applyFadeCanvas, fadeSvgMask } from "./fade.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fit(sw, sh, bw, bh, mode) {
  const k = mode === "cover" ? Math.max(bw / sw, bh / sh) : Math.min(bw / sw, bh / sh);
  const w = sw * k, h = sh * k;
  return { w, h, dx: (bw - w) / 2, dy: (bh - h) / 2 };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

function wrapLines(ctx, text, maxWidth) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (line && ctx.measureText(test).width > maxWidth) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

// Render an ASCII element's source to a high-res canvas (transparent bg).
async function asciiCanvas(el) {
  const p = el.props;
  if (!p.src) return null;
  let source;
  try {
    source = await loadImage(p.src);
  } catch {
    source = makeSampleCanvas(); // missing /butterfly.png -> drawn fallback
  }
  const sample = sampleImage(source, p.cols);
  return renderAsciiCanvas(sample, RAMPS[p.rampKey] || RAMPS.detailed, {
    fontPx: p.fontPx,
    scale: 3,
    colorMode: p.colorMode,
    invert: p.invert,
    transparent: true,
    ink: BRAND.ink,
    bg: BRAND.white,
    accent: BRAND.green,
    fontFamily: BRAND.mono,
  });
}

export async function renderPosterCanvas(doc, scale = 3) {
  // preload exactly the fonts/weights this poster uses, so canvas text renders
  // with the chosen family instead of a fallback.
  if (document.fonts?.load) {
    try {
      const needed = new Set();
      for (const el of doc.elements) if (el.type === "text") needed.add(`${el.props.weight || 700} 80px "${fontName(el.props.font)}"`);
      await Promise.all([...needed].map((f) => document.fonts.load(f)));
      await document.fonts.ready;
    } catch {}
  }
  const cv = document.createElement("canvas");
  cv.width = Math.round(doc.size.w * scale);
  cv.height = Math.round(doc.size.h * scale);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = doc.background || "#ffffff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  drawDecor(ctx, doc.decor, cv.width, cv.height, scale);

  for (const el of doc.elements) {
    if (el.visible === false) continue;
    const p = el.props || {};
    const op = p.opacity ?? 1;
    const X = el.x * scale, Y = el.y * scale, W = el.w * scale, H = el.h * scale;
    ctx.save();
    ctx.globalAlpha = op;
    if (el.rotation) {
      const cx = X + W / 2, cy = Y + H / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (el.type === "tile") {
      ctx.fillStyle = p.fill || "#000";
      ctx.font = `${(p.weight || 700)} ${(p.fontSize || 28) * scale}px Manrope, Arial, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const sx = (p.gapX || 150) * scale, sy = (p.gapY || 120) * scale;
      for (let yy = Y + sy / 2; yy < Y + H; yy += sy) {
        const off = (Math.round((yy - Y) / sy) % 2) * (sx / 2);
        for (let xx = X - sx + off; xx < X + W + sx; xx += sx) ctx.fillText(p.text || "sai", xx, yy);
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    } else if (el.type === "text") {
      const stack = fontStack(p.font);
      const effSize = p.shrink ? fitFont(p.text, p.fontSize, p.weight, el.w, p.uppercase, stack) : p.fontSize;
      ctx.textBaseline = "top";
      ctx.fillStyle = p.color;
      ctx.font = `${p.weight} ${effSize * scale}px ${stack}`;
      const align = p.align === "center" ? "center" : p.align === "right" ? "right" : "left";
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${(p.tracking || 0) * scale}px`;
      const tx = align === "center" ? X + W / 2 : align === "right" ? X + W : X;
      const lineH = effSize * (p.lineHeight || 1.1) * scale;
      const content = p.uppercase ? String(p.text).toUpperCase() : p.text;
      ctx.textAlign = align;
      const lines = wrapLines(ctx, content, W);
      const hiSet = hiSetOf(p.highlight);
      if (hiSet.size) {
        const hiColor = p.highlightColor || BRAND.green;
        ctx.textAlign = "left"; // draw token-by-token at computed x
        lines.forEach((ln, i) => {
          const toks = tokenize(ln);
          const widths = toks.map((t) => ctx.measureText(t).width);
          const total = widths.reduce((a, b) => a + b, 0);
          let cx = align === "center" ? tx - total / 2 : align === "right" ? tx - total : tx;
          const yy = Y + i * lineH;
          toks.forEach((t, j) => { ctx.fillStyle = isHi(t, hiSet) ? hiColor : p.color; ctx.fillText(t, cx, yy); cx += widths[j]; });
        });
      } else {
        lines.forEach((ln, i) => ctx.fillText(ln, tx, Y + i * lineH));
      }
      ctx.textAlign = "left";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    } else if (el.type === "accent") {
      ctx.fillStyle = p.fill;
      roundRect(ctx, X, Y, W, H, (p.radius || 0) * scale);
      ctx.fill();
    } else if (el.type === "shape") {
      ctx.fillStyle = p.fill;
      if (p.kind === "polygon" && p.points) {
        ctx.beginPath();
        p.points.forEach(([px, py], i) => {
          const cxp = (el.x + px * el.w) * scale, cyp = (el.y + py * el.h) * scale;
          i ? ctx.lineTo(cxp, cyp) : ctx.moveTo(cxp, cyp);
        });
        ctx.closePath();
        ctx.fill();
      } else {
        roundRect(ctx, X, Y, W, H, (p.radius || 0) * scale);
        ctx.fill();
      }
    } else if (el.type === "saiMark") {
      const s = (Math.min(el.w, el.h) * scale) / 256;
      const ox = X + (W - 256 * s) / 2;
      const oy = Y + (H - 256 * s) / 2;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(s, s);
      ctx.fillStyle = p.fill || "#16D342";
      roundRect(ctx, 0, 0, 256, 256, 56);
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (const d of SAI_MARK_PATHS) ctx.fill(new Path2D(d));
      ctx.restore();
    } else if (el.type === "image" && p.src) {
      try {
        const img = await loadImage(p.src);
        const f = fit(img.naturalWidth, img.naturalHeight, W, H, p.fit || "cover");
        if (p.fade === "down" || p.fade === "up") {
          const ow = Math.max(1, Math.round(W)), oh = Math.max(1, Math.round(H));
          const off = document.createElement("canvas"); off.width = ow; off.height = oh;
          const octx = off.getContext("2d");
          octx.save(); octx.beginPath(); octx.rect(0, 0, ow, oh); octx.clip();
          octx.drawImage(img, f.dx, f.dy, f.w, f.h); octx.restore();
          applyFadeCanvas(octx, ow, oh, p.fade);
          ctx.drawImage(off, X, Y);
        } else {
          ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
          ctx.drawImage(img, X + f.dx, Y + f.dy, f.w, f.h); ctx.restore();
        }
      } catch {}
    } else if (el.type === "ascii") {
      const ac = await asciiCanvas(el);
      if (ac) {
        const f = fit(ac.width, ac.height, W, H, "contain");
        if (p.fade === "down" || p.fade === "up") {
          const ow = Math.max(1, Math.round(W)), oh = Math.max(1, Math.round(H));
          const off = document.createElement("canvas"); off.width = ow; off.height = oh;
          const octx = off.getContext("2d");
          octx.drawImage(ac, f.dx, f.dy, f.w, f.h);
          applyFadeCanvas(octx, ow, oh, p.fade);
          ctx.drawImage(off, X, Y);
        } else {
          ctx.drawImage(ac, X + f.dx, Y + f.dy, f.w, f.h);
        }
      }
    }
    ctx.restore();
  }
  return cv;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function renderPosterSvg(doc) {
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
  const meas = document.createElement("canvas").getContext("2d");
  const W = doc.size.w, H = doc.size.h;
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${doc.background || "#ffffff"}"/>`);
  parts.push(decorSvg(doc.decor, W, H));

  for (const el of doc.elements) {
    if (el.visible === false) continue;
    const p = el.props || {};
    const op = p.opacity ?? 1;
    const opAttr = op !== 1 ? ` opacity="${op}"` : "";
    if (el.rotation) parts.push(`<g transform="rotate(${el.rotation} ${(el.x + el.w / 2).toFixed(1)} ${(el.y + el.h / 2).toFixed(1)})">`);

    if (el.type === "tile") {
      const sx = p.gapX || 150, sy = p.gapY || 120;
      let cells = "";
      for (let yy = el.y + sy / 2; yy < el.y + el.h; yy += sy) {
        const off = (Math.round((yy - el.y) / sy) % 2) * (sx / 2);
        for (let xx = el.x - sx + off; xx < el.x + el.w + sx; xx += sx) {
          cells += `<text x="${xx.toFixed(0)}" y="${yy.toFixed(0)}" text-anchor="middle" dominant-baseline="middle" font-weight="${p.weight || 700}" font-size="${p.fontSize || 28}" fill="${p.fill || "#000"}">${esc(p.text || "sai")}</text>`;
        }
      }
      parts.push(`<g clip-path="url(#clip-${el.id})"><clipPath id="clip-${el.id}"><rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/></clipPath>${cells}</g>`);
    } else if (el.type === "text") {
      const stack = fontStack(p.font);
      const effSize = p.shrink ? fitFont(p.text, p.fontSize, p.weight, el.w, p.uppercase, stack) : p.fontSize;
      const content = p.uppercase ? String(p.text).toUpperCase() : p.text;
      meas.font = `${p.weight} ${effSize}px ${stack}`;
      const lines = wrapLines(meas, content, el.w);
      const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
      const tx = p.align === "center" ? el.x + el.w / 2 : p.align === "right" ? el.x + el.w : el.x;
      const lineH = effSize * (p.lineHeight || 1.1);
      const track = p.tracking ? ` letter-spacing="${p.tracking}"` : "";
      const hiSet = hiSetOf(p.highlight);
      const hiColor = p.highlightColor || BRAND.green;
      const lineContent = (ln) =>
        hiSet.size ? tokenize(ln).map((t) => (isHi(t, hiSet) ? `<tspan fill="${hiColor}">${esc(t)}</tspan>` : esc(t))).join("") : esc(ln);
      const tspans = lines
        .map((ln, i) => `<tspan x="${tx.toFixed(1)}" y="${(el.y + effSize * 0.82 + i * lineH).toFixed(1)}">${lineContent(ln)}</tspan>`)
        .join("");
      parts.push(`<text font-family="${stack.replace(/"/g, "'")}" font-weight="${p.weight}" font-size="${effSize}" fill="${p.color}" text-anchor="${anchor}"${track}${opAttr}>${tspans}</text>`);
    } else if (el.type === "accent") {
      parts.push(`<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${p.radius || 0}" fill="${p.fill}"${opAttr}/>`);
    } else if (el.type === "shape") {
      if (p.kind === "polygon" && p.points) {
        const pts = p.points.map(([px, py]) => `${(el.x + px * el.w).toFixed(1)},${(el.y + py * el.h).toFixed(1)}`).join(" ");
        parts.push(`<polygon points="${pts}" fill="${p.fill}"${opAttr}/>`);
      } else {
        parts.push(`<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${p.radius || 0}" fill="${p.fill}"${opAttr}/>`);
      }
    } else if (el.type === "saiMark") {
      const s = Math.min(el.w, el.h) / 256;
      const ox = el.x + (el.w - 256 * s) / 2;
      const oy = el.y + (el.h - 256 * s) / 2;
      const paths = SAI_MARK_PATHS.map((d) => `<path d="${d}" fill="white"/>`).join("");
      parts.push(`<g transform="translate(${ox.toFixed(1)},${oy.toFixed(1)}) scale(${s.toFixed(4)})"${opAttr}><rect width="256" height="256" rx="56" fill="${p.fill || "#16D342"}"/>${paths}</g>`);
    } else if (el.type === "image" && p.src) {
      const par = (p.fit || "cover") === "cover" ? "xMidYMid slice" : "xMidYMid meet";
      const { def, attr } = fadeSvgMask(el.id, p.fade, el.x, el.y, el.w, el.h);
      parts.push(`${def}<image x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" href="${p.src}" preserveAspectRatio="${par}"${opAttr}${attr}/>`);
    } else if (el.type === "ascii" && p.src) {
      const ac = await asciiCanvas(el);
      if (ac) {
        const f = fit(ac.width, ac.height, el.w, el.h, "contain");
        const { def, attr } = fadeSvgMask(el.id, p.fade, el.x + f.dx, el.y + f.dy, f.w, f.h);
        parts.push(`${def}<image x="${(el.x + f.dx).toFixed(1)}" y="${(el.y + f.dy).toFixed(1)}" width="${f.w.toFixed(1)}" height="${f.h.toFixed(1)}" href="${ac.toDataURL()}"${opAttr}${attr}/>`);
      }
    }
    if (el.rotation) parts.push(`</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>@import url('${GOOGLE_FONTS_HREF}');</style>${parts.join("")}</svg>`;
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export async function exportPng(doc, scale = 3) {
  const cv = await renderPosterCanvas(doc, scale);
  await new Promise((res) => cv.toBlob((b) => { download(b, `sai-poster-${doc.size.key}@${scale}x.png`); res(); }, "image/png"));
}

export async function exportSvg(doc) {
  const svg = await renderPosterSvg(doc);
  download(new Blob([svg], { type: "image/svg+xml" }), `sai-poster-${doc.size.key}.svg`);
}
