// scripts/generate-sample-structure.mjs
// Copyright (C) 2026 KONNO Akihisa <konno@researchers.jp>
// MIT License
//
// Generates the RectPlacer sample dataset from a single parametric source
// of truth: samples/sample-structure.stl (a synthetic "deckhouse-like"
// structure made of axis-aligned boxes) and
// samples/sample-structure-rects.csv (cuboid ROIs defined against the
// same geometry). Run with: npm run sample:generate
//
// Coordinate convention (matches RectPlacer's rect input convention,
// see src/domain/rect.ts and src/docs/App.vue): X = length, Y = width,
// Z = height (Z is up). Units are meters. Box positions below are the
// box CENTER coordinates.
//
// The STL is written directly as plain ASCII text from float64 box-corner
// coordinates (no three.js / Float32Array round-trip), so the checked-in
// file has clean, human-readable numbers instead of float32 rounding
// noise (e.g. "0.40000000298023225").

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "samples");

// ---------------------------------------------------------------------
// 1. Parts of the synthetic structure (all axis-aligned boxes).
//    This is the single source of truth for both the STL mesh and the
//    ROI (rect) definitions below, so the two files always stay in sync.
// ---------------------------------------------------------------------
function box(name, size, pos) {
  return { name, size: { lx: size[0], ly: size[1], lz: size[2] }, pos: { x: pos[0], y: pos[1], z: pos[2] } };
}

const deck = box("deck", [6.0, 3.0, 0.4], [0, 0, 0.2]);
const deckhouse = box("deckhouse", [3.0, 2.4, 1.6], [-0.5, 0, 1.2]);
const bridgeWingPort = box("bridge_wing_port", [0.5, 0.6, 0.4], [-0.5, 1.5, 1.8]);
const bridgeWingStbd = box("bridge_wing_stbd", [0.5, 0.6, 0.4], [-0.5, -1.5, 1.8]);
// x=-1.0 places the funnel's footprint (x:[-1.3,-0.7]) aft of the bridge
// wings (centered at x=-0.5), matching the conventional ship-layout
// arrangement (funnel behind the bridge, not in front of it).
const funnel = box("funnel", [0.6, 0.6, 1.2], [-1.0, 0, 2.6]);
// x=-0.5 (same as the bridge wings, on the roof centerline) keeps the
// mast forward of the funnel, so it stays clear of the exhaust plume,
// which the ship's forward motion (+X) carries aft (-X).
const mast = box("mast", [0.15, 0.15, 2.0], [-0.5, 0, 3.0]);

const PARTS = [deck, deckhouse, bridgeWingPort, bridgeWingStbd, funnel, mast];

// ---------------------------------------------------------------------
// 2. Minimal box -> STL triangle mesh (no external dependencies).
// ---------------------------------------------------------------------
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function normalize(a) {
  const len = Math.sqrt(dot(a, a));
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}
function avg4(a, b, c, d) {
  return { x: (a.x + b.x + c.x + d.x) / 4, y: (a.y + b.y + c.y + d.y) / 4, z: (a.z + b.z + c.z + d.z) / 4 };
}

// Emits two triangles for a planar quad a-b-c-d (perimeter order, either
// winding direction). The winding is auto-corrected so the resulting
// facet normal always points away from `boxCenter`.
function quadTriangles(a, b, c, d, boxCenter) {
  const n = cross(sub(b, a), sub(c, a));
  const outward = sub(avg4(a, b, c, d), boxCenter);
  const winding = dot(n, outward) < 0 ? [a, d, c, b] : [a, b, c, d];
  const [p0, p1, p2, p3] = winding;
  return [
    { v: [p0, p1, p2], n: normalize(cross(sub(p1, p0), sub(p2, p0))) },
    { v: [p0, p2, p3], n: normalize(cross(sub(p2, p0), sub(p3, p0))) },
  ];
}

function boxTriangles(part) {
  const { x: cx, y: cy, z: cz } = part.pos;
  const hx = part.size.lx / 2;
  const hy = part.size.ly / 2;
  const hz = part.size.lz / 2;
  const c = (sx, sy, sz) => ({ x: cx + sx * hx, y: cy + sy * hy, z: cz + sz * hz });
  const center = { x: cx, y: cy, z: cz };

  const faces = [
    [c(1, -1, -1), c(1, 1, -1), c(1, 1, 1), c(1, -1, 1)], // +X
    [c(-1, -1, -1), c(-1, 1, -1), c(-1, 1, 1), c(-1, -1, 1)], // -X
    [c(-1, 1, -1), c(1, 1, -1), c(1, 1, 1), c(-1, 1, 1)], // +Y
    [c(-1, -1, -1), c(1, -1, -1), c(1, -1, 1), c(-1, -1, 1)], // -Y
    [c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)], // +Z
    [c(-1, -1, -1), c(1, -1, -1), c(1, 1, -1), c(-1, 1, -1)], // -Z
  ];

  return faces.flatMap(([a, b, cc, d]) => quadTriangles(a, b, cc, d, center));
}

function fmt(n) {
  // Round away float noise, then drop a trailing ".0" style zero tail.
  return Number(n.toFixed(9)).toString();
}

function triangleToAscii({ v, n }) {
  const vertexLines = v.map((p) => `\t\t\tvertex ${fmt(p.x)} ${fmt(p.y)} ${fmt(p.z)}`).join("\n");
  return `\tfacet normal ${fmt(n.x)} ${fmt(n.y)} ${fmt(n.z)}\n\t\touter loop\n${vertexLines}\n\t\tendloop\n\tendfacet`;
}

const solidName = "sample-structure";
const allTriangles = PARTS.flatMap(boxTriangles);
const stlText =
  `solid ${solidName}\n` + allTriangles.map(triangleToAscii).join("\n") + `\nendsolid ${solidName}\n`;

// ---------------------------------------------------------------------
// 3. Cuboid ROI (rect) definitions, derived from the same PARTS geometry
//    so that every ROI corresponds to an actual feature of the STL.
//
//    Each ROI is either:
//    - a "surface" zone: placed just OUTSIDE the part it examines (e.g.
//      an icing-accretion zone on an exposed face/edge), touching the
//      solid only at a zero-volume boundary, never overlapping it; or
//    - a "feature" zone: exactly bounding/enclosing one part; or
//    - a "clear" zone: open space that must not overlap any part at all
//      (e.g. an accessible deck area).
//
//    `represents` records which single PART (by name) the ROI is allowed
//    to touch/overlap; it is checked below so geometry edits can't
//    silently reintroduce an overlap with an unrelated part.
// ---------------------------------------------------------------------
// Half-thickness of a "surface" ROI that straddles an edge/face: half of
// it sits inside the solid, half outside, so it visibly wraps the
// feature instead of floating next to it.
const edgeGap = 0.025;

const RECTS = [
  {
    // Leading (top-front) edge of the deckhouse: a typical icing /
    // wind-exposure ROI in the ship-superstructure use case. Straddles
    // the corner itself (half inside, half outside), matching "funnel
    // windward face" -- it should wrap the edge, not float next to it.
    comment: "deckhouse leading top edge",
    represents: "deckhouse",
    highlight: true,
    lx: edgeGap * 2,
    ly: deckhouse.size.ly,
    lz: edgeGap * 2,
    x: deckhouse.pos.x + deckhouse.size.lx / 2,
    y: deckhouse.pos.y,
    z: deckhouse.pos.z + deckhouse.size.lz / 2,
  },
  {
    // Encloses the top 0.3 m segment of the mast (feature zone).
    comment: "mast tip",
    represents: "mast",
    highlight: false,
    lx: 0.3,
    ly: 0.3,
    lz: 0.3,
    x: mast.pos.x,
    y: mast.pos.y,
    z: mast.pos.z + mast.size.lz / 2 - 0.15,
  },
  { comment: "port bridge wing", represents: "bridge_wing_port", highlight: false, ...bridgeWingPort.size, ...bridgeWingPort.pos },
  { comment: "starboard bridge wing", represents: "bridge_wing_stbd", highlight: false, ...bridgeWingStbd.size, ...bridgeWingStbd.pos },
  {
    // Front (+X) face of the funnel (surface zone). Straddles the face
    // itself (half inside, half outside), matching "deckhouse leading
    // top edge" -- it should wrap the face, not float next to it.
    comment: "funnel front face",
    represents: "funnel",
    highlight: false,
    lx: edgeGap * 2,
    ly: funnel.size.ly,
    lz: funnel.size.lz,
    x: funnel.pos.x + funnel.size.lx / 2,
    y: funnel.pos.y,
    z: funnel.pos.z,
  },
  {
    // Open deck area forward of the deckhouse (x from the deckhouse's
    // front face at x=1 out to the bow at x=3); a clear zone.
    comment: "forward deck zone",
    represents: null,
    highlight: false,
    lx: deck.pos.x + deck.size.lx / 2 - (deckhouse.pos.x + deckhouse.size.lx / 2),
    ly: deck.size.ly,
    lz: 0.5,
    x: (deck.pos.x + deck.size.lx / 2 + deckhouse.pos.x + deckhouse.size.lx / 2) / 2,
    y: 0,
    z: deck.pos.z + deck.size.lz / 2 + 0.25,
  },
  {
    // Open deck area aft of the deckhouse (x from the stern at x=-3 up
    // to the deckhouse's back face at x=-2); a clear zone.
    comment: "aft deck zone",
    represents: null,
    highlight: false,
    lx: (deckhouse.pos.x - deckhouse.size.lx / 2) - (deck.pos.x - deck.size.lx / 2),
    ly: deck.size.ly,
    lz: 0.5,
    x: ((deck.pos.x - deck.size.lx / 2) + (deckhouse.pos.x - deckhouse.size.lx / 2)) / 2,
    y: 0,
    z: deck.pos.z + deck.size.lz / 2 + 0.25,
  },
];

// ---------------------------------------------------------------------
// 3b. Guard against ROI / unrelated-part overlaps (AABB check). This is
//     what caught the original version's bugs (funnel overhanging the
//     deckhouse edge; deck zones burying most of their volume inside the
//     deckhouse) -- keep it so future edits can't reintroduce them.
// ---------------------------------------------------------------------
function overlapVolume(rectLike, part) {
  const axisOverlap = (aMin, aMax, bMin, bMax) => Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
  const ox = axisOverlap(rectLike.x - rectLike.lx / 2, rectLike.x + rectLike.lx / 2, part.pos.x - part.size.lx / 2, part.pos.x + part.size.lx / 2);
  const oy = axisOverlap(rectLike.y - rectLike.ly / 2, rectLike.y + rectLike.ly / 2, part.pos.y - part.size.ly / 2, part.pos.y + part.size.ly / 2);
  const oz = axisOverlap(rectLike.z - rectLike.lz / 2, rectLike.z + rectLike.lz / 2, part.pos.z - part.size.lz / 2, part.pos.z + part.size.lz / 2);
  return ox * oy * oz;
}

const EPSILON_VOLUME = 1e-6;
for (const r of RECTS) {
  for (const part of PARTS) {
    if (part.name === r.represents) continue;
    const vol = overlapVolume(r, part);
    if (vol > EPSILON_VOLUME) {
      throw new Error(`ROI "${r.comment}" unexpectedly overlaps unrelated part "${part.name}" (volume ${vol.toFixed(6)} m^3)`);
    }
  }
}

// NOTE: rectParser's line format is `^[*]?lx,ly,lz,x,y,z$` with no
// trailing content allowed, so each ROI's description is written as its
// own comment line immediately above the data line (comment lines start
// with "#" and are skipped by the parser), rather than inline.
const csvLines = [
  "# Sample cuboid ROIs for samples/sample-structure.stl",
  "# Generated by scripts/generate-sample-structure.mjs -- do not edit by hand.",
  "# Format: [*]lx,ly,lz,x,y,z (Z is up; * highlights the cuboid)",
  ...RECTS.flatMap((r) => [`# ${r.comment}`, `${r.highlight ? "*" : ""}${fmt(r.lx)},${fmt(r.ly)},${fmt(r.lz)},${fmt(r.x)},${fmt(r.y)},${fmt(r.z)}`]),
];

// ---------------------------------------------------------------------
// 4. Write output files.
// ---------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "sample-structure.stl"), stlText, "utf-8");
writeFileSync(resolve(outDir, "sample-structure-rects.csv"), csvLines.join("\n") + "\n", "utf-8");

console.log(`Wrote ${PARTS.length} parts (${allTriangles.length} triangles) to samples/sample-structure.stl`);
console.log(`Wrote ${RECTS.length} rects to samples/sample-structure-rects.csv`);
