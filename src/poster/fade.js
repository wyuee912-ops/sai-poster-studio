// Vertical opacity fade for image / ASCII layers — "down" = solid at the top,
// fading to transparent at the bottom; "up" = the reverse. Rendered three ways
// so the editor, PNG, and SVG match:
//   fadeCss(fade)                      -> CSS mask-image for the editor <img>
//   applyFadeCanvas(octx, w, h, fade)  -> alpha-gradient composite on an offscreen
//   fadeSvgMask(id, fade, x, y, w, h)  -> { def, attr } to mask an SVG <image>
export const FADE_DIRS = ["none", "down", "up"];

const active = (f) => f === "down" || f === "up";

export function fadeCss(fade) {
  if (fade === "down") return "linear-gradient(to bottom, #000 30%, transparent 100%)";
  if (fade === "up") return "linear-gradient(to top, #000 30%, transparent 100%)";
  return null;
}

// Call on an offscreen canvas that already holds the image; erases with a
// vertical alpha ramp so the layer fades into whatever is behind it.
export function applyFadeCanvas(octx, w, h, fade) {
  if (!active(fade)) return;
  octx.globalCompositeOperation = "destination-in";
  const g = octx.createLinearGradient(0, 0, 0, h);
  const stops = fade === "down" ? [[0, 1], [0.3, 1], [1, 0]] : [[0, 0], [0.7, 1], [1, 1]];
  for (const [o, a] of stops) g.addColorStop(o, `rgba(0,0,0,${a})`);
  octx.fillStyle = g;
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = "source-over";
}

export function fadeSvgMask(id, fade, x, y, w, h) {
  if (!active(fade)) return { def: "", attr: "" };
  const stops =
    fade === "down"
      ? `<stop offset="30%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/>`
      : `<stop offset="0%" stop-color="#000"/><stop offset="70%" stop-color="#fff"/>`;
  const def = `<defs><linearGradient id="fg-${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><mask id="fm-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#fg-${id})"/></mask></defs>`;
  return { def, attr: ` mask="url(#fm-${id})"` };
}
