import React, { useEffect, useMemo, useRef, useState } from "react";
import { SIZES } from "./brand.js";
import { defaultDoc, factories, makeSampleDataUrl, clone } from "./poster/model.js";

const LS_DOC = "sai_poster_doc_v1";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "el" + Math.random().toString(36).slice(2, 9));
function loadDoc() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_DOC) || "null");
    if (d && d.size && Array.isArray(d.elements)) return d;
  } catch (e) {}
  // Start from a real-brand template so the Content panel has fill-in slots.
  return buildTemplate("cal-hacks", templateSize("cal-hacks"), {});
}
// A project is an array of poster docs (the pages shown in the Gallery). Reads
// the new {pages:[…]} shape, or wraps a single legacy doc as one page.
function loadProject() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_DOC) || "null");
    if (d && Array.isArray(d.pages) && d.pages.length) return d.pages;
    if (d && d.size && Array.isArray(d.elements)) return [d];
  } catch (e) {}
  return [buildTemplate("cal-hacks", templateSize("cal-hacks"), {})];
}
// Normalize whatever the server/localStorage holds into a pages array (or null).
const asPages = (blob) =>
  blob && Array.isArray(blob.pages) && blob.pages.length
    ? blob.pages
    : blob && blob.size && Array.isArray(blob.elements)
    ? [blob]
    : null;
import Editor from "./poster/Editor.jsx";
import Inspector from "./poster/Inspector.jsx";
import LayerList from "./poster/LayerList.jsx";
import AsciiLab from "./AsciiLab.jsx";
import { exportPng, exportSvg, renderPosterCanvas } from "./poster/exportPoster.js";
import { TEMPLATES, buildTemplate, readContent, SLOT_ORDER, templateSize } from "./poster/templates.js";
import { posterFromBrief } from "./poster/auto.js";
import { parseBriefText } from "./poster/parseBrief.js";
import { fetchDoc, fetchVersion, saveDoc } from "./studioSync.js";

export default function App() {
  const [tab, setTab] = useState("editor");
  // The document is a project of pages; `doc` is the active page and `setDoc`
  // updates it — so every existing editor operation keeps working unchanged.
  const [pages, setPages] = useState(loadProject);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  activeIdxRef.current = Math.min(activeIdx, pages.length - 1);
  const doc = pages[activeIdxRef.current] || pages[0];
  const setDoc = (u) =>
    setPages((ps) => {
      const i = activeIdxRef.current < ps.length ? activeIdxRef.current : 0;
      return ps.map((p, k) => (k === i ? (typeof u === "function" ? u(p) : u) : p));
    });
  const [selectedId, setSelectedId] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [pngScale, setPngScale] = useState(3);
  const [busy, setBusy] = useState("");
  const [templateId, setTemplateId] = useState("cal-hacks");
  const [leftTab, setLeftTab] = useState("content"); // content | layers
  const [showTemplates, setShowTemplates] = useState(false);

  const selected = useMemo(() => doc.elements.find((e) => e.id === selectedId) || null, [doc, selectedId]);

  // ---- Document sync ----------------------------------------------------
  // The doc is shared through the dev server (vite studio-doc-api) so every
  // browser AND the automation see ONE document on disk. localStorage is only
  // the offline fallback when no server is present (deployed static build).
  const saveTimer = useRef(null);
  const hydrated = useRef(false);          // don't save before the first server load resolves
  const serverOk = useRef(false);          // is the /api/doc server reachable?
  const serverV = useRef(0);               // last doc version we know about
  const lastLocalSave = useRef(0);         // when we last wrote (to ignore our own change while polling)
  const applyingExternal = useRef(false);  // we just setDoc() from disk — don't echo it straight back

  // ---- Undo / redo ----
  const docRef = useRef(doc); docRef.current = doc;
  const histPast = useRef([]);
  const histFuture = useRef([]);
  const histBase = useRef(undefined);      // last committed snapshot
  const histSkip = useRef(false);          // a doc change caused by undo/redo — don't record it
  const histReset = useRef(false);         // an external load — start a fresh baseline
  const histTimer = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // On startup, prefer the on-disk document so localhost shows the same poster
  // in every browser. Falls back to whatever loadDoc() seeded (localStorage).
  useEffect(() => {
    let cancelled = false;
    fetchDoc()
      .then(({ v, doc: blob }) => {
        if (cancelled) return;
        serverOk.current = true;
        serverV.current = v || 0;
        const pgs = asPages(blob);
        if (pgs) {
          applyingExternal.current = true;
          histReset.current = true;
          setPages(pgs);
          setActiveIdx(0);
          setSelectedId(null);
        }
      })
      .catch(() => { serverOk.current = false; })
      .finally(() => { hydrated.current = true; });
    return () => { cancelled = true; };
  }, []);

  // Auto-save (debounced) to server + localStorage so a reload never wipes work.
  useEffect(() => {
    if (!hydrated.current) return;            // skip pre-hydration renders
    if (applyingExternal.current) { applyingExternal.current = false; return; } // don't re-save a doc we just loaded
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const blob = { pages };
      try { localStorage.setItem(LS_DOC, JSON.stringify(blob)); } catch (e) {}
      if (serverOk.current) {
        lastLocalSave.current = Date.now();
        saveDoc(blob).then(({ v }) => { if (v) serverV.current = v; }).catch(() => {});
      }
    }, 400);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [pages]);

  // Poll: if the document changed on disk elsewhere (the automation pushed a new
  // poster, or another tab saved), load it live into this open editor.
  useEffect(() => {
    const id = setInterval(async () => {
      if (!serverOk.current) return;
      if (Date.now() - lastLocalSave.current < 1500) return; // ignore our own just-written change
      try {
        const { v } = await fetchVersion();
        if (v && v !== serverV.current) {
          const { v: v2, doc: blob } = await fetchDoc();
          serverV.current = v2 || v;
          const pgs = asPages(blob);
          if (pgs) {
            applyingExternal.current = true;
            histReset.current = true;
            setPages(pgs);
            setActiveIdx(0);
            setSelectedId(null);
            setImportMsg(pgs.length > 1 ? `↻ Loaded ${pgs.length} posters from disk` : "↻ Loaded the latest poster from disk");
          }
        }
      } catch (e) { serverOk.current = false; }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Record stable document states for undo (debounced, so a whole drag or a
  // burst of typing collapses into ONE undo step). External loads reset the
  // baseline; undo/redo changes are flagged so they aren't re-recorded.
  useEffect(() => {
    if (!hydrated.current) { histBase.current = doc; return; }
    if (histSkip.current) { histSkip.current = false; return; }
    if (histReset.current) {
      histReset.current = false;
      histPast.current = []; histFuture.current = [];
      histBase.current = doc; setCanUndo(false); setCanRedo(false);
      return;
    }
    if (histBase.current === undefined || doc === histBase.current) { histBase.current = doc; return; }
    if (histTimer.current) clearTimeout(histTimer.current);
    histTimer.current = setTimeout(() => {
      histPast.current.push(histBase.current);
      if (histPast.current.length > 80) histPast.current.shift();
      histFuture.current = [];
      histBase.current = doc;
      setCanUndo(true); setCanRedo(false);
    }, 450);
    return () => histTimer.current && clearTimeout(histTimer.current);
  }, [doc]);

  const undo = () => {
    if (histTimer.current) clearTimeout(histTimer.current);
    // capture an edit made within the debounce window before stepping back
    if (hydrated.current && histBase.current !== undefined && docRef.current !== histBase.current) {
      histPast.current.push(histBase.current);
      histBase.current = docRef.current;
    }
    if (!histPast.current.length) return;
    const prev = histPast.current.pop();
    histFuture.current.push(histBase.current);
    histBase.current = prev;
    histSkip.current = true;
    setSelectedId(null);
    setDoc(prev);
    setCanUndo(histPast.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (!histFuture.current.length) return;
    const next = histFuture.current.pop();
    histPast.current.push(histBase.current);
    histBase.current = next;
    histSkip.current = true;
    setSelectedId(null);
    setDoc(next);
    setCanUndo(true);
    setCanRedo(histFuture.current.length > 0);
  };

  const updateEl = (id, patch) =>
    setDoc((d) => ({
      ...d,
      elements: d.elements.map((el) =>
        el.id !== id ? el : { ...el, ...patch, props: patch.props ? { ...el.props, ...patch.props } : el.props }
      ),
    }));

  const addEl = (type) => {
    const opts = type === "ascii" ? { src: makeSampleDataUrl() } : {};
    const el = factories[type](opts);
    setDoc((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedId(el.id);
  };

  const deleteEl = (id) =>
    setDoc((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== id) }));

  const reorderEl = (index, dir) =>
    setDoc((d) => {
      const j = index + dir;
      if (j < 0 || j >= d.elements.length) return d;
      const els = d.elements.slice();
      [els[index], els[j]] = [els[j], els[index]];
      return { ...d, elements: els };
    });

  const toggleEl = (id) =>
    setDoc((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, visible: e.visible === false } : e)) }));

  const duplicateEl = (id) =>
    setDoc((d) => {
      const i = d.elements.findIndex((e) => e.id === id);
      if (i < 0) return d;
      const src = d.elements[i];
      const copy = { ...clone(src), id: uid(), x: src.x + 24, y: src.y + 24, name: src.name + " copy" };
      const els = d.elements.slice();
      els.splice(i + 1, 0, copy);
      setTimeout(() => setSelectedId(copy.id), 0);
      return { ...d, elements: els };
    });

  const setBackground = (color) => setDoc((d) => ({ ...d, background: color }));
  const setDecor = (decor) => setDoc((d) => ({ ...d, decor }));

  // ---- Pages (the Gallery grid) ----
  const goToPage = (idx) => { histReset.current = true; setActiveIdx(idx); setSelectedId(null); setTab("editor"); };
  const addPage = () => {
    const d = buildTemplate(templateId, templateSize(templateId, doc.size.key), {});
    histReset.current = true;
    setPages((ps) => [...ps, d]);
    setActiveIdx(pages.length);
    setSelectedId(null);
    setTab("editor");
  };
  const duplicatePage = (idx) => setPages((ps) => { const n = ps.slice(); n.splice(idx + 1, 0, clone(ps[idx])); return n; });
  const deletePage = (idx) => {
    if (pages.length <= 1) return;
    histReset.current = true;
    setPages((ps) => ps.filter((_, i) => i !== idx));
    setActiveIdx((i) => Math.max(0, i >= idx ? i - 1 : i));
    setSelectedId(null);
  };

  const changeSize = (key) => {
    const content = readContent(doc);
    setDoc(buildTemplate(templateId, { w: SIZES[key].w, h: SIZES[key].h, key }, content));
    setSelectedId(null);
  };

  // Apply a template at its native size, carrying over your typed text (by slot).
  const applyTemplate = (id) => {
    const content = readContent(doc);
    setTemplateId(id);
    setDoc(buildTemplate(id, templateSize(id, doc.size.key), content));
    setSelectedId(null);
    setShowTemplates(false);
  };

  // Content panel: edit the text of the layer that owns a slot.
  const slots = useMemo(() => {
    const present = doc.elements.filter((e) => e.props && e.props.slot);
    present.sort((a, b) => {
      const ia = SLOT_ORDER.indexOf(a.props.slot), ib = SLOT_ORDER.indexOf(b.props.slot);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return present;
  }, [doc]);
  const setSlotText = (id, text) => updateEl(id, { props: { text } });

  // Keyboard: delete / nudge / duplicate the selected layer (ignored while typing).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (tab !== "editor") return;
      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); return; }
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteEl(selectedId); setSelectedId(null); }
      else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); duplicateEl(selectedId); }
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setDoc((d) => ({ ...d, elements: d.elements.map((el) => (el.id === selectedId ? { ...el, x: el.x + dx, y: el.y + dy } : el)) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, tab]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sai-poster-${doc.size.key}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  // Parse a dropped file (.json poster doc, .json brief, or .md brief).
  const parseBrief = (file, then) => {
    const r = new FileReader();
    r.onload = () => {
      try { then(parseBriefText(String(r.result), file.name || "")); }
      catch (e) { setImportMsg("Could not read brief: " + e.message); }
    };
    r.readAsText(file);
  };

  // Import = open a poster doc, or auto-build a poster from a brief (editable).
  const importBrief = (file) =>
    parseBrief(file, (b) => {
      if (b && b.size && Array.isArray(b.elements)) {
        setDoc(b);
        setSelectedId(null);
        setImportMsg(`Opened poster — ${b.elements.length} layers (${b.size.key}).`);
        return;
      }
      const { doc: d, templateId: id } = posterFromBrief(b);
      setTemplateId(id);
      setDoc(d);
      setSelectedId(null);
      setImportMsg(`Auto-picked the "${id}" template from the brief and filled it in.`);
    });

  // Auto-generate = brief in → poster auto-built AND exported as PNG. One click.
  const autoGenerate = (file) =>
    parseBrief(file, async (b) => {
      if (b && b.size && Array.isArray(b.elements)) { setDoc(b); setSelectedId(null); }
      const built = b.size && b.elements ? { doc: b, templateId } : posterFromBrief(b);
      setTemplateId(built.templateId);
      setDoc(built.doc);
      setSelectedId(null);
      setImportMsg(`Auto-generating "${built.templateId}" → exporting PNG…`);
      setBusy("png");
      try { await exportPng(built.doc, pngScale); setImportMsg(`Auto-generated "${built.templateId}" and exported the PNG.`); }
      catch (e) { setImportMsg("Auto-generate failed: " + e.message); }
      finally { setBusy(""); }
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
        <div className="row" style={{ gap: 8 }}>
          <SaiMark size={24} />
          <strong style={{ fontSize: 15 }}>Poster Studio</strong>
        </div>
        <div className="row" style={{ gap: 4, marginLeft: 6 }}>
          <button className={`btn ${tab === "editor" ? "active" : ""}`} style={{ padding: "6px 12px" }} onClick={() => setTab("editor")}>Editor</button>
          <button className={`btn ${tab === "gallery" ? "active" : ""}`} style={{ padding: "6px 12px" }} onClick={() => setTab("gallery")}>Gallery{pages.length > 1 ? ` (${pages.length})` : ""}</button>
          <button className={`btn ${tab === "ascii" ? "active" : ""}`} style={{ padding: "6px 12px" }} onClick={() => setTab("ascii")}>ASCII lab</button>
        </div>
        <div style={{ flex: 1 }} />
        {tab === "editor" && (
          <div className="row" style={{ gap: 8 }}>
            {pages.length > 1 && (
              <div className="row" style={{ gap: 4, marginRight: 2 }}>
                <button className="btn" style={{ padding: "6px 9px" }} title="Previous poster" disabled={activeIdx <= 0} onClick={() => goToPage(Math.max(0, activeIdx - 1))}>‹</button>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42, textAlign: "center", color: "#15161a" }}>{activeIdx + 1} / {pages.length}</span>
                <button className="btn" style={{ padding: "6px 9px" }} title="Next poster" disabled={activeIdx >= pages.length - 1} onClick={() => goToPage(Math.min(pages.length - 1, activeIdx + 1))}>›</button>
              </div>
            )}
            <button className="btn" style={{ padding: "6px 11px", fontSize: 16, lineHeight: 1 }} title="Undo (⌘/Ctrl+Z)" disabled={!canUndo} onClick={undo}>↶</button>
            <button className="btn" style={{ padding: "6px 11px", fontSize: 16, lineHeight: 1 }} title="Redo (⌘/Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>↷</button>
            <button className="btn" style={{ padding: "6px 12px" }} onClick={() => setShowTemplates(true)}>Templates</button>
            <label className="btn primary" style={{ padding: "6px 12px" }} title="brief.json in → auto-pick template, fill, and export a PNG. One click.">
              {busy === "png" ? "Generating…" : "Auto-generate"}
              <input
                type="file"
                accept=".json,.md,.markdown,application/json,text/markdown"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) autoGenerate(f); e.target.value = ""; }}
              />
            </label>
            <label className="btn active" style={{ padding: "6px 12px" }} title="Import a brief.json (auto-picks a template, editable) or re-open an exported poster JSON">
              Import JSON
              <input
                type="file"
                accept=".json,.md,.markdown,application/json,text/markdown"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importBrief(f); e.target.value = ""; }}
              />
            </label>
            <select value={doc.size.key} onChange={(e) => changeSize(e.target.value)} style={{ width: "auto" }}>
              {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <select value={pngScale} onChange={(e) => setPngScale(+e.target.value)} style={{ width: "auto" }} title="PNG resolution">
              {[2, 3, 4].map((s) => <option key={s} value={s}>{s}× ({doc.size.w * s}×{doc.size.h * s})</option>)}
            </select>
            <button className="btn primary" disabled={!!busy} onClick={async () => { setBusy("png"); try { await exportPng(doc, pngScale); } finally { setBusy(""); } }}>
              {busy === "png" ? "Rendering…" : "Export PNG"}
            </button>
            <button className="btn" disabled={!!busy} onClick={async () => { setBusy("svg"); try { await exportSvg(doc); } finally { setBusy(""); } }}>SVG</button>
            <button className="btn" onClick={exportJson}>JSON</button>
          </div>
        )}
      </header>
      {tab === "editor" && importMsg && (
        <div style={{ padding: "8px 16px", background: "var(--green-soft)", color: "var(--green-ink)", fontSize: 12.5, borderBottom: "1px solid var(--line)" }}>
          {importMsg}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "ascii" ? (
          <AsciiLab />
        ) : tab === "gallery" ? (
          <GalleryView pages={pages} activeIdx={activeIdx} onOpen={goToPage} onAdd={addPage} onDuplicate={duplicatePage} onDelete={deletePage} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "262px 1fr 300px", height: "100%" }}>
            <aside style={{ borderRight: "1px solid var(--line)", padding: 16, overflow: "auto", background: "var(--surface)" }}>
              <div className="row" style={{ gap: 4, marginBottom: 14 }}>
                <button className={`btn ${leftTab === "content" ? "active" : ""}`} style={{ flex: 1, padding: "7px 0" }} onClick={() => setLeftTab("content")}>Content</button>
                <button className={`btn ${leftTab === "layers" ? "active" : ""}`} style={{ flex: 1, padding: "7px 0" }} onClick={() => setLeftTab("layers")}>Layers</button>
              </div>
              {leftTab === "content" ? (
                <ContentPanel slots={slots} onChange={setSlotText} onSelect={setSelectedId} onOpenTemplates={() => setShowTemplates(true)} />
              ) : (
                <LayerList
                  doc={doc}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAdd={addEl}
                  onDelete={deleteEl}
                  onReorder={reorderEl}
                  onToggle={toggleEl}
                  onDuplicate={duplicateEl}
                />
              )}
            </aside>
            <main style={{ minWidth: 0, overflow: "hidden", background: "#eceee8" }}>
              <Editor doc={doc} selectedId={selectedId} onSelect={setSelectedId} onUpdate={updateEl} />
            </main>
            <aside style={{ borderLeft: "1px solid var(--line)", padding: 16, overflow: "auto", background: "var(--surface)" }}>
              <Inspector el={selected} onUpdate={updateEl} background={doc.background} onBackground={setBackground} size={doc.size} decor={doc.decor} onDecor={setDecor} />
            </aside>
          </div>
        )}
      </div>
      {showTemplates && (
        <TemplatePicker activeId={templateId} onPick={applyTemplate} onClose={() => setShowTemplates(false)} />
      )}
    </div>
  );
}

function ContentPanel({ slots, onChange, onSelect, onOpenTemplates }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <button className="btn" onClick={onOpenTemplates} style={{ borderColor: "var(--green)", color: "var(--green-ink)" }}>Choose a template…</button>
      <span className="eyebrow">Fill in the text</span>
      {slots.length === 0 && <div style={{ color: "var(--soft)", fontSize: 12.5 }}>This layout has no text slots. Switch the Layers tab to add elements.</div>}
      {slots.map((el) => (
        <div key={el.id} className="col" style={{ gap: 4 }}>
          <span className="field-label">{el.props.slot}</span>
          <textarea
            value={el.props.text}
            onChange={(e) => onChange(el.id, e.target.value)}
            onFocus={() => onSelect(el.id)}
            rows={el.props.text && el.props.text.length > 40 ? 2 : 1}
            style={{ width: "100%", border: "1px solid var(--line2)", borderRadius: 8, padding: "8px 9px", font: "inherit", fontSize: 13, resize: "vertical" }}
          />
        </div>
      ))}
    </div>
  );
}

function GalleryView({ pages, activeIdx, onOpen, onAdd, onDuplicate, onDelete }) {
  const [thumbs, setThumbs] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < pages.length; i++) {
        try {
          const d = pages[i];
          const cv = await renderPosterCanvas(d, Math.max(0.2, 320 / d.size.w));
          if (cancelled) return;
          setThumbs((prev) => ({ ...prev, [i]: { url: cv.toDataURL(), ar: `${d.size.w} / ${d.size.h}` } }));
        } catch (e) {}
      }
    })();
    return () => { cancelled = true; };
  }, [pages]);

  return (
    <div style={{ height: "100%", overflow: "auto", background: "#eceee8", padding: 24 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><strong style={{ fontSize: 15 }}>Gallery</strong> <span style={{ color: "var(--soft)", fontSize: 13 }}>· {pages.length} poster{pages.length === 1 ? "" : "s"} · click one to edit</span></div>
        <button className="btn primary" style={{ padding: "7px 14px" }} onClick={onAdd}>+ Add poster</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
        {pages.map((d, i) => (
          <div key={i} style={{ border: `2px solid ${i === activeIdx ? "var(--green)" : "var(--line2)"}`, borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
            <button onClick={() => onOpen(i)} title="Edit this poster" style={{ display: "block", width: "100%", border: "none", padding: 0, background: "#f4f4f2", cursor: "pointer" }}>
              <div style={{ aspectRatio: thumbs[i]?.ar || "1 / 1", display: "grid", placeItems: "center" }}>
                {thumbs[i] ? <img src={thumbs[i].url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /> : <span style={{ fontSize: 11, color: "var(--soft)" }}>rendering…</span>}
              </div>
            </button>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "8px 10px" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Poster {i + 1}</span>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn" style={{ padding: "3px 8px", fontSize: 13, lineHeight: 1 }} title="Duplicate" onClick={() => onDuplicate(i)}>⧉</button>
                <button className="btn" style={{ padding: "3px 8px", fontSize: 12, lineHeight: 1 }} title="Delete" onClick={() => onDelete(i)} disabled={pages.length <= 1}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatePicker({ activeId, onPick, onClose }) {
  const [thumbs, setThumbs] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const t of TEMPLATES) {
        try {
          const sz = templateSize(t.id);
          const doc = buildTemplate(t.id, sz, {});
          const cv = await renderPosterCanvas(doc, Math.max(0.22, 300 / sz.w));
          if (cancelled) return;
          setThumbs((prev) => ({ ...prev, [t.id]: { url: cv.toDataURL(), ar: `${sz.w} / ${sz.h}` } }));
        } catch (e) {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(12,12,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 20, width: "min(900px, 92vw)", maxHeight: "86vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <strong style={{ fontSize: 16 }}>Templates</strong>
          <button className="btn" onClick={onClose} style={{ padding: "5px 10px" }}>Close</button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 14px" }}>Pick a layout — your text carries over, and it switches to that template's size. Then fill the fields in the Content panel.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => onPick(t.id)} style={{ textAlign: "left", border: `1px solid ${t.id === activeId ? "var(--green)" : "var(--line2)"}`, borderRadius: 12, background: t.id === activeId ? "var(--green-soft)" : "#fff", padding: 8, cursor: "pointer" }}>
              <div style={{ aspectRatio: thumbs[t.id]?.ar || "1 / 1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", background: "#eee", display: "grid", placeItems: "center" }}>
                {thumbs[t.id] ? <img src={thumbs[t.id].url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /> : <span style={{ fontSize: 11, color: "var(--soft)" }}>rendering…</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 8 }}>{t.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SaiMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden="true">
      <rect width="256" height="256" rx="56" fill="#16D342" />
      <path d="M40.0264 71.5094C36.5453 68.1207 30.9515 68.1703 27.5321 71.6202C24.1128 75.07 24.1629 80.6137 27.6439 84.0024L66.2618 120.633C66.2618 120.633 71.1345 125.091 71.1345 126.948C71.1345 128.805 66.6367 133.265 66.2618 133.634C65.887 134.002 27.5799 171.061 27.5799 171.061C24.1339 174.484 24.1409 180.028 27.5956 183.443C31.0504 186.858 36.6444 186.851 40.0904 183.428L86.1273 136.977C87.7905 135.325 91 132.628 91 126.948C91 121.267 87.8074 118.182 86.1273 116.547L40.0264 71.5094Z" fill="white" />
      <path d="M137 177.244C137 182.08 132.971 186 128 186C123.029 186 119 182.08 119 177.244L119 77.756C119 72.9202 123.029 69 128 69C132.971 69 137 72.9202 137 77.756L137 177.244Z" fill="white" />
      <path d="M216.201 71.5094C219.63 68.1207 225.139 68.1703 228.506 71.6202C231.874 75.07 231.824 80.6137 228.396 84.0024L190.363 120.633C190.363 120.633 185.565 125.091 185.565 126.948C185.565 128.805 189.994 133.265 190.363 133.634C190.733 134.002 228.459 171.061 228.459 171.061C231.853 174.484 231.846 180.028 228.444 183.443C225.041 186.858 219.532 186.851 216.138 183.428L170.799 136.977C169.161 135.325 166 132.628 166 126.948C166 121.267 169.144 118.182 170.799 116.547L216.201 71.5094Z" fill="white" />
    </svg>
  );
}
