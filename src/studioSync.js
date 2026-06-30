// Talk to the dev/preview server's /api/doc endpoint (see vite.config.js).
// All calls reject when no server is present (e.g. a deployed static build);
// callers catch and fall back to localStorage, so the app still works offline.

export async function fetchDoc() {
  const r = await fetch("/api/doc", { cache: "no-store" });
  if (!r.ok) throw new Error("no studio server");
  return r.json(); // { v, doc }
}

export async function fetchVersion() {
  const r = await fetch("/api/doc?meta=1", { cache: "no-store" });
  if (!r.ok) throw new Error("no studio server");
  return r.json(); // { v }
}

export async function saveDoc(doc) {
  const r = await fetch("/api/doc", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ doc }),
  });
  if (!r.ok) throw new Error("save failed");
  return r.json(); // { v }
}
