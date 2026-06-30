// Headless render harness. Loaded by scripts/generate.mjs in headless Chromium.
// Exposes the SAME engine the app uses, so CLI output is identical to the editor.
import { posterFromBrief } from "./poster/auto.js";
import { renderPosterCanvas, renderPosterSvg } from "./poster/exportPoster.js";

// Accept either a full poster doc ({size,elements}) or a Content-Engine brief.
const toDoc = (input) =>
  input && input.size && Array.isArray(input.elements) ? input : posterFromBrief(input).doc;

window.renderPNG = async (input, scale = 3) => {
  const cv = await renderPosterCanvas(toDoc(input), scale);
  return cv.toDataURL("image/png");
};

window.renderSVG = async (input) => renderPosterSvg(toDoc(input));

// which template auto.js would pick — handy for logging / dry runs
window.pickTemplate = (input) => (input && input.size ? "(full doc)" : posterFromBrief(input).templateId);
