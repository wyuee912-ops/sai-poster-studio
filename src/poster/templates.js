// Poster templates modeled on real Simular posters. Each build(size, content,
// sample) returns a full document; text elements carry a `slot` so the Content
// panel offers fill-in-the-blank fields and switching templates preserves text.
import { factories } from "./model.js";
import { BRAND, SIZES } from "../brand.js";

const R = Math.round;
const get = (c, slot, fb) => (c && c[slot] != null && c[slot] !== "" ? c[slot] : fb);

export const SLOT_ORDER = ["Eyebrow", "Partners", "Location", "Sidebar", "Title", "Title2", "Subtitle", "Quote", "Quote sub", "Category", "Speakers", "Featuring", "Proof", "Stat 1", "Stat 2", "Stat 3", "Card 1", "Card 1 body", "Card 2", "Card 2 body", "Card 3", "Card 3 body", "Card 4", "Card 4 body", "Prize", "Code", "CTA", "Date", "Footer"];

export function readContent(doc) {
  const c = {};
  for (const el of doc.elements) if (el.props && el.props.slot) c[el.props.slot] = el.props.text;
  return c;
}

const T = (slot, text, x, y, w, h, extra) => factories.text({ name: slot, x, y, w, h, props: { slot, text, ...extra } });
const S = (name, x, y, w, h, props) => factories.shape({ name, x, y, w, h, props });

export const TEMPLATES = [
  {
    id: "cal-hacks",
    name: "Event card — green",
    size: "instagram-portrait",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: BRAND.green,
        elements: [
          factories.tile({ x: 0, y: 0, w: W, h: H, props: { text: "sai", fill: "#0c2e14", fontSize: R(W * 0.05), gapX: R(W * 0.17), gapY: R(W * 0.15) } }),
          S("Card", R(W * 0.055), R(H * 0.07), R(W * 0.89), R(H * 0.86), { kind: "rect", radius: R(W * 0.045), fill: "#ffffff" }),
          T("Title", get(c, "Title", "Simular\nat Cal Hacks"), R(W * 0.1), R(H * 0.15), R(W * 0.8), R(H * 0.2), { fontSize: R(W * 0.11), weight: 800, color: "#0c0c0c", uppercase: true, align: "center", lineHeight: 0.95, shrink: true }),
          S("Accent", R(W * 0.38), R(H * 0.345), R(W * 0.24), 5, { kind: "rect", fill: BRAND.green }),
          T("Date", get(c, "Date", "June 20–21"), R(W * 0.15), R(H * 0.38), R(W * 0.7), R(H * 0.05), { fontSize: R(W * 0.046), weight: 600, color: "#15161a", align: "center" }),
          T("Location", get(c, "Location", "UC Berkeley"), R(W * 0.15), R(H * 0.44), R(W * 0.7), R(H * 0.05), { fontSize: R(W * 0.046), weight: 600, color: "#15161a", align: "center" }),
          S("Prize pill", R(W * 0.27), R(H * 0.52), R(W * 0.46), R(H * 0.062), { kind: "rect", radius: R(H * 0.031), fill: BRAND.green }),
          T("Prize", get(c, "Prize", "$500 Sai Prize"), R(W * 0.27), R(H * 0.534), R(W * 0.46), R(H * 0.04), { fontSize: R(W * 0.04), weight: 800, color: "#063d15", align: "center" }),
          T("Subtitle", get(c, "Subtitle", "Booth + Workshop"), R(W * 0.15), R(H * 0.61), R(W * 0.7), R(H * 0.04), { fontSize: R(W * 0.035), weight: 700, color: "#43454d", align: "center" }),
          factories.saiMark({ x: R(W * 0.44), y: R(H * 0.67), w: R(W * 0.12), h: R(W * 0.12) }),
          T("Footer", get(c, "Footer", "simular.ai"), R(W * 0.15), R(H * 0.81), R(W * 0.7), R(H * 0.04), { fontSize: R(W * 0.032), weight: 700, color: "#9a9b96", align: "center" }),
        ],
      };
    },
  },
  {
    id: "agent-hour",
    name: "Two-tone — square",
    size: "instagram-square",
    build(size, c, sample) {
      const { w: W, h: H } = size;
      const ts = R(W * 0.205); // title size
      return {
        size: { w: W, h: H, key: size.key },
        background: "#050d09",
        elements: [
          factories.image({ name: "Butterfly", x: R(W * 0.12), y: R(H * 0.16), w: R(W * 0.76), h: R(H * 0.72), src: "/butterfly.png", props: { fit: "contain", opacity: 0.45 } }),
          T("Partners", get(c, "Partners", "SIMULAR    ·    Claude SG    ·    The AI Capitol    ·    first prompt"), R(W * 0.05), R(H * 0.07), R(W * 0.9), R(H * 0.05), { fontSize: R(W * 0.026), weight: 800, color: "#ffffff", align: "center", tracking: R(W * 0.001) }),
          T("Title", get(c, "Title", "Agent"), R(W * 0.05), R(H * 0.3), R(W * 0.9), R(ts * 1.1), { fontSize: ts, weight: 800, color: "#ffffff", uppercase: true, lineHeight: 0.9, shrink: true }),
          T("Title2", get(c, "Title2", "Hour"), R(W * 0.05), R(H * 0.3 + ts * 0.92), R(W * 0.9), R(ts * 1.1), { fontSize: ts, weight: 800, color: BRAND.green, uppercase: true, lineHeight: 0.9, shrink: true }),
          T("Subtitle", get(c, "Subtitle", "Fireside × Mixer"), R(W * 0.05), R(H * 0.86), R(W * 0.7), R(H * 0.06), { fontSize: R(W * 0.03), weight: 600, color: "#bfe6cb" }),
        ],
      };
    },
  },
  {
    id: "talk-dark",
    name: "Talk — speakers",
    size: "instagram-portrait",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#000000",
        elements: [
          S("Bar 1", R(W * 0.04), R(H * 0.04), R(W * 0.012), R(H * 0.11), { kind: "rect", fill: "#2b7fff" }),
          S("Bar 2", R(W * 0.04), R(H * 0.18), R(W * 0.012), R(H * 0.11), { kind: "rect", fill: "#f4b41a" }),
          T("Eyebrow", get(c, "Eyebrow", "Microsoft Build"), R(W * 0.09), R(H * 0.045), R(W * 0.85), R(H * 0.05), { fontSize: R(W * 0.04), weight: 800, color: "#2b7fff", uppercase: true, tracking: R(W * 0.004) }),
          T("Title", get(c, "Title", "// On demand"), R(W * 0.09), R(H * 0.095), R(W * 0.85), R(H * 0.08), { fontSize: R(W * 0.075), weight: 800, color: "#ffffff" }),
          T("Subtitle", get(c, "Subtitle", "Powering enterprise-grade AI agents with Windows 365 for Agents"), R(W * 0.06), R(H * 0.24), R(W * 0.88), R(H * 0.18), { fontSize: R(W * 0.05), weight: 700, color: "#ffffff", lineHeight: 1.06 }),
          T("Speakers", get(c, "Speakers", "Joydeep Mukherjee — Windows 365 for Agents, Microsoft\nSam Shapiro — Product Manager, Microsoft\nJiachen Yang — Co-founder, Simular"), R(W * 0.06), R(H * 0.52), R(W * 0.88), R(H * 0.3), { fontSize: R(W * 0.03), weight: 600, color: "#e6e6e6", lineHeight: 1.45 }),
          T("Code", get(c, "Code", "Code: OD852"), R(W * 0.06), R(H * 0.9), R(W * 0.6), R(H * 0.06), { fontSize: R(W * 0.045), weight: 800, color: "#f4b41a", uppercase: true }),
          S("Block 1", R(W * 0.74), R(H * 0.88), R(W * 0.06), R(H * 0.05), { kind: "rect", fill: "#2b7fff" }),
          S("Block 2", R(W * 0.81), R(H * 0.86), R(W * 0.06), R(H * 0.07), { kind: "rect", fill: "#e2483d" }),
          S("Block 3", R(W * 0.88), R(H * 0.89), R(W * 0.06), R(H * 0.04), { kind: "rect", fill: "#f4b41a" }),
        ],
      };
    },
  },
  {
    id: "editorial-cream",
    name: "Editorial — cream",
    size: "instagram-portrait",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#eef0e6",
        elements: [
          S("Badge", R(W * 0.05), R(H * 0.04), R(W * 0.26), R(W * 0.26), { kind: "rect", radius: R(W * 0.13), fill: "#ffffff" }),
          factories.saiMark({ x: R(W * 0.12), y: R(H * 0.075), w: R(W * 0.12), h: R(W * 0.12) }),
          S("Quote box", R(W * 0.35), R(H * 0.04), R(W * 0.6), R(H * 0.19), { kind: "rect", radius: R(W * 0.03), fill: "#ffffff" }),
          T("Quote", get(c, "Quote", "“Money can’t buy time. Sai gives you more.”"), R(W * 0.38), R(H * 0.06), R(W * 0.54), R(H * 0.1), { fontSize: R(W * 0.038), weight: 400, color: "#0c0c0c", lineHeight: 1.12, font: "adamina" }),
          T("Quote sub", get(c, "Quote sub", "An exclusive event about how computer-using AI agents will shape the future."), R(W * 0.38), R(H * 0.165), R(W * 0.54), R(H * 0.06), { fontSize: R(W * 0.022), weight: 500, color: "#43454d", lineHeight: 1.25 }),
          factories.image({ name: "Photo", x: R(W * 0.08), y: R(H * 0.27), w: R(W * 0.84), h: R(H * 0.45), props: { fit: "cover" } }),
          { ...T("Sidebar", get(c, "Sidebar", "NYC Tech Week 2026"), 0, 0, R(H * 0.42), R(W * 0.06), { fontSize: R(W * 0.038), weight: 700, color: "#0c0c0c", uppercase: true }), x: R(-H * 0.2 + W * 0.05), y: R(H * 0.45), rotation: -90 },
          T("Title", get(c, "Title", "AI, Future of Computer, Time."), R(W * 0.08), R(H * 0.74), R(W * 0.52), R(H * 0.22), { fontSize: R(W * 0.062), weight: 400, color: "#0c0c0c", lineHeight: 1.05, font: "adamina", shrink: true }),
          T("Featuring", get(c, "Featuring", "Featuring: Ang Li, cofounder/CEO, Simular · Christopher Fong, founder of Key"), R(W * 0.6), R(H * 0.77), R(W * 0.34), R(H * 0.18), { fontSize: R(W * 0.022), weight: 500, color: "#15161a", lineHeight: 1.45 }),
        ],
      };
    },
  },
  {
    id: "ascii-hero",
    name: "ASCII hero",
    size: "instagram-square",
    build(size, c, sample) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#05140b",
        elements: [
          factories.image({ name: "Butterfly", x: R(W * 0.06), y: R(H * 0.16), w: R(W * 0.88), h: R(H * 0.66), src: "/butterfly.png", props: { fit: "contain" } }),
          T("Title", get(c, "Title", "NYC"), R(W * 0.06), R(H * 0.06), R(W * 0.7), R(H * 0.22), { fontSize: R(W * 0.14), weight: 800, color: "#ffffff", uppercase: true, lineHeight: 0.95, shrink: true }),
          T("Subtitle", get(c, "Subtitle", "Agent Hour"), R(W * 0.06), R(H * 0.85), R(W * 0.8), R(H * 0.08), { fontSize: R(W * 0.035), weight: 600, color: "#bfe6cb" }),
        ],
      };
    },
  },
  {
    id: "benchmark-dark",
    name: "Benchmark — dark",
    size: "instagram-square",
    build(size, c) {
      const { w: W, h: H } = size;
      const stat = (slot, def, y) => T(slot, get(c, slot, def), R(W * 0.06), y, R(W * 0.88), R(H * 0.1), { fontSize: R(W * 0.05), weight: 800, color: BRAND.green });
      return {
        size: { w: W, h: H, key: size.key },
        background: "#0a0a16",
        elements: [
          factories.saiMark({ x: R(W * 0.06), y: R(H * 0.07), w: R(W * 0.09), h: R(W * 0.09) }),
          T("Title", get(c, "Title", "Tops every agent benchmark"), R(W * 0.06), R(H * 0.22), R(W * 0.88), R(H * 0.2), { fontSize: R(W * 0.07), weight: 800, color: "#ffffff", lineHeight: 1.02, shrink: true }),
          stat("Stat 1", "90.1% — WebVoyager (browser)", R(H * 0.45)),
          stat("Stat 2", "72.6% — OSWorld (computer)", R(H * 0.58)),
          stat("Stat 3", "71.6% — AndroidWorld (mobile)", R(H * 0.71)),
          T("Footer", get(c, "Footer", "simular.ai"), R(W * 0.06), R(H * 0.9), R(W * 0.5), R(H * 0.05), { fontSize: R(W * 0.03), weight: 700, color: "#9a9b96" }),
        ],
      };
    },
  },
  {
    id: "feature-grid",
    name: "Feature grid",
    size: "instagram-portrait",
    build(size, c) {
      const { w: W, h: H } = size;
      const card = (hSlot, hDef, bSlot, bDef, x, y, cw, ch) => [
        S(`${hSlot} bg`, x, y, cw, ch, { kind: "rect", radius: R(W * 0.025), fill: "#ffffff" }),
        T(hSlot, get(c, hSlot, hDef), R(x + cw * 0.08), R(y + ch * 0.12), R(cw * 0.84), R(ch * 0.24), { fontSize: R(W * 0.04), weight: 800, color: "#0c0c0c", shrink: true }),
        T(bSlot, get(c, bSlot, bDef), R(x + cw * 0.08), R(y + ch * 0.4), R(cw * 0.84), R(ch * 0.52), { fontSize: R(W * 0.024), weight: 500, color: "#43454d", lineHeight: 1.3 }),
      ];
      const gx0 = R(W * 0.05), gx1 = R(W * 0.52), cw = R(W * 0.43);
      const gy0 = R(H * 0.2), gy1 = R(H * 0.555), ch = R(H * 0.335);
      return {
        size: { w: W, h: H, key: size.key },
        background: "#eef0e6",
        elements: [
          factories.saiMark({ x: R(W * 0.05), y: R(H * 0.05), w: R(W * 0.09), h: R(W * 0.09) }),
          T("Title", get(c, "Title", "What you get"), R(W * 0.17), R(H * 0.06), R(W * 0.78), R(H * 0.09), { fontSize: R(W * 0.07), weight: 800, color: "#0c0c0c", shrink: true }),
          ...card("Card 1", "Templates", "Card 1 body", "Pick a layout and just fill in the text.", gx0, gy0, cw, ch),
          ...card("Card 2", "ASCII art", "Card 2 body", "Turn any image into high-res ASCII.", gx1, gy0, cw, ch),
          ...card("Card 3", "Free-form editor", "Card 3 body", "Drag, resize, layer, recolor anything.", gx0, gy1, cw, ch),
          ...card("Card 4", "Export", "Card 4 body", "High-res PNG, vector SVG, re-editable JSON.", gx1, gy1, cw, ch),
          T("Footer", get(c, "Footer", "simular.ai"), R(W * 0.05), R(H - 80), R(W * 0.6), 48, { fontSize: R(W * 0.03), weight: 700, color: "#9a9b96" }),
        ],
      };
    },
  },
  {
    id: "hackathon-dark",
    name: "Hackathon — dark",
    size: "instagram-portrait",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#0a0a0a",
        elements: [
          S("Top bar", 0, 0, W, R(H * 0.012), { kind: "rect", fill: BRAND.green }),
          T("Eyebrow", get(c, "Eyebrow", "Hosted by Simular"), R(W * 0.06), R(H * 0.05), R(W * 0.88), R(H * 0.05), { fontSize: R(W * 0.03), weight: 800, color: BRAND.green, uppercase: true, tracking: R(W * 0.003) }),
          T("Title", get(c, "Title", "Detach 2026"), R(W * 0.06), R(H * 0.27), R(W * 0.88), R(H * 0.32), { fontSize: R(W * 0.16), weight: 800, color: "#ffffff", uppercase: true, lineHeight: 0.92, shrink: true }),
          T("Subtitle", get(c, "Subtitle", "A late-night hack + demo party"), R(W * 0.06), R(H * 0.62), R(W * 0.88), R(H * 0.07), { fontSize: R(W * 0.04), weight: 600, color: "#cfcfcf" }),
          S("Accent", R(W * 0.062), R(H * 0.72), R(W * 0.12), R(H * 0.008), { kind: "rect", fill: BRAND.green }),
          T("Date", get(c, "Date", "Fri, 23 June · 7 PM"), R(W * 0.06), R(H * 0.76), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.045), weight: 800, color: "#ffffff" }),
          T("Location", get(c, "Location", "Simular HQ, SF"), R(W * 0.06), R(H * 0.82), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.038), weight: 500, color: "#cfcfcf" }),
          T("Partners", get(c, "Partners", "Simular · AWS · Anthropic · Pioneer"), R(W * 0.06), R(H * 0.92), R(W * 0.88), R(H * 0.05), { fontSize: R(W * 0.024), weight: 700, color: "#9a9b96" }),
        ],
      };
    },
  },
  {
    id: "happy-hour",
    name: "Happy hour — mixer",
    size: "instagram-square",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#0b3320",
        elements: [
          factories.saiMark({ x: R(W * 0.06), y: R(H * 0.08), w: R(W * 0.1), h: R(W * 0.1) }),
          T("Title", get(c, "Title", "FDE Happy Hour"), R(W * 0.06), R(H * 0.33), R(W * 0.74), R(H * 0.26), { fontSize: R(W * 0.12), weight: 800, color: "#ffffff", lineHeight: 0.98, shrink: true }),
          S("Accent", R(W * 0.062), R(H * 0.61), R(W * 0.13), R(H * 0.012), { kind: "rect", fill: BRAND.green }),
          T("Date", get(c, "Date", "Thursday · 6–9 PM"), R(W * 0.06), R(H * 0.67), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.045), weight: 700, color: "#bfe6cb" }),
          T("Location", get(c, "Location", "The Folsom, SF"), R(W * 0.06), R(H * 0.73), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.04), weight: 500, color: "#bfe6cb" }),
          T("Subtitle", get(c, "Subtitle", "Drinks + demos. Bring a friend."), R(W * 0.06), R(H * 0.86), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.032), weight: 600, color: "#8fcfa3" }),
        ],
      };
    },
  },
  {
    id: "launch",
    name: "Launch — statement",
    size: "instagram-square",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#0a0a16",
        elements: [
          T("Eyebrow", get(c, "Eyebrow", "Sai 2.0"), R(W * 0.06), R(H * 0.08), R(W * 0.88), R(H * 0.05), { fontSize: R(W * 0.032), weight: 800, color: BRAND.green, uppercase: true, tracking: R(W * 0.003) }),
          T("Title", get(c, "Title", "Don’t wait for the future. Build it."), R(W * 0.06), R(H * 0.25), R(W * 0.88), R(H * 0.28), { fontSize: R(W * 0.085), weight: 800, color: "#ffffff", lineHeight: 1.02, shrink: true }),
          T("Subtitle", get(c, "Subtitle", ""), R(W * 0.06), R(H * 0.56), R(W * 0.82), R(H * 0.14), { fontSize: R(W * 0.036), weight: 600, color: "#c7c9cf", lineHeight: 1.25, shrink: true }),
          S("CTA pill", R(W * 0.06), R(H * 0.78), R(W * 0.4), R(H * 0.075), { kind: "rect", radius: R(H * 0.038), fill: BRAND.green }),
          T("CTA", get(c, "CTA", "Try Sai"), R(W * 0.075), R(H * 0.798), R(W * 0.37), R(H * 0.05), { fontSize: R(W * 0.038), weight: 800, color: "#063d15", align: "center", shrink: true }),
          T("Footer", get(c, "Footer", get(c, "Date", "Live now · simular.ai")), R(W * 0.06), R(H * 0.9), R(W * 0.88), R(H * 0.05), { fontSize: R(W * 0.03), weight: 700, color: "#9a9b96" }),
        ],
      };
    },
  },
  {
    id: "enterprise",
    name: "Enterprise — clean",
    size: "instagram-portrait",
    build(size, c) {
      const { w: W, h: H } = size;
      return {
        size: { w: W, h: H, key: size.key },
        background: "#ffffff",
        elements: [
          S("Top bar", 0, 0, W, R(H * 0.012), { kind: "rect", fill: "#2b7fff" }),
          factories.saiMark({ x: R(W * 0.06), y: R(H * 0.05), w: R(W * 0.09), h: R(W * 0.09) }),
          T("Eyebrow", get(c, "Eyebrow", "Healthcare"), R(W * 0.06), R(H * 0.2), R(W * 0.88), R(H * 0.05), { fontSize: R(W * 0.032), weight: 800, color: "#2b7fff", uppercase: true, tracking: R(W * 0.003) }),
          T("Title", get(c, "Title", "Autonomous Healthcare Hackathon"), R(W * 0.06), R(H * 0.26), R(W * 0.88), R(H * 0.26), { fontSize: R(W * 0.075), weight: 800, color: "#0c0c0c", lineHeight: 1.02, shrink: true }),
          T("Subtitle", get(c, "Subtitle", "Build agents that give clinicians their time back."), R(W * 0.06), R(H * 0.54), R(W * 0.82), R(H * 0.1), { fontSize: R(W * 0.034), weight: 500, color: "#43454d", lineHeight: 1.3 }),
          S("Accent", R(W * 0.062), R(H * 0.66), R(W * 0.12), R(H * 0.007), { kind: "rect", fill: "#2b7fff" }),
          T("Date", get(c, "Date", "June 13 · 9 AM"), R(W * 0.06), R(H * 0.7), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.04), weight: 800, color: "#0c0c0c" }),
          T("Location", get(c, "Location", "SF · Register at simular.ai"), R(W * 0.06), R(H * 0.76), R(W * 0.88), R(H * 0.06), { fontSize: R(W * 0.034), weight: 500, color: "#43454d" }),
          T("Partners", get(c, "Partners", "Simular · Anthropic · UCSF"), R(W * 0.06), R(H * 0.9), R(W * 0.88), R(H * 0.05), { fontSize: R(W * 0.024), weight: 700, color: "#9a9b96" }),
        ],
      };
    },
  },
];

export const TEMPLATES_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

export function templateSize(id, fallbackKey) {
  const key = (TEMPLATES_BY_ID[id] && TEMPLATES_BY_ID[id].size) || fallbackKey || "instagram-portrait";
  return { w: SIZES[key].w, h: SIZES[key].h, key };
}

export function buildTemplate(id, size, content) {
  const tpl = TEMPLATES_BY_ID[id] || TEMPLATES[0];
  return tpl.build(size, content || {});
}
