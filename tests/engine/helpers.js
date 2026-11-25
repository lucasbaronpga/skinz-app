export const PLAYERS = ["a", "b", "c", "d"]

/** Baut ein Par-Array; nicht genannte Löcher haben Par 4. */
export function parsWith(overrides = {}, holeCount = 18) {
  return Array.from({ length: holeCount }, (_, index) => overrides[index + 1] ?? 4)
}

export function makeConfig(overrides = {}) {
  return {
    gameMode: "classic",
    stakeCents: 100,
    holeCount: 18,
    pars: parsWith(),
    oozle: { enabled: false },
    ...overrides,
  }
}

export function makeMatch({ playerIds = PLAYERS, config = {}, holes = [] } = {}) {
  return { config: makeConfig(config), players: playerIds, holes }
}

/** Scores in Spielerreihenfolge, z. B. scores([4, 5, 5, 6]). */
export function scores(values, playerIds = PLAYERS) {
  return Object.fromEntries(playerIds.map((playerId, index) => [playerId, values[index]]))
}

export function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }

  return value
}

export function totalsById(result) {
  return Object.fromEntries(result.players.map((player) => [player.playerId, player.totalCents]))
}

export function skinzById(result) {
  return Object.fromEntries(result.players.map((player) => [player.playerId, player.skinz]))
}
