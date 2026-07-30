// Image preprocessing for the ASCII lab, mirroring asciiart.eu's controls:
//   adjustSource() — colour/tone adjustments (canvas filters) + sharpen + edge
//   applyTonemap() — thresholding or error-diffusion dithering on the sampled grid

export const DEFAULT_ADJUST = {
  brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0, sepia: 0, invertColors: 0,
  sharpenOn: false, sharpness: 9, edgeOn: false, edge: 1,
};

export const DEFAULT_TONEMAP = { thresholdOn: false, threshold: 128, dither: "none" };

// Returns a canvas with the adjustments applied, ready for sampleImage().
export function adjustSource(source, a = {}) {
  a = { ...DEFAULT_ADJUST, ...a };
  const ow = source.naturalWidth || source.width;
  const oh = source.naturalHeight || source.height;
  const k = Math.min(1, 1200 / Math.max(ow, oh)); // cap processing res so convolutions stay fast
  const sw = Math.max(1, Math.round(ow * k));
  const sh = Math.max(1, Math.round(oh * k));
  const cv = document.createElement("canvas");
  cv.width = sw; cv.height = sh;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sw, sh);
  ctx.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) hue-rotate(${a.hue}deg) grayscale(${a.grayscale}%) sepia(${a.sepia}%) invert(${a.invertColors}%)`;
  ctx.drawImage(source, 0, 0, sw, sh);
  ctx.filter = "none";
  if (a.sharpenOn || a.edgeOn) {
    let img = ctx.getImageData(0, 0, sw, sh);
    if (a.sharpenOn) img = sharpen(img, sw, sh, a.sharpness);
    if (a.edgeOn) img = edgeEnhance(img, sw, sh, a.edge);
    ctx.putImageData(img, 0, 0);
  }
  return cv;
}

function convolve3(img, w, h, k) {
  const s = img.data;
  const out = new Uint8ClampedArray(s.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const yy = Math.min(h - 1, Math.max(0, y + ky));
        for (let kx = -1; kx <= 1; kx++) {
          const xx = Math.min(w - 1, Math.max(0, x + kx));
          const i = (yy * w + xx) * 4;
          const kv = k[(ky + 1) * 3 + (kx + 1)];
          r += s[i] * kv; g += s[i + 1] * kv; b += s[i + 2] * kv;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = s[o + 3];
    }
  }
  return new ImageData(out, w, h);
}

function sharpen(img, w, h, amount) {
  const a = Math.max(0, amount) / 9; // 9 ≈ standard sharpen
  return convolve3(img, w, h, [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0]);
}

function edgeEnhance(img, w, h, amount) {
  const lap = convolve3(img, w, h, [0, -1, 0, -1, 4, -1, 0, -1, 0]);
  const s = img.data, e = lap.data, out = new Uint8ClampedArray(s.length);
  for (let i = 0; i < s.length; i += 4) {
    out[i] = s[i] + e[i] * amount;
    out[i + 1] = s[i + 1] + e[i + 1] * amount;
    out[i + 2] = s[i + 2] + e[i + 2] * amount;
    out[i + 3] = s[i + 3];
  }
  return new ImageData(out, w, h);
}

// Error-diffusion kernels: [dx, dy, weight] relative to the current cell.
const DITHER = {
  "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
  jarvis: [[1, 0, 7 / 48], [2, 0, 5 / 48], [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48], [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48]],
  stucki: [[1, 0, 8 / 42], [2, 0, 4 / 42], [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42], [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42]],
};
export const DITHER_MODES = ["none", "floyd-steinberg", "atkinson", "jarvis", "stucki"];

// Modifies sample.cells[].lum in place: hard threshold, or quantize with error
// diffusion to `rampLen` levels so gradients read cleanly.
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
      const old = Math.max(0, Math.min(1, buf[i]));
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
