/**
 * Skinz HCP: eigenes Rating aus Score, Match-Erfolg und Gegnerstärke.
 * Einheit Schläge über Par auf 18 Löcher, niedriger ist besser.
 *
 * Rundenwert  = Über Par (auf 18 Löcher) − Erfolgsbonus
 * Erfolgsbonus = 8 × (Skinz-Anteil − fairer Anteil) × Gegnerfaktor
 * Gegnerfaktor = 1 + (eigenes HCP − Ø HCP der Gegner) / 36, begrenzt auf 0,5 bis 1,5
 * Skinz HCP    = Durchschnitt der besten 8 der letzten 10 Rundenwerte, ab 3 Runden
 */

export const SUCCESS_WEIGHT = 8
export const MINIMUM_ROUNDS = 3
export const RECENT_ROUNDS = 10
export const COUNTING_ROUNDS = 8
export const DEFAULT_HANDICAP = 18

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10
}

export function getOpponentFactor(ownHandicap, opponentHandicaps) {
  if (opponentHandicaps.length === 0) return 1

  const average = opponentHandicaps.reduce((sum, value) => sum + value, 0) / opponentHandicaps.length

  return clamp(1 + (ownHandicap - average) / 36, 0.5, 1.5)
}

/**
 * Rundenwert eines Spielers. skinz: eigene Skinz, totalSkinz: alle Skinz im
 * Match, playerCount: Anzahl Spieler. Ohne vergebene Skinz zählt der faire Anteil.
 */
export function calculateRoundValue({ totalToPar, holeCount, skinz, totalSkinz, playerCount, opponentFactor = 1 }) {
  const overPar18 = Number(totalToPar) * (18 / Number(holeCount))
  const fairShare = 1 / playerCount
  const share = totalSkinz > 0 ? skinz / totalSkinz : fairShare
  const bonus = SUCCESS_WEIGHT * (share - fairShare) * opponentFactor

  return overPar18 - bonus
}

/** Durchschnitt der besten 8 der letzten 10 Rundenwerte, null unter 3 Runden. */
export function calculateHandicap(roundValues) {
  if (roundValues.length < MINIMUM_ROUNDS) return null

  const counting = roundValues
    .slice(-RECENT_ROUNDS)
    .sort((first, second) => first - second)
    .slice(0, COUNTING_ROUNDS)

  return roundToTenth(counting.reduce((sum, value) => sum + value, 0) / counting.length)
}

/**
 * Berechnet das Skinz HCP aller Spieler aus allen abgeschlossenen Matches in
 * zeitlicher Reihenfolge. Für die Gegnerstärke zählt der Stand vor dem Match:
 * Skinz HCP, sonst offizielles HCP, sonst 18.
 *
 * matches: [{ holeCount, players: [{ userId, totalToPar, skinz }] }] chronologisch
 * officialHandicaps: Map userId → offizielles HCP oder null
 */
export function computeSkinzHandicaps(matches, officialHandicaps = new Map()) {
  const roundValues = new Map()

  function currentHandicap(userId) {
    const own = calculateHandicap(roundValues.get(userId) ?? [])

    if (own !== null) return own

    const official = officialHandicaps.get(userId)

    return Number.isFinite(official) ? official : DEFAULT_HANDICAP
  }

  matches.forEach((match) => {
    const players = match.players ?? []

    if (players.length < 2) return

    const totalSkinz = players.reduce((sum, player) => sum + (Number(player.skinz) || 0), 0)
    const handicaps = new Map(players.map((player) => [player.userId, currentHandicap(player.userId)]))

    players.forEach((player) => {
      const opponents = players.filter((entry) => entry.userId !== player.userId)
      const value = calculateRoundValue({
        totalToPar: player.totalToPar,
        holeCount: match.holeCount,
        skinz: Number(player.skinz) || 0,
        totalSkinz,
        playerCount: players.length,
        opponentFactor: getOpponentFactor(
          handicaps.get(player.userId),
          opponents.map((opponent) => handicaps.get(opponent.userId))
        ),
      })
      const list = roundValues.get(player.userId) ?? []

      list.push(value)
      roundValues.set(player.userId, list)
    })
  })

  return new Map(
    [...roundValues.entries()].map(([userId, values]) => [
      userId,
      { value: calculateHandicap(values), rounds: values.length },
    ])
  )
}
