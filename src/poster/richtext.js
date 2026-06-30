// Per-word keyword highlighting, shared by the editor preview and both exporters
// so a highlighted word looks identical everywhere. A text element carries
// props.highlight (array of words) + props.highlightColor. Matching is
// case-insensitive and ignores surrounding punctuation.
export function hiSetOf(words) {
  return new Set((words || []).map((w) => String(w).trim().toLowerCase()).filter(Boolean));
}

// Split into tokens but KEEP the whitespace runs, so spacing is preserved when
// we draw/emit token-by-token.
export function tokenize(s) {
  return String(s).split(/(\s+)/);
}

export function isHi(token, set) {
  if (!set.size || !token.trim()) return false;
  const bare = token.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  return set.has(bare);
}
