import { calculateMatch } from "../../lib/engine/index.js"
import { getGameModeLabel } from "./gameModes.js"
import { formatSkinz } from "./format.js"

/**
 * Hilfsfunktionen für Archiv und Match-Details. Grundlage ist die Antwort von
 * /api/matches (Beträge dort in Euro, hier für die Anzeige in Cent).
 */

export function eurosToCents(value) {
  const number = Number(value)

  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

function getTime(isoString) {
  const time = Date.parse(isoString || "")

  return Number.isFinite(time) ? time : 0
}

/** Abgeschlossene Matches, das neueste zuerst. */
export function getCompletedMatches(matches) {
  return (Array.isArray(matches) ? matches : [])
    .filter((match) => match?.status === "completed")
    .sort(
      (first, second) =>
        getTime(second.completedAt || second.updatedAt) - getTime(first.completedAt || first.updatedAt)
    )
}

export function findMatch(matches, idOrCode) {
  const key = String(idOrCode ?? "")

  return (Array.isArray(matches) ? matches : []).find(
    (match) => String(match.id) === key || String(match.matchCode) === key
  ) ?? null
}

export function getMatchTitle(match) {
  return match?.course?.clubName || match?.course?.name || "Golfplatz"
}

export function getModeLabel(match) {
  return getGameModeLabel(match?.gameMode)
}

/** Spieler nach Geld, Skinz und To Par sortiert, mit Platzierung (T bei Gleichstand). */
export function getStandings(match, currentUserId) {
  const rows = (Array.isArray(match?.players) ? match.players : []).map((player) => ({
    userId: String(player.userId),
    name: player.name,
    shortName: player.shortName || null,
    skinz: Number(player.skins) || 0,
    totalCents: eurosToCents(player.winnings),
    totalToPar: Number(player.totalToPar) || 0,
    totalStrokes: Number(player.total) || 0,
    displayOrder: Number(player.displayOrder) || 0,
    isMe: String(player.userId) === String(currentUserId),
  }))

  rows.sort(
    (first, second) =>
      second.totalCents - first.totalCents ||
      second.skinz - first.skinz ||
      first.totalToPar - second.totalToPar ||
      first.name.localeCompare(second.name)
  )

  return rows.map((row, index) => {
    const tied = rows.filter((entry) => entry.totalCents === row.totalCents).length > 1
    const firstIndex = rows.findIndex((entry) => entry.totalCents === row.totalCents)

    return { ...row, position: tied ? `T${firstIndex + 1}` : String(index + 1) }
  })
}

export function getWinnerLabel(match) {
  const standings = getStandings(match)

  if (standings.length === 0) return "–"
  if (standings.length > 1 && standings[0].totalCents === standings[1].totalCents) return "Unentschieden"

  return standings[0].name
}

/** Par je Loch aus dem Platz-Snapshot, sonst aus den gespielten Löchern. */
export function getCoursePars(match) {
  const holeCount = Number(match?.holeCount) || 0
  const snapshotPars = Array.isArray(match?.course?.pars) ? match.course.pars.map(Number) : []

  if (snapshotPars.length === holeCount) return snapshotPars

  const parsByHole = new Map((match?.holes ?? []).map((hole) => [Number(hole.holeNumber), Number(hole.par)]))

  return Array.from({ length: holeCount }, (_, index) => parsByHole.get(index + 1) ?? 4)
}

/** Scorecard-Zeilen in Abschlagreihenfolge: je Spieler die Scores je Loch. */
export function getScorecardRows(match) {
  const holeCount = Number(match?.holeCount) || 0
  const scoresByPlayer = new Map()

  ;(match?.holes ?? []).forEach((hole) => {
    ;(hole.players ?? []).forEach((holePlayer) => {
      const key = String(holePlayer.userId)
      const scores = scoresByPlayer.get(key) ?? new Array(holeCount).fill(null)

      scores[Number(hole.holeNumber) - 1] = Number(holePlayer.score)
      scoresByPlayer.set(key, scores)
    })
  })

  return [...(match?.players ?? [])]
    .sort((first, second) => first.displayOrder - second.displayOrder)
    .map((player) => ({
      key: String(player.userId),
      label: player.shortName || player.name,
      scores: scoresByPlayer.get(String(player.userId)) ?? new Array(holeCount).fill(null),
    }))
}

/** Text für den Ausgang eines Lochs, inklusive der Löcher eines gewonnenen Carryovers. */
export function describeHoleOutcome(holes, index, holeCount) {
  const hole = holes[index]
  const isLastHole = Number(hole.holeNumber) === Number(holeCount)

  if (hole.hasTie) {
    if (Number(hole.carryoverAfter) > 0) {
      return { title: "Geteilt", detail: `${formatSkinz(hole.carryoverAfter)} wandern weiter` }
    }

    return {
      title: "Geteilt",
      detail: isLastHole ? "Offene Skinz an die Besten verteilt" : "",
    }
  }

  let firstHole = Number(hole.holeNumber)

  for (let previous = index - 1; previous >= 0 && holes[previous].hasTie; previous -= 1) {
    firstHole = Number(holes[previous].holeNumber)
  }

  const range = firstHole < Number(hole.holeNumber) ? ` · Löcher ${firstHole}–${hole.holeNumber}` : ""

  return { title: hole.winnerLabel || "Gewinner", detail: `${formatSkinz(hole.skinzAwarded)}${range}` }
}

/** Zusatzinfos je Loch: Oozle, Wolffn-Teams und Professional-Bonus. */
export function getHoleBadges(match, hole) {
  const badges = []
  const data = hole.gameData ?? {}
  const namesById = new Map((match?.players ?? []).map((player) => [String(player.userId), player.name]))

  if (data.oozle) {
    const { outcome, playerName, expired } = data.oozle

    if (outcome === "oozle") badges.push({ label: `Oozle · ${playerName}`, tone: "warning" })
    else if (outcome === "foozle") badges.push({ label: `Foozle · ${playerName}`, tone: "negative" })
    else badges.push({ label: expired ? "Oozle verfallen" : "Oozle Carryover", tone: "neutral" })
  }

  if (data.wolffnFormat) {
    badges.push({
      label:
        data.wolffnFormat === "1v3" && data.wolffnPlayer
          ? `🐺 ${data.wolffnPlayer} allein`
          : `🐺 ${(data.wolffnTeamA ?? []).join(" + ")} vs ${(data.wolffnTeamB ?? []).join(" + ")}`,
      tone: "dark",
    })

    if (data.scoreMultiplierLabel) badges.push({ label: data.scoreMultiplierLabel, tone: "negative" })
  }

  ;(hole.players ?? []).forEach((holePlayer) => {
    const bonus = Number(holePlayer.resultData?.bonusSkins) || 0

    if (bonus > 0) {
      badges.push({
        label: `${namesById.get(String(holePlayer.userId)) ?? "Spieler"} ${holePlayer.resultLabel} +${bonus}`,
        tone: "positive",
      })
    }
  })

  return badges
}

/**
 * Rohdaten für die Spiel-Engine. Matches der alten App haben keine Roheingaben,
 * dann wird null geliefert.
 */
export function buildEngineInput(match) {
  const holes = [...(match?.holes ?? [])].sort((first, second) => first.holeNumber - second.holeNumber)
  const complete = holes.every(
    (hole, index) => Number(hole.holeNumber) === index + 1 && hole.gameData?.input?.scores
  )

  if (!match || holes.length === 0 || !complete) return null

  const oozle = match.oozleConfig ?? {}

  return {
    config: {
      gameMode: match.gameMode,
      stakeCents: eurosToCents(match.stake),
      holeCount: Number(match.holeCount),
      pars: getCoursePars(match),
      oozle: oozle.enabled
        ? { enabled: true, valueCents: eurosToCents(oozle.value), carryoverEnabled: oozle.carryoverEnabled !== false }
        : { enabled: false },
    },
    players: [...match.players]
      .sort((first, second) => first.displayOrder - second.displayOrder)
      .map((player) => String(player.userId)),
    holes: holes.map((hole) => hole.gameData.input),
  }
}

/**
 * Abrechnung eines Spielers gegen jeden Gegner. Neue Matches rechnet die
 * Spiel-Engine exakt nach (inklusive Oozle), alte Matches nur über die Skinz.
 */
export function getPairBreakdown(match, userId) {
  const key = String(userId)
  const namesById = new Map((match?.players ?? []).map((player) => [String(player.userId), player.name]))
  const input = buildEngineInput(match)

  if (input) {
    try {
      return calculateMatch(input)
        .settlement.pairs.filter((pair) => pair.playerId === key)
        .map((pair) => ({
          opponentId: pair.opponentId,
          opponentName: namesById.get(pair.opponentId) ?? "Spieler",
          skinzDifference: pair.skinzDifference,
          skinzCents: pair.skinzCents,
          oozleCents: pair.oozleCents,
          totalCents: pair.totalCents,
          exact: true,
        }))
    } catch (error) {
      console.error("Pair breakdown failed.", error)
    }
  }

  const players = match?.players ?? []
  const me = players.find((player) => String(player.userId) === key)
  const stakeCents = eurosToCents(match?.stake)

  return players
    .filter((player) => String(player.userId) !== key)
    .map((opponent) => {
      const difference = (Number(me?.skins) || 0) - (Number(opponent.skins) || 0)

      return {
        opponentId: String(opponent.userId),
        opponentName: opponent.name,
        skinzDifference: difference,
        skinzCents: difference * stakeCents,
        oozleCents: 0,
        totalCents: difference * stakeCents,
        exact: false,
      }
    })
}
