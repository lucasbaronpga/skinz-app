import { randomBytes } from "node:crypto"
import { GAME_MODES, MAXIMUM_PLAYERS } from "./engine/constants.js"
import { EngineError } from "./engine/errors.js"
import { normalizeConfig, normalizePlayerIds } from "./engine/validation.js"

export const FLIGHT_LIFETIME_HOURS = 24

export const INVITATION_STATUS = Object.freeze({
  INVITED: "invited",
  ACCEPTED: "accepted",
  DECLINED: "declined",
})

// 24 zufällige Bytes als base64url ergeben genau 32 Zeichen.
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/

export function createInviteToken() {
  return randomBytes(24).toString("base64url")
}

export function isWellFormedInviteToken(value) {
  return typeof value === "string" && INVITE_TOKEN_PATTERN.test(value)
}

export function getFlightExpiry(createdAt) {
  return new Date(new Date(createdAt).getTime() + FLIGHT_LIFETIME_HOURS * 60 * 60 * 1000)
}

export function isFlightExpired(createdAt, now = new Date()) {
  return getFlightExpiry(createdAt).getTime() <= now.getTime()
}

export function formatMatchCode(sequenceValue) {
  return `SKZ-${String(sequenceValue).padStart(4, "0")}`
}

function centsToEuros(cents) {
  return cents / 100
}

function eurosToCents(value) {
  return value === null || value === undefined ? null : Math.round(Number(value) * 100)
}

/**
 * Prüft die Einstellungen mit der Spiel-Engine (Block 1) und liefert die Werte
 * für die Datenbank. Ungültige Eingaben werfen einen EngineError.
 */
export function buildFlightConfig({ gameMode, stakeCents, oozle }, coursePars) {
  const config = normalizeConfig({
    gameMode,
    stakeCents,
    holeCount: Array.isArray(coursePars) ? coursePars.length : 0,
    pars: coursePars,
    oozle: oozle?.enabled
      ? { enabled: true, valueCents: oozle.valueCents, carryoverEnabled: true }
      : { enabled: false },
  })

  return {
    config,
    database: {
      gameMode: config.gameMode,
      holeCount: config.holeCount,
      stakeAmount: centsToEuros(config.stakeCents),
      specialScoringEnabled: config.gameMode === GAME_MODES.PROFESSIONAL,
      oozleEnabled: config.oozle.enabled,
      oozleValue: config.oozle.enabled ? centsToEuros(config.oozle.valueCents) : null,
    },
  }
}

/** Plätze zählen für eingeladene und zugesagte Spieler, nicht für Absagen. */
export function countOccupiedSeats(players) {
  return players.filter((player) => player.invitation_status !== INVITATION_STATUS.DECLINED).length
}

export function getFreeSeats(players) {
  return Math.max(MAXIMUM_PLAYERS - countOccupiedSeats(players), 0)
}

/**
 * Beim Start bleiben nur Spieler mit Zusage im Match. Liefert die IDs in
 * Abschlagreihenfolge und wirft einen EngineError, wenn zu wenige zugesagt haben.
 */
export function planFlightStart({ gameMode, players }) {
  const ordered = [...players].sort((first, second) => first.display_order - second.display_order)
  const startingUserIds = ordered
    .filter((player) => player.invitation_status === INVITATION_STATUS.ACCEPTED)
    .map((player) => String(player.user_id))
  const removedUserIds = ordered
    .filter((player) => player.invitation_status !== INVITATION_STATUS.ACCEPTED)
    .map((player) => String(player.user_id))

  try {
    normalizePlayerIds(startingUserIds, gameMode)
  } catch (error) {
    if (error instanceof EngineError && error.code === "INVALID_PLAYER_COUNT") {
      throw new EngineError(
        error.code,
        gameMode === GAME_MODES.WOLFFN
          ? "Wolffn braucht genau vier Zusagen."
          : "Für den Start braucht es zwei bis vier Zusagen."
      )
    }

    throw error
  }

  return { startingUserIds, removedUserIds }
}

function toIsoString(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Antwortformat eines Flights. Den Einladungs-Token sieht nur der Scorer. */
export function toPublicFlight({ match, players, currentUserId, now = new Date() }) {
  const scorerId = String(match.created_by_user_id)
  const meId = String(currentUserId)
  const me = players.find((player) => String(player.user_id) === meId)
  const isScorer = scorerId === meId
  const isOpen = match.status === "open"
  const snapshot = match.course_snapshot && typeof match.course_snapshot === "object" ? match.course_snapshot : {}

  return {
    id: match.id,
    status: match.status,
    matchCode: isOpen ? null : match.match_code,
    isScorer,
    myStatus: me?.invitation_status ?? null,
    createdAt: toIsoString(match.created_at),
    expiresAt: isOpen ? getFlightExpiry(match.created_at).toISOString() : null,
    isExpired: isOpen && isFlightExpired(match.created_at, now),
    inviteToken: isScorer && isOpen ? match.invite_token : null,
    config: {
      gameMode: match.game_mode,
      stakeCents: eurosToCents(match.stake_amount),
      oozle: {
        enabled: Boolean(match.oozle_enabled),
        valueCents: match.oozle_enabled ? eurosToCents(match.oozle_value) : null,
      },
    },
    course: {
      id: match.golf_course_id,
      name: snapshot.name ?? null,
      clubName: snapshot.clubName ?? null,
      location: snapshot.location || null,
      holeCount: Number(match.hole_count),
      par: snapshot.par ?? null,
    },
    players: [...players]
      .sort((first, second) => first.display_order - second.display_order)
      .map((player) => ({
        userId: String(player.user_id),
        name: player.display_name_snapshot,
        shortName: player.short_name || null,
        handicapIndex:
          player.handicap_index_snapshot === null || player.handicap_index_snapshot === undefined
            ? null
            : Number(player.handicap_index_snapshot),
        status: player.invitation_status,
        isScorer: String(player.user_id) === scorerId,
        isMe: String(player.user_id) === meId,
      })),
    freeSeats: getFreeSeats(players),
  }
}
