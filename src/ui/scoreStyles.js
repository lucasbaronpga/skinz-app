/**
 * Ergebnisse in der klassischen Scorekarten-Notation:
 * Birdie = Kreis, Eagle = Doppelkreis, Albatross = gefüllter Kreis,
 * Bogey = Quadrat, Double Bogey = Doppelquadrat, Triple+ = gefülltes Quadrat.
 * Die Schlüssel entsprechen den Labels der Spiel-Engine (lib/engine).
 *
 * `tile` beschreibt die Form um die Zahl, `badge` die kleine Textpille.
 */
const DOUBLE = "outline outline-2 outline-offset-[3px]"

export const SCORE_TONES = Object.freeze({
  Albatross: {
    tile: "rounded-full bg-amber-600 text-white",
    badge: "bg-amber-100 text-amber-700",
  },
  Eagle: {
    tile: `rounded-full border-2 border-current text-red-600 ${DOUBLE} outline-current`,
    badge: "bg-red-100 text-red-700",
  },
  Birdie: {
    tile: "rounded-full border-2 border-current text-red-600",
    badge: "bg-red-50 text-red-700",
  },
  Par: {
    tile: "border-2 border-transparent text-slate-950",
    badge: "bg-slate-100 text-slate-700",
  },
  Bogey: {
    tile: "rounded-[28%] border-2 border-current text-blue-600",
    badge: "bg-blue-50 text-blue-700",
  },
  "Double Bogey": {
    tile: `rounded-[28%] border-2 border-current text-blue-600 ${DOUBLE} outline-current`,
    badge: "bg-blue-100 text-blue-800",
  },
  "Triple+": {
    tile: "rounded-[28%] bg-blue-700 text-white",
    badge: "bg-blue-700 text-white",
  },
})

export function getScoreTone(label) {
  return SCORE_TONES[label] ?? SCORE_TONES.Par
}

/**
 * Farbe für To-Par-Werte im PGA-Tour-Stil: unter Par rot, über Par gedämpft.
 * Das ist die einzige Stelle, an der diese Entscheidung getroffen wird.
 */
export function getToParTextClass(toPar) {
  const value = Number(toPar)

  if (value < 0) return "text-red-600"
  if (value > 0) return "text-slate-500"

  return "text-slate-950"
}

/** Gewinn in Gold, Verlust in Rot, ausgeglichen neutral. */
export function getMoneyTextClass(cents) {
  const value = Number(cents)

  if (value > 0) return "text-amber-600"
  if (value < 0) return "text-red-600"

  return "text-slate-950"
}
