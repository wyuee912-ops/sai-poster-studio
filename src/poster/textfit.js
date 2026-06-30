// Shrink-to-fit for display text: returns the largest font size <= base where
// every (newline-split) line fits maxWidth. Keeps big titles from clipping or
// overflowing their box regardless of how long the text is — the key to
// templates that stay aligned no matter what the user types.
let _ctx = null;
function ctx() {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  return _ctx;
}

export function fitFont(text, baseSize, weight, maxWidth, uppercase, stack) {
  const c = ctx();
  const content = uppercase ? String(text || "").toUpperCase() : String(text || "");
  c.font = `${weight} ${baseSize}px ${stack || "Manrope, Arial, sans-serif"}`;
  let size = baseSize;
  for (const ln of content.split("\n")) {
    if (!ln.trim()) continue;
    const wdt = c.measureText(ln).width;
    if (wdt > maxWidth) size = Math.min(size, (baseSize * maxWidth) / wdt);
  }
  return Math.max(8, Math.floor(size));
}
