// Sai / Simular brand tokens.
export const BRAND = {
  white: "#ffffff",
  ink: "#0c0c0c",
  text: "#15161a",
  muted: "#43454d",
  soft: "#9a9b96",
  green: "#16d342",
  greenInk: "#0b7d28",
  cream: "#fff2e2",
  font: '"Manrope", ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

// Selectable text fonts (Simular brand type set + a mono). `name` is the family
// for document.fonts.load(); `stack` is the CSS/canvas font-family list.
export const FONTS = {
  manrope: { label: "Manrope", name: "Manrope", stack: "'Manrope', system-ui, Arial, sans-serif" },
  inter: { label: "Inter", name: "Inter", stack: "'Inter', system-ui, Arial, sans-serif" },
  adamina: { label: "Adamina · serif", name: "Adamina", stack: "'Adamina', Georgia, serif" },
  instrument: { label: "Instrument Sans", name: "Instrument Sans", stack: "'Instrument Sans', system-ui, sans-serif" },
  mono: { label: "JetBrains Mono", name: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, monospace" },
};
export const fontStack = (key) => (FONTS[key] || FONTS.manrope).stack;
export const fontName = (key) => (FONTS[key] || FONTS.manrope).name;

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Adamina&family=Inter:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&family=Manrope:wght@400;500;600;700;800&display=swap";

// The Sai mark as an SVG group (green rounded square + white >|<).
export const SAI_MARK_PATHS = [
  "M40.0264 71.5094C36.5453 68.1207 30.9515 68.1703 27.5321 71.6202C24.1128 75.07 24.1629 80.6137 27.6439 84.0024L66.2618 120.633C66.2618 120.633 71.1345 125.091 71.1345 126.948C71.1345 128.805 66.6367 133.265 66.2618 133.634C65.887 134.002 27.5799 171.061 27.5799 171.061C24.1339 174.484 24.1409 180.028 27.5956 183.443C31.0504 186.858 36.6444 186.851 40.0904 183.428L86.1273 136.977C87.7905 135.325 91 132.628 91 126.948C91 121.267 87.8074 118.182 86.1273 116.547L40.0264 71.5094Z",
  "M137 177.244C137 182.08 132.971 186 128 186C123.029 186 119 182.08 119 177.244L119 77.756C119 72.9202 123.029 69 128 69C132.971 69 137 72.9202 137 77.756L137 177.244Z",
  "M216.201 71.5094C219.63 68.1207 225.139 68.1703 228.506 71.6202C231.874 75.07 231.824 80.6137 228.396 84.0024L190.363 120.633C190.363 120.633 185.565 125.091 185.565 126.948C185.565 128.805 189.994 133.265 190.363 133.634C190.733 134.002 228.459 171.061 228.459 171.061C231.853 174.484 231.846 180.028 228.444 183.443C225.041 186.858 219.532 186.851 216.138 183.428L170.799 136.977C169.161 135.325 166 132.628 166 126.948C166 121.267 169.144 118.182 170.799 116.547L216.201 71.5094Z",
];

// Platform poster sizes.
export const SIZES = {
  x: { w: 1600, h: 900, name: "X / Twitter (1600x900)" },
  linkedin: { w: 1200, h: 627, name: "LinkedIn (1200x627)" },
  "instagram-square": { w: 1080, h: 1080, name: "Instagram square (1080x1080)" },
  "instagram-portrait": { w: 1080, h: 1350, name: "Instagram portrait (1080x1350)" },
};
