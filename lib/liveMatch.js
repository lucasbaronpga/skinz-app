import { randomUUID } from "node:crypto"
import { calculateMatch, getResultLabel } from "./engine/index.js"
import { GAME_MODES } from "./engine/constants.js"
import { EngineError } from "./engine/errors.js"

export const PAUSE_LIFETIME_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

function eurosToCents(value) {
  return value === null || value === undefined ? null : Math.round(Number(value) * 100)
}

function centsToEuros(cents) {
  return Math.round(Number(cents) || 0) / 100
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function toIsoString(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Konfiguration der Spiel-Engine aus einer Zeile der Tabelle matches. */
export function buildMatchConfig(match) {
  const snapshot = isPlainObject(match.course_snapshot) ? match.course_snapshot : {}

  return {
    gameMode: match.game_mode,
    stakeCents: eurosToCents(match.stake_amount),
    holeCount: Number(match.hole_count),
    pars: Array.isArray(snapshot.pars) ? snapshot.pars.map(Number) : [],
    oozle: match.oozle_enabled
      ? {
          enabled: true,
          valueCents: eurosToCents(match.oozle_value),
          carryoverEnabled: match.oozle_carryover_enabled !== false,
        }
      : { enabled: false },
  }
}

/**
 * Liest die gespeicherten Roheingaben je Loch. Matches aus der alten App haben
 * keine Roheingaben und gelten als "legacy".
 */
export function readStoredInputs(holeRows) {
  const sorted = [...holeRows].sort((first, second) => first.hole_number - second.hole_number)
  const legacy = sorted.some(
    (row, index) => Number(row.hole_number) !== index + 1 || !isPlainObject(row.game_data?.input)
  )

  return {
    legacy,
    inputs: legacy ? [] : sorted.map((row) => row.game_data.input),
  }
}

/** Übernimmt nur bekannte Felder, die Prüfung übernimmt die Spiel-Engine. */
export function sanitizeHoleInput(raw) {
  if (!isPlainObject(raw) || !isPlainObject(raw.scores)) {
    throw new EngineError("INVALID_SCORES", "Die Scores fehlen.")
  }

  const input = { scores: { ...raw.scores } }

  if (isPlainObject(raw.wolffn)) {
    input.wolffn = { decision: raw.wolffn.decision }

    if (raw.wolffn.askedPlayerId) input.wolffn.askedPlayerId = raw.wolffn.askedPlayerId
  }

  if (isPlainObject(raw.oozle)) {
    input.oozle =
      raw.oozle.noGreen === true
        ? { noGreen: true }
        : { playerId: raw.oozle.playerId, putts: raw.oozle.putts }
  }

  return input
}

/** Ersetzt ein gespieltes Loch (Korrektur) oder hängt das nächste Loch an. */
export function applyHoleInput(inputs, holeNumber, rawInput, holeCount) {
  if (
    !Number.isInteger(holeNumber) ||
    holeNumber < 1 ||
    holeNumber > inputs.length + 1 ||
    holeNumber > holeCount
  ) {
    throw new EngineError("INVALID_HOLE", "Dieses Loch kann gerade nicht gespeichert werden.")
  }

  const nextInputs = [...inputs]

  nextInputs[holeNumber - 1] = sanitizeHoleInput(rawInput)

  return nextInputs
}

export function calculateLiveResult({ match, playerIds, inputs }) {
  return calculateMatch({ config: buildMatchConfig(match), players: playerIds, holes: inputs })
}

function getScoreMultiplierLabel(multiplier) {
  if (multiplier >= 4) return "Eagle x4"
  if (multiplier === 2) return "Birdie x2"

  return null
}

function getOozleDeltas(oozle, playerIds) {
  const deltas = new Map(playerIds.map((playerId) => [playerId, 0]))

  if (!oozle || !oozle.playerId || oozle.outcome === "carryover") return deltas

  const direction = oozle.outcome === "oozle" ? 1 : -1
  const amount = oozle.amountPerOpponentCents

  playerIds.forEach((playerId) => {
    deltas.set(
      playerId,
      playerId === oozle.playerId ? direction * amount * (playerIds.length - 1) : -direction * amount
    )
  })

  return deltas
}

/**
 * Wandelt das Engine-Ergebnis in Tabellenzeilen um. Zusätzlich zu den Roheingaben
 * werden Anzeigefelder im bisherigen Format gespeichert, damit Archiv,
 * Match-Details und Leaderboard bis zu ihrem Umbau unverändert funktionieren.
 */
export function buildPersistence({ players, result, inputs }) {
  const playerIds = players.map((player) => String(player.user_id))
  const nameById = new Map(players.map((player) => [String(player.user_id), player.display_name_snapshot]))
  const matchPlayerIdByUserId = new Map(players.map((player) => [String(player.user_id), String(player.id)]))
  const names = (ids) => ids.map((id) => nameById.get(id))
  const holes = []
  const playerHoles = []

  result.holes.forEach((hole, index) => {
    const holeId = randomUUID()
    const winnerNames = names(hole.winnerPlayerIds)
    const oozle = hole.oozle
      ? {
          enabled: true,
          outcome: hole.oozle.outcome,
          playerName: hole.oozle.playerId ? nameById.get(hole.oozle.playerId) : null,
          putts: hole.oozle.putts,
          unitsAtStake: hole.oozle.unitsAtStake,
          amountPerOpponent: centsToEuros(hole.oozle.amountPerOpponentCents),
          expired: hole.oozle.expired,
        }
      : null
    const wolffn = hole.wolffn
      ? {
          gameMode: GAME_MODES.WOLFFN,
          gameModeLabel: "Wolffn",
          wolffnFormat: hole.wolffn.format,
          wolffnPlayer: hole.wolffn.wolfPlayerId ? nameById.get(hole.wolffn.wolfPlayerId) : null,
          wolffnTeamA: names(hole.wolffn.teamAPlayerIds),
          wolffnTeamB: names(hole.wolffn.teamBPlayerIds),
          wolffnMultiplier: hole.wolffn.wolffnMultiplier,
          scoreMultiplierLabel: getScoreMultiplierLabel(hole.wolffn.scoreMultiplier),
          currentHoleValue: hole.potSkinz,
        }
      : {}
    const oozleDeltas = getOozleDeltas(hole.oozle, playerIds)

    holes.push({
      id: holeId,
      hole_number: hole.holeNumber,
      par: hole.par,
      winner_label: hole.tie ? "Carryover" : winnerNames.join(" + "),
      winning_score: hole.winningScore,
      has_tie: hole.tie,
      skinz_awarded: hole.tie ? 0 : hole.potSkinz,
      carryover_before: hole.carryoverBefore,
      carryover_after: hole.carryoverAfter,
      pot_amount: centsToEuros(hole.potCents),
      special_scoring_label: null,
      game_data: {
        input: inputs[index],
        hole: hole.holeNumber,
        par: hole.par,
        winner: hole.tie ? "Carryover" : winnerNames.join(" + "),
        winningScore: hole.winningScore,
        winningResult: getResultLabel(hole.winningScore, hole.par),
        hasTie: hole.tie,
        skins: hole.tie ? hole.carryoverAfter : hole.potSkinz,
        pot: centsToEuros(hole.potCents),
        oozle,
        ...wolffn,
      },
    })

    hole.players.forEach((holePlayer) => {
      playerHoles.push({
        match_hole_id: holeId,
        match_player_id: matchPlayerIdByUserId.get(holePlayer.playerId),
        score: holePlayer.score,
        to_par: holePlayer.toPar,
        skinz_delta: holePlayer.skinzDelta,
        winnings_delta: centsToEuros(holePlayer.moneyDeltaCents),
        oozle_winnings_delta: centsToEuros(oozleDeltas.get(holePlayer.playerId)),
        result_label: holePlayer.resultLabel,
        result_data: {
          hole: hole.holeNumber,
          par: hole.par,
          score: holePlayer.score,
          toPar: holePlayer.toPar,
          skinDelta: holePlayer.skinzDelta,
          totalSkins: holePlayer.skinzDelta,
          bonusSkins: holePlayer.bonusSkinz,
          result: { label: holePlayer.resultLabel },
          oozle,
          ...wolffn,
        },
      })
    })
  })

  const completed = result.status === "completed"

  return {
    completed,
    holes,
    playerHoles,
    playerTotals: result.players.map((player) => ({
      id: matchPlayerIdByUserId.get(player.playerId),
      total_strokes: player.totalStrokes,
      total_to_par: player.totalToPar,
      skinz_won: player.skinz,
      skinz_winnings: centsToEuros(player.skinzCents),
      oozle_winnings: centsToEuros(player.oozleCents),
      total_winnings: centsToEuros(player.totalCents),
    })),
    settlements: completed
      ? result.settlement.payments.map((payment) => ({
          payer: matchPlayerIdByUserId.get(payment.fromPlayerId),
          recipient: matchPlayerIdByUserId.get(payment.toPlayerId),
          amount: centsToEuros(payment.amountCents),
        }))
      : [],
    match: {
      currentHole: result.currentHole,
      carryover: result.carryoverSkinz,
      oozleCarryover: result.oozleCarryoverUnits,
      status: completed ? "completed" : "active",
    },
  }
}

export function getPauseExpiry(pausedAt) {
  return pausedAt ? new Date(new Date(pausedAt).getTime() + PAUSE_LIFETIME_DAYS * DAY_MS) : null
}

export function isPauseExpired(pausedAt, now = new Date()) {
  const expiry = getPauseExpiry(pausedAt)

  return Boolean(expiry) && expiry.getTime() <= now.getTime()
}

function getFirstTeeLengths(snapshot, holeCount) {
  const tee = Array.isArray(snapshot.tees) ? snapshot.tees.find((entry) => Array.isArray(entry?.lengths)) : null

  return Array.from({ length: holeCount }, (_, index) => {
    const length = Number(tee?.lengths?.[index])

    return Number.isFinite(length) && length > 0 ? length : null
  })
}

/** Antwortformat für das Live Scoring (alle Beträge in Cent). */
export function toLiveState({ match, players, inputs, legacy, result, currentUserId, isAdmin, now = new Date() }) {
  const snapshot = isPlainObject(match.course_snapshot) ? match.course_snapshot : {}
  const holeCount = Number(match.hole_count)
  const meId = String(currentUserId)
  const scorerId = String(match.created_by_user_id)
  const isScorer = scorerId === meId
  const pars = Array.isArray(snapshot.pars) ? snapshot.pars.map(Number) : []
  const status = match.status

  return {
    id: match.id,
    matchCode: match.match_code,
    status,
    version: Number(match.state_version),
    legacy,
    isScorer,
    canControl: (isScorer || Boolean(isAdmin)) && (status === "active" || status === "paused"),
    canScore: isScorer && status === "active" && !legacy,
    pausedAt: toIsoString(match.paused_at),
    pauseExpiresAt: toIsoString(getPauseExpiry(match.paused_at)),
    isPauseExpired: status === "paused" && isPauseExpired(match.paused_at, now),
    config: {
      gameMode: match.game_mode,
      stakeCents: eurosToCents(match.stake_amount),
      oozle: {
        enabled: Boolean(match.oozle_enabled),
        valueCents: match.oozle_enabled ? eurosToCents(match.oozle_value) : null,
      },
    },
    course: {
      name: snapshot.name ?? null,
      clubName: snapshot.clubName ?? null,
      location: snapshot.location || null,
      holeCount,
      par: pars.reduce((total, par) => total + par, 0),
      pars,
      handicapIndexes: Array.from({ length: holeCount }, (_, index) => {
        const value = Number(snapshot.handicapIndexes?.[index])

        return Number.isFinite(value) && value > 0 ? value : null
      }),
      lengths: getFirstTeeLengths(snapshot, holeCount),
    },
    players: [...players]
      .sort((first, second) => first.display_order - second.display_order)
      .map((player) => ({
        userId: String(player.user_id),
        name: player.display_name_snapshot,
        shortName: player.short_name || null,
        isMe: String(player.user_id) === meId,
        isScorer: String(player.user_id) === scorerId,
      })),
    inputs,
    result,
  }
}
