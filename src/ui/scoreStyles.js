/**
 * Einheitliche Darstellung der Ergebnisse (Scorekarten-Konvention):
 * Birdie rot, Eagle orange, Albatross gold, Bogey blau.
 * Die Schlüssel entsprechen den Labels der Spiel-Engine (lib/engine).
 */
export const SCORE_TONES = Object.freeze({
  Albatross: {
    tile: "bg-amber-300 text-black shadow-[0_18px_42px_rgba(251,191,36,0.34)]",
    badge: "bg-amber-300 text-black",
  },
  Eagle: {
    tile: "bg-orange-500 text-white shadow-[0_18px_42px_rgba(249,115,22,0.34)]",
    badge: "bg-orange-500 text-white",
  },
  Birdie: {
    tile: "bg-red-500 text-white shadow-[0_18px_42px_rgba(239,68,68,0.34)]",
    badge: "bg-red-500 text-white",
  },
  Par: {
    tile: "bg-slate-950 text-white ring-1 ring-white/20 shadow-[0_18px_42px_rgba(15,23,42,0.32)]",
    badge: "bg-slate-950 text-white ring-1 ring-white/20",
  },
  Bogey: {
    tile: "bg-blue-500 text-white shadow-[0_18px_42px_rgba(59,130,246,0.32)]",
    badge: "bg-blue-500 text-white",
  },
  "Double Bogey": {
    tile: "bg-blue-900 text-white shadow-[0_18px_42px_rgba(30,58,138,0.34)]",
    badge: "bg-blue-900 text-white",
  },
  "Triple+": {
    tile: "bg-purple-600 text-white shadow-[0_18px_42px_rgba(147,51,234,0.32)]",
    badge: "bg-purple-600 text-white",
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

  if (value < 0) return "text-red-500"
  if (value > 0) return "text-slate-500"

  return "text-slate-950"
}

/** Gewinn in Gold, Verlust in Rot, ausgeglichen neutral. */
export function getMoneyTextClass(cents) {
  const value = Number(cents)

  if (value > 0) return "text-amber-500"
  if (value < 0) return "text-red-500"

  return "text-slate-950"
}
