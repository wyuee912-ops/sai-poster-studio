// Client-side ASCII engine. Ported from vietnh1009/ASCII-generator (MIT):
// brightness -> character-ramp mapping, with optional per-cell color.
// Unlike the original (Python + raster), this samples at full source
// resolution and renders to VECTOR (SVG) or HIGH-DPI canvas, so output is
// crisp at any poster size — that is what fixes the low-resolution problem.

const CHAR_ASPECT = 0.5; // monospace glyph width : height

// Sample a source image/canvas into a grid of luminance + average color cells.
export function sampleImage(source, cols, charAspect = CHAR_ASPECT) {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const off = document.createElement("canvas");
  off.width = sw;
  off.height = sh;
  const ctx = off.getContext("2d", { willReadFrequently: true });
  // composite over white so transparent pixels read as light (empty), not black
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(source, 0, 0, sw, sh);
  const data = ctx.getImageData(0, 0, sw, sh).data;

  cols = Math.max(8, Math.min(600, Math.round(cols)));
  const rows = Math.max(1, Math.round((cols * charAspect * sh) / sw));
  const cells = new Array(cols * rows);

  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.floor((cy * sh) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * sh) / rows));
    for (let cx = 0; cx < cols; cx++) {
      const x0 = Math.floor((cx * sw) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * sw) / cols));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        const base = y * sw * 4;
        for (let x = x0; x < x1; x++) {
          const i = base + x * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
          n++;
        }
      }
      r /= n; g /= n; b /= n; a /= n;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      cells[cy * cols + cx] = { r, g, b, a, lum };
    }
  }
  return { cols, rows, cells, charAspect };
}

function charFor(cell, ramp, invert) {
  // darkness 0 (white) -> ramp[0] (space); 1 (black) -> last char.
  const d = invert ? cell.lum : 1 - cell.lum;
  const idx = Math.max(0, Math.min(ramp.length - 1, Math.round(d * (ramp.length - 1))));
  return ramp[idx];
}

function fillFor(cell, opts) {
  const d = opts.invert ? cell.lum : 1 - cell.lum;
  if (opts.colorMode === "color") return `rgb(${cell.r | 0},${cell.g | 0},${cell.b | 0})`;
  if (opts.colorMode === "green") return opts.accent;
  if (opts.colorMode === "duotone") {
    // blend ink -> accent by darkness
    return mix(opts.accent, opts.ink, d);
  }
  return opts.ink;
}

function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hex(h) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export const DEFAULT_RENDER = {
  fontPx: 12,
  colorMode: "mono", // mono | green | duotone | color
  ink: "#0c0c0c",
  bg: "#ffffff",
  accent: "#16d342",
  invert: false,
  transparent: true,
};

// Render to a high-DPI canvas. `scale` multiplies the glyph size (2-4 = crisp).
export function renderAsciiCanvas(sample, ramp, options = {}) {
  const o = { ...DEFAULT_RENDER, ...options };
  const scale = o.scale || 1;
  const glyphH = o.fontPx * scale;
  const glyphW = glyphH * sample.charAspect * (o.spaceDensity || 1);
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(sample.cols * glyphW);
  cv.height = Math.ceil(sample.rows * glyphH);
  const ctx = cv.getContext("2d");
  if (!o.transparent) {
    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  ctx.font = `${glyphH}px ${o.fontFamily || "ui-monospace, Menlo, Consolas, monospace"}`;
  ctx.textBaseline = "top";
  for (let cy = 0; cy < sample.rows; cy++) {
    for (let cx = 0; cx < sample.cols; cx++) {
      const cell = sample.cells[cy * sample.cols + cx];
      const ch = charFor(cell, ramp, o.invert);
      if (ch === " ") continue;
      ctx.fillStyle = fillFor(cell, o);
      ctx.fillText(ch, cx * glyphW, cy * glyphH);
    }
  }
  return cv;
}

// Render to crisp VECTOR SVG markup (string). Single-color modes use one
// <text> per row (compact); color/duotone use per-char <tspan>.
export function renderAsciiSvg(sample, ramp, options = {}) {
  const o = { ...DEFAULT_RENDER, ...options };
  const glyphH = o.fontPx;
  const glyphW = glyphH * sample.charAspect * (o.spaceDensity || 1);
  const W = (sample.cols * glyphW).toFixed(1);
  const H = (sample.rows * glyphH).toFixed(1);
  const perChar = o.colorMode === "color" || o.colorMode === "duotone";
  const fontStack = "ui-monospace, Menlo, Consolas, monospace";
  let body = "";
  const esc = (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c);
  for (let cy = 0; cy < sample.rows; cy++) {
    const y = ((cy + 0.8) * glyphH).toFixed(1);
    if (perChar) {
      let spans = "";
      for (let cx = 0; cx < sample.cols; cx++) {
        const cell = sample.cells[cy * sample.cols + cx];
        const ch = charFor(cell, ramp, o.invert);
        if (ch === " ") continue;
        spans += `<tspan x="${(cx * glyphW).toFixed(1)}" fill="${fillFor(cell, o)}">${esc(ch)}</tspan>`;
      }
      if (spans) body += `<text y="${y}">${spans}</text>`;
    } else {
      let line = "";
      for (let cx = 0; cx < sample.cols; cx++) {
        line += charFor(sample.cells[cy * sample.cols + cx], ramp, o.invert);
      }
      if (line.trim()) {
        body += `<text x="0" y="${y}" fill="${o.colorMode === "green" ? o.accent : o.ink}" xml:space="preserve">${esc2(line)}</text>`;
      }
    }
  }
  const bg = o.transparent ? "" : `<rect width="${W}" height="${H}" fill="${o.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${fontStack}' font-size="${glyphH}" style="white-space:pre">${bg}${body}</svg>`;
}
function esc2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plain-text ASCII (for copy / .txt export).
export function asciiToText(sample, ramp, invert) {
  let out = "";
  for (let cy = 0; cy < sample.rows; cy++) {
    for (let cx = 0; cx < sample.cols; cx++) {
      out += charFor(sample.cells[cy * sample.cols + cx], ramp, invert);
    }
    out += "\n";
  }
  return out;
}
