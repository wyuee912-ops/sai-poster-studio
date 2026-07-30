// Character ramps ("ASCII gradients" / glyph styles), ordered LIGHT -> DARK
// (index 0 = lightest = space). The named modes mirror common image-to-ASCII
// converters. Old keys are kept so existing poster ASCII layers don't break.
export const RAMPS = {
  // classic
  standard: " .:-=+*#%@",
  normal2: " .,:;i1tfLCG08@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  // letters / numbers
  alphabetic: " .ilcvxznufjtrLCYUJQOZmwqpdbkhaoMWB@",
  alphanumeric: " .1il7tj2r3xu4vc5z6nY8UCLQ0OZmwqpdbkhaoMWB9@",
  numerical: " .1723456890",
  // symbol sets
  code: " .:=*/<>[]{}#@",
  math: " .·−+±×÷≡≈▒▓█",
  arrow: " .·:▹▸►◆◼█",
  // block / shading
  grayscale: " ░▒▓█",
  cp437: " ·░▒▓█",
  blocks: " ░▒▓█",
  // low-detail / extras
  minimal: " .oO@",
  minimalist: " .:-#",
  dots: "  ··••●●",
  hatch: "  ..:::!!||##",
  binary: " .01",
  maxbw: " █",
};

export const RAMP_LABELS = {
  standard: "Normal",
  normal2: "Normal 2",
  detailed: "Extended High",
  alphabetic: "Alphabetic",
  alphanumeric: "Alphanumeric",
  numerical: "Numerical",
  code: "Code symbols",
  math: "Math symbols",
  arrow: "Arrow",
  grayscale: "Gray scale",
  cp437: "Code Page 437",
  blocks: "Blocks",
  minimal: "Minimal",
  minimalist: "Minimalist",
  dots: "Dots",
  hatch: "Hatch",
  binary: "Binary",
  maxbw: "Max black & white",
};
