import { getGameModeLabel } from "./gameModes.js"

/** Spieler mit Ergebnis, sortiert wie im Leaderboard (Geld, Skinz, To Par). */
export function getStandings(match) {
  const totals = new Map((match?.result?.players ?? []).map((player) => [player.playerId, player]))
  const rows = (match?.players ?? []).map((player) => {
    const total = totals.get(player.userId)

    return {
      ...player,
      skinz: total?.skinz ?? 0,
      totalCents: total?.totalCents ?? 0,
      totalToPar: total?.totalToPar ?? 0,
      totalStrokes: total?.totalStrokes ?? 0,
    }
  })

  rows.sort(
    (first, second) =>
      second.totalCents - first.totalCents ||
      second.skinz - first.skinz ||
      first.totalToPar - second.totalToPar ||
      first.name.localeCompare(second.name)
  )

  return rows.map((row, index) => {
    const tiedWithPrevious = index > 0 && rows[index - 1].totalCents === row.totalCents
    const tiedWithNext = index < rows.length - 1 && rows[index + 1].totalCents === row.totalCents
    const firstIndex = rows.findIndex((entry) => entry.totalCents === row.totalCents)

    return {
      ...row,
      position: tiedWithPrevious || tiedWithNext ? `T${firstIndex + 1}` : String(index + 1),
    }
  })
}

export function getHolesPlayed(match) {
  return Array.isArray(match?.inputs) ? match.inputs.length : 0
}

export function getModeTitle(match) {
  return getGameModeLabel(match?.config?.gameMode)
}

export function getCourseTitle(match) {
  return match?.course?.clubName || match?.course?.name || "Golfplatz"
}

/** Leader nur bei eindeutiger Führung, sonst "All Square". */
export function getLeaderName(match) {
  const standings = getStandings(match)

  if (standings.length < 2 || standings[0].totalCents === standings[1].totalCents) return "All Square"

  return standings[0].name
}

export function formatDateTime(isoString) {
  if (!isoString) return ""

  const date = new Date(isoString)

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}
