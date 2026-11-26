export const STAKE_PRESETS_CENTS = Object.freeze([10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000])
export const DEFAULT_STAKE_CENTS = 200
export const DEFAULT_OOZLE_CENTS = 100

/** Nächster Einsatz in der Preset-Reihe (direction: 1 oder -1). */
export function stepStake(currentCents, direction) {
  const current = Number(currentCents) || 0

  if (direction > 0) {
    return STAKE_PRESETS_CENTS.find((preset) => preset > current) ?? STAKE_PRESETS_CENTS.at(-1)
  }

  return [...STAKE_PRESETS_CENTS].reverse().find((preset) => preset < current) ?? STAKE_PRESETS_CENTS[0]
}

export function canStepStake(currentCents, direction) {
  return direction > 0
    ? currentCents < STAKE_PRESETS_CENTS.at(-1)
    : currentCents > STAKE_PRESETS_CENTS[0]
}
