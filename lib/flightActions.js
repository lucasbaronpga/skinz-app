import { randomUUID } from "node:crypto"
import { requireActiveUser } from "./auth.js"
import { loadCourseSnapshot } from "./courseSnapshot.js"
import { getSql } from "./database.js"
import { MAXIMUM_PLAYERS } from "./engine/constants.js"
import { EngineError } from "./engine/errors.js"
import {
  INVITATION_STATUS,
  buildFlightConfig,
  countOccupiedSeats,
  createInviteToken,
  formatMatchCode,
  isFlightExpired,
  isWellFormedInviteToken,
  planFlightStart,
  toPublicFlight,
} from "./flights.js"
import { getQueryValue, readBody, sendJson } from "./http.js"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const MESSAGES = Object.freeze({
  notFound: "Flight nicht gefunden.",
  notScorer: "Nur der Scorer kann diese Aktion ausführen.",
  notOpen: "Der Flight wurde bereits gestartet oder beendet.",
  expired: "Der Flight ist abgelaufen. Bitte lege einen neuen an.",
  inviteExpired: "Die Einladung ist abgelaufen.",
  inviteInvalid: "Der Einladungslink ist ungültig.",
  full: `Der Flight ist voll (maximal ${MAXIMUM_PLAYERS} Spieler).`,
  changed: "Der Flight hat sich gerade geändert. Bitte erneut versuchen.",
})

export class FlightError extends Error {
  constructor(status, message, code = null) {
    super(message)
    this.name = "FlightError"
    this.status = status
    this.code = code
  }
}

function toUuid(value) {
  const normalized = String(value ?? "").trim().toLowerCase()

  return UUID_PATTERN.test(normalized) ? normalized : null
}

function requireUuid(value, message = "Die Anfrage ist ungültig.") {
  const uuid = toUuid(value)

  if (!uuid) throw new FlightError(400, message)

  return uuid
}

async function loadFlight(sql, flightId) {
  const matches = await sql`
    SELECT
      id, match_code, status, created_by_user_id, golf_course_id, game_mode,
      stake_amount, hole_count, oozle_enabled, oozle_value, course_snapshot,
      invite_token, created_at
    FROM matches
    WHERE id = ${flightId}
    LIMIT 1
  `

  if (!matches[0]) return null

  const players = await sql`
    SELECT
      mp.user_id,
      mp.display_order,
      mp.display_name_snapshot,
      mp.handicap_index_snapshot,
      mp.invitation_status,
      u.short_name
    FROM match_players AS mp
    JOIN users AS u ON u.id = mp.user_id
    WHERE mp.match_id = ${flightId}
    ORDER BY mp.display_order
  `

  return { match: matches[0], players }
}

function findPlayer(flight, userId) {
  return flight.players.find((player) => String(player.user_id) === String(userId)) || null
}

function isScorer(flight, userId) {
  return String(flight.match.created_by_user_id) === String(userId)
}

/** Teilnehmer (auch nach Absage) und der Scorer dürfen den Flight sehen. */
async function loadVisibleFlight(sql, flightId, userId) {
  const flight = await loadFlight(sql, flightId)

  if (!flight || (!isScorer(flight, userId) && !findPlayer(flight, userId))) {
    throw new FlightError(404, MESSAGES.notFound)
  }

  return flight
}

async function loadEditableFlight(sql, flightId, userId) {
  const flight = await loadVisibleFlight(sql, flightId, userId)

  if (!isScorer(flight, userId)) throw new FlightError(403, MESSAGES.notScorer)
  if (flight.match.status !== "open") throw new FlightError(409, MESSAGES.notOpen)
  if (isFlightExpired(flight.match.created_at)) throw new FlightError(410, MESSAGES.expired)

  return flight
}

async function respondWithFlight(sql, response, flightId, userId, status = 200) {
  const flight = await loadFlight(sql, flightId)

  if (!flight) throw new FlightError(404, MESSAGES.notFound)

  return sendJson(response, status, {
    flight: toPublicFlight({ ...flight, currentUserId: userId }),
  })
}

async function list(request, response, { sql, userId }) {
  const rows = await sql`
    SELECT DISTINCT m.id, m.created_at
    FROM matches AS m
    JOIN match_players AS mp ON mp.match_id = m.id
    WHERE m.status = 'open'
      AND mp.user_id = ${userId}
      AND mp.invitation_status <> 'declined'
    ORDER BY m.created_at DESC
  `
  const flights = []

  for (const row of rows) {
    const flight = await loadFlight(sql, row.id)

    if (!flight) continue

    const expired = isFlightExpired(flight.match.created_at)

    if (expired && !isScorer(flight, userId)) continue

    flights.push(toPublicFlight({ ...flight, currentUserId: userId }))
  }

  return sendJson(response, 200, { flights })
}

async function get(request, response, { sql, userId }) {
  const flightId = requireUuid(getQueryValue(request, "id"))

  await loadVisibleFlight(sql, flightId, userId)

  return respondWithFlight(sql, response, flightId, userId)
}

async function findOpenFlightByToken(sql, token) {
  if (!isWellFormedInviteToken(token)) throw new FlightError(400, MESSAGES.inviteInvalid)

  const matches = await sql`
    SELECT id, created_at
    FROM matches
    WHERE invite_token = ${token}
      AND status = 'open'
    LIMIT 1
  `
  const match = matches[0]

  if (!match) throw new FlightError(404, MESSAGES.inviteInvalid)
  if (isFlightExpired(match.created_at)) throw new FlightError(410, MESSAGES.inviteExpired)

  return match.id
}

async function preview(request, response, { sql, userId }) {
  const flightId = await findOpenFlightByToken(sql, String(getQueryValue(request, "token") ?? ""))
  const flight = await loadFlight(sql, flightId)
  const publicFlight = toPublicFlight({ ...flight, currentUserId: userId })

  return sendJson(response, 200, { flight: { ...publicFlight, inviteToken: null } })
}

async function create(request, response, { sql, userId }) {
  const body = readBody(request)
  const golfCourseId = requireUuid(body.golfCourseId, "Bitte einen Golfplatz wählen.")

  const ownOpenFlights = await sql`
    SELECT id, created_at
    FROM matches
    WHERE created_by_user_id = ${userId}
      AND status = 'open'
  `
  const activeOwnFlight = ownOpenFlights.find((flight) => !isFlightExpired(flight.created_at))

  if (activeOwnFlight) {
    throw new FlightError(409, "Du hast bereits einen offenen Flight.", "OPEN_FLIGHT_EXISTS")
  }

  const courseSnapshot = await loadCourseSnapshot(sql, golfCourseId)

  if (!courseSnapshot) throw new FlightError(404, "Der Golfplatz ist nicht spielbar.")

  const { database } = buildFlightConfig(
    { gameMode: body.gameMode, stakeCents: body.stakeCents, oozle: body.oozle },
    courseSnapshot.pars
  )

  const creators = await sql`
    SELECT u.id, u.display_name, u.handicap_index, u.home_club_id, gc.name AS home_club_name
    FROM users AS u
    LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
    WHERE u.id = ${userId}
      AND u.status = 'active'
    LIMIT 1
  `
  const creator = creators[0]

  if (!creator) throw new FlightError(403, "Das Benutzerkonto ist nicht aktiv.")

  const flightId = randomUUID()

  await sql.transaction([
    // Abgelaufene eigene Flights werden beim Anlegen eines neuen aufgeräumt.
    sql`
      DELETE FROM matches
      WHERE created_by_user_id = ${userId}
        AND status = 'open'
        AND created_at <= NOW() - INTERVAL '24 hours'
    `,
    sql`
      INSERT INTO matches (
        id, match_code, created_by_user_id, golf_course_id, status, game_mode,
        stake_amount, hole_count, current_hole, skinz_carryover, oozle_carryover,
        special_scoring_enabled, oozle_enabled, oozle_value, oozle_foozle_enabled,
        oozle_carryover_enabled, course_snapshot, invite_token
      )
      VALUES (
        ${flightId}, ${`OPEN-${flightId}`}, ${userId}, ${golfCourseId}, 'open',
        ${database.gameMode}, ${database.stakeAmount}, ${database.holeCount}, 1, 0, 0,
        ${database.specialScoringEnabled}, ${database.oozleEnabled}, ${database.oozleValue},
        TRUE, TRUE, ${JSON.stringify(courseSnapshot)}::jsonb, ${createInviteToken()}
      )
    `,
    sql`
      INSERT INTO match_players (
        match_id, user_id, display_order, display_name_snapshot, handicap_index_snapshot,
        home_club_id_snapshot, home_club_name_snapshot, invitation_status, invited_at, responded_at
      )
      VALUES (
        ${flightId}, ${userId}, 1, ${creator.display_name}, ${creator.handicap_index},
        ${creator.home_club_id}, ${creator.home_club_name}, 'accepted', NOW(), NOW()
      )
    `,
  ])

  return respondWithFlight(sql, response, flightId, userId, 201)
}

async function invite(request, response, { sql, userId }) {
  const body = readBody(request)
  const flightId = requireUuid(body.flightId)
  const userIds = Array.isArray(body.userIds) ? body.userIds.map(toUuid) : []

  if (userIds.length === 0 || userIds.some((id) => !id) || new Set(userIds).size !== userIds.length) {
    throw new FlightError(400, "Bitte gültige Spieler auswählen.")
  }

  const flight = await loadEditableFlight(sql, flightId, userId)
  const existing = new Map(flight.players.map((player) => [String(player.user_id), player]))
  const newIds = userIds.filter(
    (id) =>
      existing.get(id)?.invitation_status !== "invited" &&
      existing.get(id)?.invitation_status !== "accepted"
  )

  if (newIds.length === 0) return respondWithFlight(sql, response, flightId, userId)

  if (countOccupiedSeats(flight.players) + newIds.length > MAXIMUM_PLAYERS) {
    throw new FlightError(409, MESSAGES.full)
  }

  const users = await sql`
    SELECT u.id, u.display_name, u.handicap_index, u.home_club_id, gc.name AS home_club_name
    FROM users AS u
    LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
    WHERE u.id = ANY(${newIds}::uuid[])
      AND u.status = 'active'
  `

  if (users.length !== newIds.length) {
    throw new FlightError(409, "Mindestens ein Spieler ist nicht aktiv.")
  }

  const usersById = new Map(users.map((user) => [String(user.id), user]))
  let nextOrder = Math.max(0, ...flight.players.map((player) => Number(player.display_order))) + 1

  await sql.transaction(
    newIds.map((id) => {
      if (existing.has(id)) {
        return sql`
          UPDATE match_players
          SET invitation_status = 'invited', invited_at = NOW(), responded_at = NULL, updated_at = NOW()
          WHERE match_id = ${flightId}
            AND user_id = ${id}
        `
      }

      const user = usersById.get(id)
      const displayOrder = nextOrder

      nextOrder += 1

      return sql`
        INSERT INTO match_players (
          match_id, user_id, display_order, display_name_snapshot, handicap_index_snapshot,
          home_club_id_snapshot, home_club_name_snapshot, invitation_status, invited_at
        )
        VALUES (
          ${flightId}, ${id}, ${displayOrder}, ${user.display_name}, ${user.handicap_index},
          ${user.home_club_id}, ${user.home_club_name}, 'invited', NOW()
        )
      `
    })
  )

  return respondWithFlight(sql, response, flightId, userId)
}

async function remove(request, response, { sql, userId }) {
  const body = readBody(request)
  const flightId = requireUuid(body.flightId)
  const targetUserId = requireUuid(body.userId)
  const flight = await loadEditableFlight(sql, flightId, userId)

  if (isScorer(flight, targetUserId)) {
    throw new FlightError(400, "Der Scorer kann nicht entfernt werden.")
  }

  await sql`
    DELETE FROM match_players
    WHERE match_id = ${flightId}
      AND user_id = ${targetUserId}
  `

  return respondWithFlight(sql, response, flightId, userId)
}

async function respond(request, response, { sql, userId }) {
  const body = readBody(request)
  const flightId = requireUuid(body.flightId)
  const accept = body.accept === true
  const flight = await loadVisibleFlight(sql, flightId, userId)
  const player = findPlayer(flight, userId)

  if (!player || isScorer(flight, userId)) {
    throw new FlightError(400, "Als Scorer kannst du nicht zu- oder absagen.")
  }

  if (flight.match.status !== "open") throw new FlightError(409, MESSAGES.notOpen)

  if (accept) {
    if (isFlightExpired(flight.match.created_at)) throw new FlightError(410, MESSAGES.inviteExpired)

    if (
      player.invitation_status === INVITATION_STATUS.DECLINED &&
      countOccupiedSeats(flight.players) >= MAXIMUM_PLAYERS
    ) {
      throw new FlightError(409, MESSAGES.full)
    }
  }

  await sql`
    UPDATE match_players
    SET invitation_status = ${accept ? "accepted" : "declined"},
        responded_at = NOW(),
        updated_at = NOW()
    WHERE match_id = ${flightId}
      AND user_id = ${userId}
  `

  return respondWithFlight(sql, response, flightId, userId)
}

async function join(request, response, { sql, userId }) {
  const flightId = await findOpenFlightByToken(sql, String(readBody(request).token ?? ""))
  const flight = await loadFlight(sql, flightId)
  const player = findPlayer(flight, userId)

  if (player?.invitation_status === INVITATION_STATUS.ACCEPTED) {
    return respondWithFlight(sql, response, flightId, userId)
  }

  if (player) {
    if (
      player.invitation_status === INVITATION_STATUS.DECLINED &&
      countOccupiedSeats(flight.players) >= MAXIMUM_PLAYERS
    ) {
      throw new FlightError(409, MESSAGES.full)
    }

    await sql`
      UPDATE match_players
      SET invitation_status = 'accepted', responded_at = NOW(), updated_at = NOW()
      WHERE match_id = ${flightId}
        AND user_id = ${userId}
    `

    return respondWithFlight(sql, response, flightId, userId)
  }

  // Einfügen nur, solange der Flight offen ist und noch ein Platz frei ist.
  const inserted = await sql`
    INSERT INTO match_players (
      match_id, user_id, display_order, display_name_snapshot, handicap_index_snapshot,
      home_club_id_snapshot, home_club_name_snapshot, invitation_status, invited_at, responded_at
    )
    SELECT
      m.id,
      u.id,
      (SELECT COALESCE(MAX(display_order), 0) + 1 FROM match_players WHERE match_id = m.id),
      u.display_name,
      u.handicap_index,
      u.home_club_id,
      gc.name,
      'accepted',
      NOW(),
      NOW()
    FROM matches AS m
    JOIN users AS u ON u.id = ${userId} AND u.status = 'active'
    LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
    WHERE m.id = ${flightId}
      AND m.status = 'open'
      AND (
        SELECT COUNT(*)
        FROM match_players
        WHERE match_id = m.id
          AND invitation_status <> 'declined'
      ) < ${MAXIMUM_PLAYERS}
    RETURNING id
  `

  if (inserted.length === 0) throw new FlightError(409, MESSAGES.full)

  return respondWithFlight(sql, response, flightId, userId)
}

async function start(request, response, { sql, userId }) {
  const flightId = requireUuid(readBody(request).flightId)
  const flight = await loadEditableFlight(sql, flightId, userId)
  const { startingUserIds } = planFlightStart({
    gameMode: flight.match.game_mode,
    players: flight.players,
  })

  // Pro Spieler ist nur ein laufendes oder pausiertes Match erlaubt.
  const busyPlayers = await sql`
    SELECT DISTINCT mp.display_name_snapshot
    FROM match_players AS mp
    JOIN matches AS m ON m.id = mp.match_id
    WHERE m.status IN ('active', 'paused')
      AND mp.user_id = ANY(${startingUserIds}::uuid[])
  `

  if (busyPlayers.length > 0) {
    const names = busyPlayers.map((player) => player.display_name_snapshot).join(", ")

    throw new FlightError(409, `Noch in einem laufenden Match: ${names}.`, "PLAYER_BUSY")
  }

  const sequence = await sql`SELECT nextval('match_code_seq') AS value`
  const matchCode = formatMatchCode(sequence[0].value)

  await sql.transaction([
    sql`
      UPDATE matches
      SET status = 'active',
          match_code = ${matchCode},
          invite_token = NULL,
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = ${flightId}
        AND created_by_user_id = ${userId}
        AND status = 'open'
        AND (
          SELECT COUNT(*)
          FROM match_players
          WHERE match_id = ${flightId}
            AND invitation_status = 'accepted'
        ) = ${startingUserIds.length}
    `,
    sql`
      DELETE FROM match_players
      WHERE match_id = ${flightId}
        AND invitation_status <> 'accepted'
        AND EXISTS (
          SELECT 1 FROM matches WHERE id = ${flightId} AND match_code = ${matchCode}
        )
    `,
    // Abschlagreihenfolge lückenlos neu nummerieren (zweistufig wegen Unique-Index).
    sql`
      UPDATE match_players
      SET display_order = display_order + 100
      WHERE match_id = ${flightId}
    `,
    sql`
      UPDATE match_players AS mp
      SET display_order = ranked.position
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY display_order) AS position
        FROM match_players
        WHERE match_id = ${flightId}
      ) AS ranked
      WHERE mp.id = ranked.id
    `,
  ])

  const started = await loadFlight(sql, flightId)

  if (!started || started.match.status !== "active") {
    throw new FlightError(409, MESSAGES.changed)
  }

  return sendJson(response, 200, {
    flight: toPublicFlight({ ...started, currentUserId: userId }),
  })
}

async function discard(request, response, { sql, userId }) {
  const flightId = requireUuid(readBody(request).flightId)
  const flight = await loadVisibleFlight(sql, flightId, userId)

  if (!isScorer(flight, userId)) throw new FlightError(403, MESSAGES.notScorer)
  if (flight.match.status !== "open") throw new FlightError(409, MESSAGES.notOpen)

  await sql`
    DELETE FROM matches
    WHERE id = ${flightId}
      AND created_by_user_id = ${userId}
      AND status = 'open'
  `

  return sendJson(response, 200, { discarded: true })
}

export const flightActions = Object.freeze({
  list: { method: "GET", handle: list },
  get: { method: "GET", handle: get },
  preview: { method: "GET", handle: preview },
  create: { method: "POST", handle: create },
  invite: { method: "POST", handle: invite },
  remove: { method: "POST", handle: remove },
  respond: { method: "POST", handle: respond },
  join: { method: "POST", handle: join },
  start: { method: "POST", handle: start },
  discard: { method: "POST", handle: discard },
})

/** Führt eine Aktion aus und wandelt fachliche Fehler in HTTP-Antworten um. */
export async function runFlightAction(action, request, response) {
  const session = await requireActiveUser(request)

  if (!session) {
    return sendJson(response, 401, { error: "Anmeldung erforderlich." })
  }

  try {
    return await action.handle(request, response, {
      sql: getSql(),
      userId: String(session.user_id),
    })
  } catch (error) {
    if (error instanceof FlightError) {
      return sendJson(
        response,
        error.status,
        error.code ? { error: error.message, code: error.code } : { error: error.message }
      )
    }

    if (error instanceof EngineError) {
      return sendJson(response, 400, { error: error.message, code: error.code })
    }

    throw error
  }
}
