// Decorative full-canvas backgrounds, drawn BEHIND all elements. Rendered three
// ways so the editor preview, PNG export, and SVG export match exactly:
//   decorStyle(decor, scale) -> CSS style object for the editor overlay div
//   drawDecor(ctx, decor, W, H, scale) -> paints onto the export canvas
//   decorSvg(decor, W, H) -> vector SVG string
// A `decor` is { kind, color, opacity, gap }. kind "none"/absent => nothing.
export const DECOR_KINDS = ["none", "grid", "dots", "glow"];
const GAP = 64, DOT = 2.2, LINE = 1, DEF_OP = 0.14;

const has = (d) => d && d.kind && d.kind !== "none";

export function decorStyle(decor, scale = 1) {
  if (!has(decor)) return null;
  const c = decor.color || "#16d342";
  const g = (decor.gap || GAP) * scale;
  const op = decor.opacity ?? DEF_OP;
  if (decor.kind === "grid")
    return { opacity: op, backgroundImage: `linear-gradient(${c} ${LINE * scale}px, transparent ${LINE * scale}px), linear-gradient(90deg, ${c} ${LINE * scale}px, transparent ${LINE * scale}px)`, backgroundSize: `${g}px ${g}px` };
  if (decor.kind === "dots")
    return { opacity: op, backgroundImage: `radial-gradient(${c} ${DOT * scale}px, transparent ${DOT * scale}px)`, backgroundSize: `${g}px ${g}px` };
  if (decor.kind === "glow")
    return { opacity: Math.min(1, op * 3), background: `radial-gradient(60% 50% at 50% 28%, ${c}, transparent 70%)` };
  return null;
}

export function drawDecor(ctx, decor, W, H, scale = 1) {
  if (!has(decor)) return;
  const c = decor.color || "#16d342";
  const g = (decor.gap || GAP) * scale;
  const op = decor.opacity ?? DEF_OP;
  ctx.save();
  if (decor.kind === "grid") {
    ctx.globalAlpha = op; ctx.strokeStyle = c; ctx.lineWidth = LINE * scale;
    for (let x = 0; x <= W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else if (decor.kind === "dots") {
    ctx.globalAlpha = op; ctx.fillStyle = c;
    for (let x = g / 2; x <= W; x += g) for (let y = g / 2; y <= H; y += g) { ctx.beginPath(); ctx.arc(x, y, DOT * scale, 0, Math.PI * 2); ctx.fill(); }
  } else if (decor.kind === "glow") {
    const r = Math.max(W, H) * 0.6;
    const grd = ctx.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.28, r);
    grd.addColorStop(0, rgba(c, Math.min(1, op * 3)));
    grd.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

export function decorSvg(decor, W, H) {
  if (!has(decor)) return "";
  const c = decor.color || "#16d342";
  const g = decor.gap || GAP;
  const op = decor.opacity ?? DEF_OP;
  if (decor.kind === "grid")
    return `<g opacity="${op}"><defs><pattern id="dgrid" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M ${g} 0 L 0 0 0 ${g}" fill="none" stroke="${c}" stroke-width="${LINE}"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#dgrid)"/></g>`;
  if (decor.kind === "dots")
    return `<g opacity="${op}"><defs><pattern id="ddots" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><circle cx="${g / 2}" cy="${g / 2}" r="${DOT}" fill="${c}"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#ddots)"/></g>`;
  if (decor.kind === "glow")
    return `<defs><radialGradient id="dglow" cx="50%" cy="28%" r="60%"><stop offset="0%" stop-color="${c}" stop-opacity="${Math.min(1, op * 3)}"/><stop offset="70%" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#dglow)"/>`;
  return "";
}

function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
