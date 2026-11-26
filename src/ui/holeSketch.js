const SKETCHES = Object.freeze({
  3: {
    tee: { x: 24, y: 60 },
    fairwayPath: "M 24 60 L 188 58",
    fairwayWidth: 10,
    green: { x: 204, y: 58, r: 17 },
    bunkers: [
      { cx: 186, cy: 38, rx: 9, ry: 6, rotate: -20 },
      { cx: 188, cy: 79, rx: 8, ry: 6, rotate: 25 },
    ],
  },
  4: {
    tee: { x: 24, y: 88 },
    fairwayPath: "M 24 88 C 80 88, 110 52, 160 54 S 190 58, 204 52",
    fairwayWidth: 22,
    green: { x: 208, y: 52, r: 16 },
    bunkers: [
      { cx: 150, cy: 76, rx: 10, ry: 6, rotate: 20 },
      { cx: 186, cy: 36, rx: 8, ry: 5, rotate: -15 },
    ],
  },
  5: {
    tee: { x: 22, y: 94 },
    fairwayPath: "M 22 94 C 62 94, 78 46, 118 56 S 168 104, 206 62",
    fairwayWidth: 22,
    green: { x: 212, y: 60, r: 15 },
    bunkers: [
      { cx: 118, cy: 80, rx: 11, ry: 6, rotate: 0 },
      { cx: 176, cy: 88, rx: 9, ry: 6, rotate: 20 },
      { cx: 196, cy: 40, rx: 8, ry: 5, rotate: -20 },
    ],
  },
})

export const HOLE_SKETCH_VIEWBOX = Object.freeze({ width: 240, height: 120 })

/** Par 3, 4 und 5 haben eigene Formen, Par 6 und mehr nutzen die Par-5-Form. */
export function normalizeSketchPar(par) {
  const value = Math.round(Number(par))

  if (!Number.isFinite(value) || value <= 3) return 3
  if (value === 4) return 4

  return 5
}

export function getHoleSketch({ par, mirrored = false }) {
  return { ...SKETCHES[normalizeSketchPar(par)], mirrored: Boolean(mirrored) }
}
