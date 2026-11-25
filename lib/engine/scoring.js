import { RESULT_LABELS } from "./constants.js"

export function getToPar(score, par) {
  return score - par
}

export function getResultLabel(score, par) {
  const toPar = getToPar(score, par)

  if (toPar <= -3) return RESULT_LABELS.ALBATROSS
  if (toPar === -2) return RESULT_LABELS.EAGLE
  if (toPar === -1) return RESULT_LABELS.BIRDIE
  if (toPar === 0) return RESULT_LABELS.PAR
  if (toPar === 1) return RESULT_LABELS.BOGEY
  if (toPar === 2) return RESULT_LABELS.DOUBLE_BOGEY

  return RESULT_LABELS.TRIPLE_PLUS
}

/**
 * Skinz Professional: zusätzliche Skinz für das eigene Ergebnis,
 * unabhängig davon, ob das Loch gewonnen, geteilt oder verloren wird.
 * Birdie +1, Eagle +2, Albatross (oder besser) +3.
 */
export function getBirdieBonusSkinz(toPar) {
  if (toPar <= -3) return 3
  if (toPar === -2) return 2
  if (toPar === -1) return 1

  return 0
}

/** Wolffn: Multiplikator auf den gesamten Pot, bestimmt vom besten Score. */
export function getWolffnScoreMultiplier(toPar) {
  if (toPar <= -2) return 4
  if (toPar === -1) return 2

  return 1
}
