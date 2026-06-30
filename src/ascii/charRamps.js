// Character ramps, ordered LIGHT -> DARK (index 0 = lightest = space).
// Adapted from vietnh1009/ASCII-generator (MIT) alphabets, plus extras.
export const RAMPS = {
  standard: " .:-=+*#%@",
  detailed:
    " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  minimal: " .oO@",
  dots: "  ··••●●",
  hatch: "  ..:::!!||##",
  binary: " .01",
  code: " .:=*/<>[]{}#@",
};

export const RAMP_LABELS = {
  standard: "Standard (10)",
  detailed: "Detailed (70)",
  blocks: "Blocks",
  minimal: "Minimal",
  dots: "Dots",
  hatch: "Hatch",
  binary: "Binary",
  code: "Code symbols",
};
