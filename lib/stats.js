/**
 * Statistik aus abgeschlossenen Matches (reine Funktionen, alle Beträge in Cent).
 *
 * match: { id, matchCode, completedAt, season, holeCount, stakeCents,
 *          players: [{ userId, totalStrokes, totalToPar, skinz, totalCents }] }
 */

export const SORT_KEYS = Object.freeze(["earnings", "skinz", "wins"])

function overPar18(player, match) {
  return Number(player.totalToPar) * (18 / Number(match.holeCount))
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10
}

/** Sieger ist nur, wer allein den höchsten Betrag hat. */
export function getWinnerId(match) {
  const sorted = [...match.players].sort((first, second) => second.totalCents - first.totalCents)

  if (sorted.length === 0) return null
  if (sorted.length > 1 && sorted[0].totalCents === sorted[1].totalCents) return null

  return sorted[0].userId
}

function emptyStats(userId) {
  return {
    userId,
    rounds: 0,
    wins: 0,
    earningsCents: 0,
    skinz: 0,
    overParSum: 0,
    bestRound: null,
  }
}

/** Summen je Spieler über die übergebenen Matches. */
export function aggregatePlayers(matches) {
  const stats = new Map()

  matches.forEach((match) => {
    const winnerId = getWinnerId(match)

    match.players.forEach((player) => {
      const entry = stats.get(player.userId) ?? emptyStats(player.userId)
      const value = overPar18(player, match)

      entry.rounds += 1
      entry.wins += player.userId === winnerId ? 1 : 0
      entry.earningsCents += player.totalCents
      entry.skinz += player.skinz
      entry.overParSum += value

      if (!entry.bestRound || player.totalToPar < entry.bestRound.totalToPar) {
        entry.bestRound = {
          matchId: match.id,
          matchCode: match.matchCode,
          totalStrokes: player.totalStrokes,
          totalToPar: player.totalToPar,
          holeCount: match.holeCount,
        }
      }

      stats.set(player.userId, entry)
    })
  })

  return new Map(
    [...stats.entries()].map(([userId, entry]) => [
      userId,
      {
        userId,
        rounds: entry.rounds,
        wins: entry.wins,
        earningsCents: entry.earningsCents,
        skinz: entry.skinz,
        averageToPar18: entry.rounds ? roundToTenth(entry.overParSum / entry.rounds) : null,
        bestRound: entry.bestRound,
      },
    ])
  )
}

function getSortValue(row, sort) {
  if (sort === "skinz") return row.skinz
  if (sort === "wins") return row.wins

  return row.earningsCents
}

/** Rangliste mit Platzierung, Gleichstand als "T2". Nebenkriterien: Geld, Siege, Skinz. */
export function rankPlayers(rows, sort = "earnings") {
  const sorted = [...rows].sort(
    (first, second) =>
      getSortValue(second, sort) - getSortValue(first, sort) ||
      second.earningsCents - first.earningsCents ||
      second.wins - first.wins ||
      second.skinz - first.skinz ||
      String(first.userId).localeCompare(String(second.userId))
  )

  return sorted.map((row) => {
    const value = getSortValue(row, sort)
    const firstIndex = sorted.findIndex((entry) => getSortValue(entry, sort) === value)
    const tied = sorted.filter((entry) => getSortValue(entry, sort) === value).length > 1

    return { ...row, position: tied ? `T${firstIndex + 1}` : String(firstIndex + 1) }
  })
}

/** Bilanz eines Spielers gegen jeden Mitspieler (Skinz-Differenz × Einsatz). */
export function headToHead(matches, userId) {
  const rows = new Map()

  matches.forEach((match) => {
    const me = match.players.find((player) => player.userId === userId)

    if (!me) return

    match.players
      .filter((player) => player.userId !== userId)
      .forEach((opponent) => {
        const entry = rows.get(opponent.userId) ?? {
          opponentId: opponent.userId,
          matches: 0,
          wins: 0,
          losses: 0,
          balanceCents: 0,
        }

        entry.matches += 1
        entry.wins += me.totalCents > opponent.totalCents ? 1 : 0
        entry.losses += me.totalCents < opponent.totalCents ? 1 : 0
        entry.balanceCents += (me.skinz - opponent.skinz) * match.stakeCents
        rows.set(opponent.userId, entry)
      })
  })

  return [...rows.values()].sort(
    (first, second) => second.matches - first.matches || second.balanceCents - first.balanceCents
  )
}

/** Kumulierter Gewinn über die Saison, ein Punkt je Match. */
export function seasonSeries(matches, userId) {
  let total = 0

  return matches
    .filter((match) => match.players.some((player) => player.userId === userId))
    .map((match) => {
      const me = match.players.find((player) => player.userId === userId)

      total += me.totalCents

      return { matchId: match.id, completedAt: match.completedAt, deltaCents: me.totalCents, totalCents: total }
    })
}

/** Alle Saisons (Jahre) mit Matches, die neueste zuerst. */
export function listSeasons(matches) {
  return [...new Set(matches.map((match) => match.season))].sort((first, second) => second - first)
}
