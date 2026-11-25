import { WOLFFN_DECISIONS } from "./constants.js"
import { fail } from "./errors.js"
import { getToPar, getWolffnScoreMultiplier } from "./scoring.js"

/** Die Abschlagreihenfolge rotiert pro Loch, der Erste entscheidet. */
export function getTeeOrder(playerIds, holeNumber) {
  const offset = (holeNumber - 1) % playerIds.length

  return [...playerIds.slice(offset), ...playerIds.slice(0, offset)]
}

/**
 * - alone: Der Erste spielt allein gegen drei (1v3).
 * - accepted: Der Erste und der gefragte Spieler spielen zusammen (2v2).
 * - declined: Der gefragte Spieler spielt allein gegen drei (1v3).
 */
export function resolveWolffnTeams({ teeOrder, decision, askedPlayerId }) {
  const decisionPlayerId = teeOrder[0]
  const candidateIds = teeOrder.slice(1)

  if (decision === WOLFFN_DECISIONS.ALONE) {
    if (askedPlayerId) {
      fail(
        "INVALID_WOLFFN_DECISION",
        "Wer allein spielt, darf keinen Partner gefragt haben."
      )
    }

    return {
      format: "1v3",
      multiplier: 2,
      decisionPlayerId,
      wolfPlayerId: decisionPlayerId,
      askedPlayerId: null,
      teamAPlayerIds: [decisionPlayerId],
      teamBPlayerIds: candidateIds,
    }
  }

  if (!askedPlayerId || !candidateIds.includes(askedPlayerId)) {
    fail(
      "INVALID_WOLFFN_DECISION",
      "Der gefragte Partner muss einer der drei anderen Spieler sein."
    )
  }

  const remainingIds = candidateIds.filter((playerId) => playerId !== askedPlayerId)

  if (decision === WOLFFN_DECISIONS.ACCEPTED) {
    return {
      format: "2v2",
      multiplier: 1,
      decisionPlayerId,
      wolfPlayerId: null,
      askedPlayerId,
      teamAPlayerIds: [decisionPlayerId, askedPlayerId],
      teamBPlayerIds: remainingIds,
    }
  }

  return {
    format: "1v3",
    multiplier: 2,
    decisionPlayerId,
    wolfPlayerId: askedPlayerId,
    askedPlayerId,
    teamAPlayerIds: [askedPlayerId],
    teamBPlayerIds: [decisionPlayerId, ...remainingIds],
  }
}

function getBestScore(teamPlayerIds, scores) {
  return Math.min(...teamPlayerIds.map((playerId) => scores.get(playerId)))
}

/**
 * Wolffn: Bestball je Team. Der Pot (Carryover + 1 Skin) wird mit dem
 * Wolffn-Multiplikator (1v3 ×2) und dem Score-Multiplikator (Birdie ×2,
 * Eagle oder besser ×4) multipliziert. Die Multiplikatoren gelten auch für
 * den Carryover bei geteiltem Loch.
 */
export function calculateWolffnHole({
  playerIds,
  scores,
  par,
  carryoverBefore,
  teams,
  teeOrder,
}) {
  const teamAScore = getBestScore(teams.teamAPlayerIds, scores)
  const teamBScore = getBestScore(teams.teamBPlayerIds, scores)
  const tie = teamAScore === teamBScore
  const winningScore = Math.min(teamAScore, teamBScore)

  const basePotSkinz = carryoverBefore + 1
  const scoreMultiplier = getWolffnScoreMultiplier(getToPar(winningScore, par))
  const totalMultiplier = teams.multiplier * scoreMultiplier
  const potSkinz = basePotSkinz * totalMultiplier

  const winnerIds = tie
    ? []
    : teamAScore < teamBScore
      ? teams.teamAPlayerIds
      : teams.teamBPlayerIds

  const holeSkinzByPlayer = new Map(playerIds.map((playerId) => [playerId, 0]))
  winnerIds.forEach((playerId) => holeSkinzByPlayer.set(playerId, potSkinz))

  return {
    tie,
    winningScore,
    winnerIds,
    sharedBestIds: playerIds.filter((playerId) => scores.get(playerId) === winningScore),
    potSkinz,
    carryoverAfter: tie ? potSkinz : 0,
    holeSkinzByPlayer,
    bonusSkinzByPlayer: new Map(playerIds.map((playerId) => [playerId, 0])),
    details: {
      format: teams.format,
      teeOrder,
      decisionPlayerId: teams.decisionPlayerId,
      wolfPlayerId: teams.wolfPlayerId,
      askedPlayerId: teams.askedPlayerId,
      teamAPlayerIds: teams.teamAPlayerIds,
      teamBPlayerIds: teams.teamBPlayerIds,
      teamAScore,
      teamBScore,
      basePotSkinz,
      wolffnMultiplier: teams.multiplier,
      scoreMultiplier,
      totalMultiplier,
    },
  }
}
