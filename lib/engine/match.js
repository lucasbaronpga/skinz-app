import { GAME_MODES } from "./constants.js"
import { resolveOozle } from "./oozle.js"
import { calculateSettlement } from "./settlement.js"
import { getResultLabel, getToPar } from "./scoring.js"
import { calculateSkinsHole } from "./skins.js"
import { normalizeMatchInput } from "./validation.js"
import { calculateWolffnHole, getTeeOrder, resolveWolffnTeams } from "./wolffn.js"

function createZeroMap(playerIds) {
  return new Map(playerIds.map((playerId) => [playerId, 0]))
}

function calculateHoleCore({ config, playerIds, hole, par, carryoverBefore }) {
  if (config.gameMode === GAME_MODES.WOLFFN) {
    const teeOrder = getTeeOrder(playerIds, hole.holeNumber)
    const teams = resolveWolffnTeams({
      teeOrder,
      decision: hole.wolffn.decision,
      askedPlayerId: hole.wolffn.askedPlayerId,
    })

    return calculateWolffnHole({
      playerIds,
      scores: hole.scores,
      par,
      carryoverBefore,
      teams,
      teeOrder,
    })
  }

  return calculateSkinsHole({
    playerIds,
    scores: hole.scores,
    par,
    carryoverBefore,
    bonusEnabled: config.gameMode === GAME_MODES.PROFESSIONAL,
  })
}

/**
 * Berechnet ein Match vollständig aus den Rohdaten (Scores und Entscheidungen).
 *
 * Die Funktion ist rein und deterministisch: Wer einen Score korrigiert,
 * berechnet das gesamte Match einfach neu. Der Server ist damit die einzige
 * Quelle für Skinz, Carryover und Abrechnung.
 *
 * @param {object} rawInput { config, players: string[], holes: object[] }
 */
export function calculateMatch(rawInput) {
  const { config, playerIds, holes } = normalizeMatchInput(rawInput)
  const opponentCount = playerIds.length - 1

  const skinz = createZeroMap(playerIds)
  const bonusSkinz = createZeroMap(playerIds)
  const strokes = createZeroMap(playerIds)
  const toParTotals = createZeroMap(playerIds)
  const transfers = []

  let carryoverSkinz = 0
  let oozleCarryoverUnits = 0
  let finalCarryover = null
  let previousTotalsCents = createZeroMap(playerIds)
  let settlement = calculateSettlement({
    playerIds,
    skinz,
    transfers,
    stakeCents: config.stakeCents,
  })

  const holeResults = holes.map((hole) => {
    const index = hole.holeNumber - 1
    const par = config.pars[index]
    const isLastHole = hole.holeNumber === config.holeCount
    const carryoverBefore = carryoverSkinz

    const core = calculateHoleCore({ config, playerIds, hole, par, carryoverBefore })

    let oozle = null

    if (hole.oozle) {
      const hasFutureParThree = config.pars
        .slice(hole.holeNumber)
        .some((futureParValue) => futureParValue === 3)

      oozle = resolveOozle({
        playerIds,
        input: hole.oozle,
        config: config.oozle,
        carryoverUnits: oozleCarryoverUnits,
        hasFutureParThree,
      })

      transfers.push(...oozle.transfers)
      oozleCarryoverUnits = oozle.carryoverUnitsAfter
    }

    const endCarryoverByPlayer = createZeroMap(playerIds)
    let carryoverAfter = core.carryoverAfter

    if (isLastHole && carryoverAfter > 0) {
      core.sharedBestIds.forEach((playerId) =>
        endCarryoverByPlayer.set(playerId, carryoverAfter)
      )
      finalCarryover = {
        skinz: carryoverAfter,
        recipientPlayerIds: [...core.sharedBestIds],
      }
      carryoverAfter = 0
    }

    carryoverSkinz = carryoverAfter

    playerIds.forEach((playerId) => {
      const score = hole.scores.get(playerId)

      skinz.set(
        playerId,
        skinz.get(playerId) +
          core.holeSkinzByPlayer.get(playerId) +
          core.bonusSkinzByPlayer.get(playerId) +
          endCarryoverByPlayer.get(playerId)
      )
      bonusSkinz.set(
        playerId,
        bonusSkinz.get(playerId) + core.bonusSkinzByPlayer.get(playerId)
      )
      strokes.set(playerId, strokes.get(playerId) + score)
      toParTotals.set(playerId, toParTotals.get(playerId) + getToPar(score, par))
    })

    settlement = calculateSettlement({
      playerIds,
      skinz,
      transfers,
      stakeCents: config.stakeCents,
    })

    const totalsCents = new Map(
      settlement.players.map((player) => [player.playerId, player.totalCents])
    )

    const result = {
      holeNumber: hole.holeNumber,
      par,
      tie: core.tie,
      winningScore: core.winningScore,
      winnerPlayerIds: core.winnerIds,
      potSkinz: core.potSkinz,
      potCents:
        config.gameMode === GAME_MODES.WOLFFN
          ? core.potSkinz * config.stakeCents
          : core.potSkinz * config.stakeCents * opponentCount,
      carryoverBefore,
      carryoverAfter,
      wolffn: core.details,
      oozle: oozle
        ? {
            outcome: oozle.outcome,
            playerId: oozle.playerId,
            putts: oozle.putts,
            unitsAtStake: oozle.unitsAtStake,
            amountPerOpponentCents: oozle.amountPerOpponentCents,
            carryoverUnitsBefore: oozle.carryoverUnitsBefore,
            carryoverUnitsAfter: oozle.carryoverUnitsAfter,
            expired: oozle.expired,
          }
        : null,
      players: playerIds.map((playerId) => {
        const score = hole.scores.get(playerId)
        const holeSkinz = core.holeSkinzByPlayer.get(playerId)
        const bonus = core.bonusSkinzByPlayer.get(playerId)
        const endCarryover = endCarryoverByPlayer.get(playerId)

        return {
          playerId,
          score,
          toPar: getToPar(score, par),
          resultLabel: getResultLabel(score, par),
          holeInOne: score === 1,
          holeSkinz,
          bonusSkinz: bonus,
          endCarryoverSkinz: endCarryover,
          skinzDelta: holeSkinz + bonus + endCarryover,
          skinzTotal: skinz.get(playerId),
          moneyDeltaCents: totalsCents.get(playerId) - previousTotalsCents.get(playerId),
          moneyTotalCents: totalsCents.get(playerId),
        }
      }),
    }

    previousTotalsCents = totalsCents

    return result
  })

  const status = holes.length === config.holeCount ? "completed" : "in_progress"

  return {
    status,
    currentHole: status === "completed" ? config.holeCount : holes.length + 1,
    holesPlayed: holes.length,
    carryoverSkinz,
    oozleCarryoverUnits,
    finalCarryover,
    holes: holeResults,
    players: settlement.players.map((player) => ({
      playerId: player.playerId,
      holesPlayed: holes.length,
      totalStrokes: strokes.get(player.playerId),
      totalToPar: toParTotals.get(player.playerId),
      skinz: player.skinz,
      bonusSkinz: bonusSkinz.get(player.playerId),
      skinzCents: player.skinzCents,
      oozleCents: player.oozleCents,
      totalCents: player.totalCents,
    })),
    settlement: {
      pairs: settlement.pairs,
      payments: settlement.payments,
    },
  }
}
