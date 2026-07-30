// Image preprocessing for the ASCII lab. Each control acts where it is actually
// visible in ASCII output:
//   adjustSource()      — brightness/contrast on the source → character density
//   applyStructure()    — sharpen/edge on the SAMPLED grid → outline/detail
//   applyTonemap()      — thresholding / error-diffusion dithering on the grid
//   applyOutputFilter() — hue/saturation/grayscale/sepia/invert on the rendered
//                         glyphs (colour ops need coloured output to be visible)

export const DEFAULT_ADJUST = {
  brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0, sepia: 0, invertColors: 0,
  sharpenOn: false, sharpness: 9, edgeOn: false, edge: 1,
};
export const DEFAULT_TONEMAP = { thresholdOn: false, threshold: 128, dither: "none" };
export const DITHER_MODES = ["none", "floyd-steinberg", "atkinson", "jarvis", "stucki"];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Brightness/contrast change luminance → which characters get picked (density).
// Transparency is preserved so a subject's background stays empty, not noise.
export function adjustSource(source, a = {}) {
  a = { ...DEFAULT_ADJUST, ...a };
  const ow = source.naturalWidth || source.width;
  const oh = source.naturalHeight || source.height;
  const k = Math.min(1, 1200 / Math.max(ow, oh)); // cap processing res
  const sw = Math.max(1, Math.round(ow * k));
  const sh = Math.max(1, Math.round(oh * k));
  const cv = document.createElement("canvas");
  cv.width = sw; cv.height = sh;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%)`;
  ctx.drawImage(source, 0, 0, sw, sh);
  return cv;
}

// Sharpen / edge-detect on the sampled luminance grid, so the effect survives at
// character resolution (a full-res convolution would be averaged away).
export function applyStructure(sample, a = {}) {
  a = { ...DEFAULT_ADJUST, ...a };
  if (!a.sharpenOn && !a.edgeOn) return sample;
  const { cols, rows, cells } = sample;
  let lum = cells.map((c) => c.lum);
  const at = (l, x, y) => l[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))];
  const laplacian = (l, x, y) => 4 * at(l, x, y) - at(l, x - 1, y) - at(l, x + 1, y) - at(l, x, y - 1) - at(l, x, y + 1);

  if (a.sharpenOn) {
    const amt = Math.max(0, a.sharpness) / 9; // 9 ≈ standard sharpen
    const out = lum.map((c, i) => clamp01(c + amt * laplacian(lum, i % cols, (i / cols) | 0)));
    lum = out;
  }
  if (a.edgeOn) {
    const amt = a.edge; // darken edges → outlines become dense characters
    lum = lum.map((c, i) => clamp01(c - amt * Math.abs(laplacian(lum, i % cols, (i / cols) | 0))));
  }
  for (let i = 0; i < lum.length; i++) cells[i].lum = lum[i];
  return sample;
}

// Error-diffusion kernels: [dx, dy, weight] relative to the current cell.
const DITHER = {
  "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
  jarvis: [[1, 0, 7 / 48], [2, 0, 5 / 48], [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48], [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48]],
  stucki: [[1, 0, 8 / 42], [2, 0, 4 / 42], [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42], [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42]],
};

// Hard threshold, or quantize to `rampLen` levels with error diffusion so
// gradients read cleanly. Modifies sample.cells[].lum in place.
export function applyTonemap(sample, o = {}) {
  o = { ...DEFAULT_TONEMAP, ...o };
  const { cols, rows, cells } = sample;
  if (o.thresholdOn) {
    const t = o.threshold / 255;
    for (const c of cells) c.lum = c.lum >= t ? 1 : 0;
    return sample;
  }
  const K = DITHER[o.dither];
  if (!K) return sample;
  const L = Math.max(2, o.rampLen || 2);
  const buf = cells.map((c) => c.lum);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const old = clamp01(buf[i]);
      const q = Math.round(old * (L - 1)) / (L - 1);
      cells[i].lum = q;
      const err = old - q;
      for (const [dx, dy, wt] of K) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) buf[ny * cols + nx] += err * wt;
      }
    }
  }
  return sample;
}

// Colour adjustments as a CSS filter string, applied to the rendered glyphs.
// Returns "none" when every value is at its neutral default.
export function outputFilterCss(a = {}) {
  a = { ...DEFAULT_ADJUST, ...a };
  const neutral = a.hue === 0 && a.saturation === 100 && a.grayscale === 0 && a.sepia === 0 && a.invertColors === 0;
  return neutral ? "none" : `hue-rotate(${a.hue}deg) saturate(${a.saturation}%) grayscale(${a.grayscale}%) sepia(${a.sepia}%) invert(${a.invertColors}%)`;
}

// Bake the colour filter into a new canvas so the preview and the export match.
export function applyOutputFilter(cv, a = {}) {
  const f = outputFilterCss(a);
  if (f === "none") return cv;
  const out = document.createElement("canvas");
  out.width = cv.width; out.height = cv.height;
  const ctx = out.getContext("2d");
  ctx.filter = f;
  ctx.drawImage(cv, 0, 0);
  return out;
}
