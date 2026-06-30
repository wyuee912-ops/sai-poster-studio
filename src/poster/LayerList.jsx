import React from "react";

const TYPE_LABEL = { text: "Text", accent: "Accent", saiMark: "Sai mark", image: "Image", ascii: "ASCII" };

export default function LayerList({ doc, selectedId, onSelect, onReorder, onDelete, onToggle, onAdd, onDuplicate }) {
  // top of list = top of stack = last in array
  const items = doc.elements.map((el, i) => ({ el, i })).reverse();
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="eyebrow">Layers</span>
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        {[
          ["text", "+ Text"],
          ["accent", "+ Bar"],
          ["ascii", "+ ASCII"],
          ["image", "+ Image"],
          ["saiMark", "+ Mark"],
        ].map(([t, label]) => (
          <button key={t} className="btn" style={{ padding: "6px 9px", fontSize: 12 }} onClick={() => onAdd(t)}>
            {label}
          </button>
        ))}
      </div>
      <div className="col" style={{ gap: 4 }}>
        {items.map(({ el, i }) => (
          <div
            key={el.id}
            onClick={() => onSelect(el.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 9px",
              borderRadius: 8,
              border: `1px solid ${el.id === selectedId ? "var(--green)" : "var(--line)"}`,
              background: el.id === selectedId ? "var(--green-soft)" : "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 10, color: "var(--soft)", width: 38 }}>{TYPE_LABEL[el.type]}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{el.name}</span>
            <button title="Hide/show" className="mini" onClick={(e) => { e.stopPropagation(); onToggle(el.id); }} style={miniBtn}>{el.visible === false ? "○" : "●"}</button>
            <button title="Duplicate" className="mini" onClick={(e) => { e.stopPropagation(); onDuplicate(el.id); }} style={miniBtn}>⧉</button>
            <button title="Up" className="mini" onClick={(e) => { e.stopPropagation(); onReorder(i, +1); }} style={miniBtn}>↑</button>
            <button title="Down" className="mini" onClick={(e) => { e.stopPropagation(); onReorder(i, -1); }} style={miniBtn}>↓</button>
            <button title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(el.id); }} style={{ ...miniBtn, color: "#b14b36" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const miniBtn = {
  border: "1px solid var(--line2)",
  background: "#fff",
  borderRadius: 6,
  width: 22,
  height: 22,
  fontSize: 11,
  lineHeight: 1,
  color: "var(--muted)",
  display: "grid",
  placeItems: "center",
};
