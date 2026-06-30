import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Dev/preview-server API so the poster document is ONE file on disk that every
// browser shares — not per-browser localStorage. The editor loads from it on
// startup, saves edits back, and polls it; the automation (`npm run push`) and
// CLI write to it, so a generated poster appears live in an open editor.
// File: .studio/current.json (the raw doc JSON, also a valid Import-JSON file).
function studioDocApi() {
  const file = path.resolve(import.meta.dirname, ".studio/current.json");
  const version = () => { try { return Math.round(fs.statSync(file).mtimeMs); } catch { return 0; } };
  const readDoc = () => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
  const handler = (req, res, next) => {
    const url = req.url || "";
    if (!url.startsWith("/api/doc")) return next();
    res.setHeader("content-type", "application/json");
    if (req.method === "GET") {
      const v = version();
      res.end(JSON.stringify(url.includes("meta=1") ? { v } : { v, doc: readDoc() }));
      return;
    }
    if (req.method === "PUT" || req.method === "POST") {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body || "{}");
          const doc = parsed && parsed.doc ? parsed.doc : parsed; // accept {doc} or a raw doc
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, JSON.stringify(doc));
          res.end(JSON.stringify({ v: version() }));
        } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: String(e) })); }
      });
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method not allowed" }));
  };
  return {
    name: "studio-doc-api",
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

export default defineConfig({
  plugins: [react(), studioDocApi()],
  server: { port: 5181, strictPort: true, host: true },
  // two entry points: the app (index.html) + the headless render harness (render.html)
  build: { rollupOptions: { input: { main: "index.html", render: "render.html" } } },
});
