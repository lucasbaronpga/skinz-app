import { formatToPar } from "./format.js"

export const LEADERBOARD_SORTS = Object.freeze([
  { value: "earnings", label: "Euro" },
  { value: "skinz", label: "Skinz" },
  { value: "wins", label: "Siege" },
])

/** Skinz HCP mit einer Nachkommastelle, z. B. "4,2" oder "+1,5" (besser als Scratch). */
export function formatSkinzHandicap(value) {
  if (value === null || value === undefined) return "–"

  const number = Number(value)
  const text = Math.abs(number).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return number < 0 ? `+${text}` : text
}

export function formatHandicapIndex(value) {
  if (value === null || value === undefined) return "–"

  return Number(value).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function formatAverageToPar(value) {
  if (value === null || value === undefined) return "–"

  return formatToPar(Math.round(Number(value) * 10) / 10).replace(".", ",")
}

export function describeBestRound(bestRound) {
  if (!bestRound) return "–"

  return `${bestRound.totalStrokes} (${formatToPar(bestRound.totalToPar)})`
}
