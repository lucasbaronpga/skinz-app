export const GAME_MODE_OPTIONS = Object.freeze([
  {
    value: "classic",
    label: "Classic Skinz",
    description: "Jeder alleinige Lochgewinn zählt 1 Skin. Bei Gleichstand wandert er weiter.",
  },
  {
    value: "professional",
    label: "Skinz Professional",
    description: "Wie Classic, zusätzlich Birdie +1, Eagle +2 und Albatross +3 Skinz.",
  },
  {
    value: "wolffn",
    label: "Wolffn",
    description: "Genau 4 Spieler. Teams pro Loch, Bestball und Multiplikatoren.",
  },
])

export function getGameModeLabel(gameMode) {
  return GAME_MODE_OPTIONS.find((option) => option.value === gameMode)?.label ?? "Skinz"
}

/** Anzahl Zusagen, die zum Start nötig sind. */
export function getRequiredPlayers(gameMode) {
  return gameMode === "wolffn" ? { min: 4, max: 4 } : { min: 2, max: 4 }
}
