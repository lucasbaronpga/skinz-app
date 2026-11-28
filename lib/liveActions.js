import { requireActiveUser } from "./auth.js"
import { getSql } from "./database.js"
import { EngineError } from "./engine/errors.js"
import { getQueryValue, readBody, sendJson } from "./http.js"
import {
  applyHoleInput,
  buildPersistence,
  calculateLiveResult,
  isPauseExpired,
  readStoredInputs,
  toLiveState,
} from "./liveMatch.js"
import { buildCompletionNotifications, getCourseName } from "./notifications.js"
import { notifySafely } from "./push.js"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const DIVISION_BY_ZERO = "22012"

const MESSAGES = Object.freeze({
  notFound: "Match nicht gefunden.",
  notScorer: "Nur der Scorer kann Scores eintragen.",
  notAllowed: "Nur der Scorer oder ein Admin kann das Match steuern.",
  notActive: "Das Match läuft gerade nicht.",
  notPaused: "Das Match ist nicht pausiert.",
  pauseExpired: "Das Match war länger als drei Tage pausiert und kann nicht fortgesetzt werden.",
  legacy: "Dieses Match wurde mit der vorherigen App-Version gestartet und kann hier nicht weitergespielt werden.",
  changed: "Das Match wurde gerade geändert. Die Ansicht wird aktualisiert.",
})

export class LiveError extends Error {
  constructor(status, message, code = null) {
    super(message)
    this.name = "LiveError"
    this.status = status
    this.code = code
  }
}

function requireUuid(value) {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (!UUID_PATTERN.test(normalized)) throw new LiveError(400, "Die Anfrage ist ungültig.")

  return normalized
}

async function loadMatch(sql, matchId) {
  const matches = await sql`
    SELECT
      id, match_code, status, created_by_user_id, game_mode, stake_amount, hole_count,
      oozle_enabled, oozle_value, oozle_carryover_enabled, course_snapshot,
      state_version, paused_at
    FROM matches
    WHERE id = ${matchId}
      AND status IN ('active', 'paused', 'completed', 'cancelled')
    LIMIT 1
  `

  if (!matches[0]) return null

  const [players, holeRows] = await Promise.all([
    sql`
      SELECT mp.id, mp.user_id, mp.display_order, mp.display_name_snapshot, u.short_name
      FROM match_players AS mp
      JOIN users AS u ON u.id = mp.user_id
      WHERE mp.match_id = ${matchId}
      ORDER BY mp.display_order
    `,
    sql`
      SELECT hole_number, game_data
      FROM match_holes
      WHERE match_id = ${matchId}
        AND status = 'completed'
      ORDER BY hole_number
    `,
  ])

  const { inputs, legacy } = readStoredInputs(holeRows)

  return { match: matches[0], players, inputs, legacy }
}

function isParticipant(live, userId) {
  return live.players.some((player) => String(player.user_id) === userId)
}

async function loadVisibleMatch(sql, matchId, context) {
  const live = await loadMatch(sql, matchId)

  if (!live || (!isParticipant(live, context.userId) && !context.isAdmin)) {
    throw new LiveError(404, MESSAGES.notFound)
  }

  return live
}

function getPlayerIds(live) {
  return live.players.map((player) => String(player.user_id))
}

function buildState(live, context) {
  const result = live.legacy
    ? null
    : calculateLiveResult({ match: live.match, playerIds: getPlayerIds(live), inputs: live.inputs })

  return toLiveState({ ...live, result, currentUserId: context.userId, isAdmin: context.isAdmin })
}

async function respondWithMatch(sql, response, matchId, context) {
  const live = await loadMatch(sql, matchId)

  if (!live) throw new LiveError(404, MESSAGES.notFound)

  return sendJson(response, 200, { match: buildState(live, context) })
}

async function current(request, response, { sql, ...context }) {
  const rows = await sql`
    SELECT m.id
    FROM matches AS m
    JOIN match_players AS mp ON mp.match_id = m.id
    WHERE mp.user_id = ${context.userId}
      AND m.status IN ('active', 'paused')
    ORDER BY CASE WHEN m.status = 'active' THEN 0 ELSE 1 END, m.updated_at DESC
    LIMIT 1
  `

  if (!rows[0]) return sendJson(response, 200, { match: null })

  return respondWithMatch(sql, response, rows[0].id, context)
}

async function get(request, response, { sql, ...context }) {
  const matchId = requireUuid(getQueryValue(request, "id"))

  await loadVisibleMatch(sql, matchId, context)

  return respondWithMatch(sql, response, matchId, context)
}

function requireVersion(value) {
  const version = Number(value)

  if (!Number.isInteger(version) || version < 1) {
    throw new LiveError(400, "Die Anfrage ist ungültig.")
  }

  return version
}

function isVersionConflict(error) {
  return error?.code === DIVISION_BY_ZERO || String(error?.message || "").includes("division by zero")
}

async function score(request, response, { sql, ...context }) {
  const body = readBody(request)
  const matchId = requireUuid(body.matchId)
  const expectedVersion = requireVersion(body.expectedVersion)
  const live = await loadVisibleMatch(sql, matchId, context)

  if (String(live.match.created_by_user_id) !== context.userId) {
    throw new LiveError(403, MESSAGES.notScorer)
  }

  if (live.legacy) throw new LiveError(409, MESSAGES.legacy, "LEGACY_MATCH")
  if (live.match.status !== "active") throw new LiveError(409, MESSAGES.notActive)

  if (Number(live.match.state_version) !== expectedVersion) {
    throw new LiveError(409, MESSAGES.changed, "VERSION_CONFLICT")
  }

  const inputs = applyHoleInput(
    live.inputs,
    Number(body.holeNumber),
    body.hole,
    Number(live.match.hole_count)
  )
  const result = calculateLiveResult({ match: live.match, playerIds: getPlayerIds(live), inputs })
  const rows = buildPersistence({ players: live.players, result, inputs })

  try {
    await sql.transaction([
      // Optimistische Sperre: schlägt mit "division by zero" fehl, wenn sich die Version geändert hat.
      sql`
        WITH updated AS (
          UPDATE matches
          SET state_version = state_version + 1, updated_at = NOW()
          WHERE id = ${matchId}
            AND state_version = ${expectedVersion}
            AND status = 'active'
          RETURNING id
        )
        SELECT 1 / (SELECT COUNT(*)::int FROM updated) AS ok
      `,
      sql`DELETE FROM match_settlements WHERE match_id = ${matchId}`,
      sql`DELETE FROM match_holes WHERE match_id = ${matchId}`,
      sql`
        INSERT INTO match_holes (
          id, match_id, hole_number, par, status, winner_label, winning_score, has_tie,
          skinz_awarded, carryover_before, carryover_after, pot_amount, special_scoring_label,
          game_data, completed_at
        )
        SELECT
          x.id, ${matchId}, x.hole_number, x.par, 'completed', x.winner_label, x.winning_score,
          x.has_tie, x.skinz_awarded, x.carryover_before, x.carryover_after, x.pot_amount,
          x.special_scoring_label, x.game_data, NOW()
        FROM jsonb_to_recordset(${JSON.stringify(rows.holes)}::jsonb) AS x(
          id uuid, hole_number smallint, par smallint, winner_label text, winning_score smallint,
          has_tie boolean, skinz_awarded integer, carryover_before integer, carryover_after integer,
          pot_amount numeric, special_scoring_label text, game_data jsonb
        )
      `,
      sql`
        INSERT INTO match_player_holes (
          match_hole_id, match_player_id, score, to_par, skinz_delta, winnings_delta,
          oozle_winnings_delta, result_label, result_data
        )
        SELECT
          x.match_hole_id, x.match_player_id, x.score, x.to_par, x.skinz_delta, x.winnings_delta,
          x.oozle_winnings_delta, x.result_label, x.result_data
        FROM jsonb_to_recordset(${JSON.stringify(rows.playerHoles)}::jsonb) AS x(
          match_hole_id uuid, match_player_id uuid, score smallint, to_par smallint,
          skinz_delta integer, winnings_delta numeric, oozle_winnings_delta numeric,
          result_label text, result_data jsonb
        )
      `,
      sql`
        UPDATE match_players AS mp
        SET
          total_strokes = x.total_strokes,
          total_to_par = x.total_to_par,
          skinz_won = x.skinz_won,
          skinz_winnings = x.skinz_winnings,
          oozle_winnings = x.oozle_winnings,
          total_winnings = x.total_winnings,
          updated_at = NOW()
        FROM jsonb_to_recordset(${JSON.stringify(rows.playerTotals)}::jsonb) AS x(
          id uuid, total_strokes integer, total_to_par integer, skinz_won integer,
          skinz_winnings numeric, oozle_winnings numeric, total_winnings numeric
        )
        WHERE mp.id = x.id
          AND mp.match_id = ${matchId}
      `,
      sql`
        INSERT INTO match_settlements (match_id, payer_match_player_id, recipient_match_player_id, amount)
        SELECT ${matchId}, x.payer, x.recipient, x.amount
        FROM jsonb_to_recordset(${JSON.stringify(rows.settlements)}::jsonb) AS x(
          payer uuid, recipient uuid, amount numeric
        )
      `,
      sql`
        UPDATE matches
        SET
          current_hole = ${rows.match.currentHole},
          skinz_carryover = ${rows.match.carryover},
          oozle_carryover = ${rows.match.oozleCarryover},
          status = ${rows.match.status},
          completed_at = CASE WHEN ${rows.completed}::boolean THEN NOW() ELSE NULL END,
          updated_at = NOW()
        WHERE id = ${matchId}
      `,
    ])
  } catch (error) {
    if (isVersionConflict(error)) throw new LiveError(409, MESSAGES.changed, "VERSION_CONFLICT")

    throw error
  }

  if (rows.completed) {
    await notifySafely(
      sql,
      buildCompletionNotifications({
        matchId,
        matchCode: live.match.match_code,
        courseName: getCourseName(live.match.course_snapshot),
        players: live.players.map((player) => ({
          userId: String(player.user_id),
          name: player.display_name_snapshot,
        })),
        payments: result.settlement.payments,
      })
    )
  }

  return respondWithMatch(sql, response, matchId, context)
}

function requireControl(live, context) {
  if (String(live.match.created_by_user_id) !== context.userId && !context.isAdmin) {
    throw new LiveError(403, MESSAGES.notAllowed)
  }
}

async function pause(request, response, { sql, ...context }) {
  const matchId = requireUuid(readBody(request).matchId)
  const live = await loadVisibleMatch(sql, matchId, context)

  requireControl(live, context)

  const rows = await sql`
    UPDATE matches
    SET status = 'paused', paused_at = NOW(), state_version = state_version + 1, updated_at = NOW()
    WHERE id = ${matchId}
      AND status = 'active'
    RETURNING id
  `

  if (rows.length === 0) throw new LiveError(409, MESSAGES.notActive)

  return respondWithMatch(sql, response, matchId, context)
}

async function resume(request, response, { sql, ...context }) {
  const matchId = requireUuid(readBody(request).matchId)
  const live = await loadVisibleMatch(sql, matchId, context)

  requireControl(live, context)

  if (live.match.status !== "paused") throw new LiveError(409, MESSAGES.notPaused)
  if (isPauseExpired(live.match.paused_at)) throw new LiveError(410, MESSAGES.pauseExpired)

  const rows = await sql`
    UPDATE matches
    SET status = 'active', paused_at = NULL, state_version = state_version + 1, updated_at = NOW()
    WHERE id = ${matchId}
      AND status = 'paused'
    RETURNING id
  `

  if (rows.length === 0) throw new LiveError(409, MESSAGES.notPaused)

  return respondWithMatch(sql, response, matchId, context)
}

async function cancel(request, response, { sql, ...context }) {
  const matchId = requireUuid(readBody(request).matchId)
  const live = await loadVisibleMatch(sql, matchId, context)

  requireControl(live, context)

  const rows = await sql`
    UPDATE matches
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      paused_at = NULL,
      state_version = state_version + 1,
      updated_at = NOW()
    WHERE id = ${matchId}
      AND status IN ('active', 'paused')
    RETURNING id
  `

  if (rows.length === 0) throw new LiveError(409, MESSAGES.notActive)

  return sendJson(response, 200, { cancelled: true })
}

export const liveActions = Object.freeze({
  current: { method: "GET", handle: current },
  get: { method: "GET", handle: get },
  score: { method: "POST", handle: score },
  pause: { method: "POST", handle: pause },
  resume: { method: "POST", handle: resume },
  cancel: { method: "POST", handle: cancel },
})

/** Führt eine Aktion aus und wandelt fachliche Fehler in HTTP-Antworten um. */
export async function runLiveAction(action, request, response) {
  const session = await requireActiveUser(request)

  if (!session) {
    return sendJson(response, 401, { error: "Anmeldung erforderlich." })
  }

  try {
    return await action.handle(request, response, {
      sql: getSql(),
      userId: String(session.user_id),
      isAdmin: session.role === "admin",
    })
  } catch (error) {
    if (error instanceof LiveError) {
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
