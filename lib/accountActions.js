import { randomBytes, timingSafeEqual } from "node:crypto"
import bcrypt from "bcryptjs"
import { clearSessionCookie, getSession, hashPassword } from "./auth.js"
import { getSql } from "./database.js"
import { getClientIp, getUserAgent, readBody, sendError, sendJson } from "./http.js"
import { runMaintenance } from "./maintenance.js"
import { DELETED_PLAYER_NAME, SubscriptionError, normalizeSubscription } from "./notifications.js"
import { getPushPublicKey, isPushConfigured } from "./push.js"
import { RATE_LIMITS, hashIdentifier, isRateLimited, recordAuthEvent } from "./rateLimit.js"

const DELETED_VISIBILITY = JSON.stringify({
  leaderboardAnonymous: false,
  showStats: false,
  showHandicap: false,
  showHomeClub: false,
})

function isSameSecret(received, expected) {
  const left = Buffer.from(String(received))
  const right = Buffer.from(String(expected))

  return left.length === right.length && timingSafeEqual(left, right)
}

async function requireSession(request, response) {
  const session = await getSession(request)

  if (!session) sendError(response, 401, "Anmeldung erforderlich.")

  return session
}

function pushConfig(request, response) {
  return sendJson(response, 200, { enabled: isPushConfigured(), publicKey: getPushPublicKey() })
}

async function pushSubscribe(request, response) {
  const session = await requireSession(request, response)

  if (!session) return undefined

  let subscription

  try {
    subscription = normalizeSubscription(readBody(request))
  } catch (error) {
    if (error instanceof SubscriptionError) return sendError(response, 400, error.message)

    throw error
  }

  const sql = getSql()

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    VALUES (
      ${session.user_id}, ${subscription.endpoint}, ${subscription.p256dh},
      ${subscription.auth}, ${getUserAgent(request)}
    )
    ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent
  `

  return sendJson(response, 200, { subscribed: true })
}

async function pushUnsubscribe(request, response) {
  const session = await requireSession(request, response)

  if (!session) return undefined

  const endpoint = String(readBody(request).endpoint ?? "").trim()

  if (endpoint) {
    const sql = getSql()

    await sql`
      DELETE FROM push_subscriptions
      WHERE endpoint = ${endpoint}
        AND user_id = ${session.user_id}
    `
  }

  return sendJson(response, 200, { subscribed: false })
}

/**
 * Konto löschen: nur mit Passwort und ohne laufendes oder pausiertes Match.
 * Offene Flights und Einladungen fallen weg, abgeschlossene Matches bleiben
 * erhalten und zeigen den Spieler als "Gelöschter Spieler".
 */
async function deleteAccount(request, response) {
  const session = await requireSession(request, response)

  if (!session) return undefined

  const password = String(readBody(request).password ?? "")

  if (!password) return sendError(response, 400, "Bitte gib dein Passwort ein.")

  if (session.role === "admin") {
    return sendError(response, 403, "Admin-Konten können nicht in der App gelöscht werden.")
  }

  const rateLimitContext = { ipAddress: getClientIp(request), identifierHash: hashIdentifier(session.email) }

  if (await isRateLimited(RATE_LIMITS.login, rateLimitContext)) {
    return sendError(response, 429, "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.")
  }

  const sql = getSql()
  const userId = String(session.user_id)
  const users = await sql`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`

  if (!users[0] || !(await bcrypt.compare(password, users[0].password_hash))) {
    await recordAuthEvent(RATE_LIMITS.login, rateLimitContext)
    return sendError(response, 401, "Das Passwort ist falsch.")
  }

  const busy = await sql`
    SELECT 1
    FROM match_players AS mp
    JOIN matches AS m ON m.id = mp.match_id
    WHERE mp.user_id = ${userId}
      AND m.status IN ('active', 'paused')
    LIMIT 1
  `

  if (busy.length > 0) {
    return sendError(
      response,
      409,
      "Du bist noch in einem laufenden oder pausierten Match. Spiel es zu Ende oder lass es abbrechen, dann kannst du dein Konto löschen."
    )
  }

  const name = String(session.display_name)
  const nameInJson = JSON.stringify(name).slice(1, -1)
  const unusablePassword = await hashPassword(randomBytes(32).toString("base64url"))

  await sql.transaction([
    sql`
      DELETE FROM match_players
      WHERE match_id IN (SELECT id FROM matches WHERE created_by_user_id = ${userId} AND status = 'open')
    `,
    sql`DELETE FROM matches WHERE created_by_user_id = ${userId} AND status = 'open'`,
    sql`
      DELETE FROM match_players
      WHERE user_id = ${userId}
        AND match_id IN (SELECT id FROM matches WHERE status = 'open')
    `,
    sql`
      UPDATE match_player_holes
      SET result_data = REPLACE(result_data::text, ${nameInJson}, ${DELETED_PLAYER_NAME})::jsonb
      WHERE match_hole_id IN (
        SELECT mh.id
        FROM match_holes AS mh
        JOIN match_players AS mp ON mp.match_id = mh.match_id
        WHERE mp.user_id = ${userId}
      )
    `,
    sql`
      UPDATE match_holes
      SET
        winner_label = REPLACE(winner_label, ${name}, ${DELETED_PLAYER_NAME}),
        game_data = REPLACE(game_data::text, ${nameInJson}, ${DELETED_PLAYER_NAME})::jsonb
      WHERE match_id IN (SELECT match_id FROM match_players WHERE user_id = ${userId})
    `,
    sql`
      UPDATE match_players
      SET
        display_name_snapshot = ${DELETED_PLAYER_NAME},
        handicap_index_snapshot = NULL,
        home_club_id_snapshot = NULL,
        home_club_name_snapshot = NULL,
        updated_at = NOW()
      WHERE user_id = ${userId}
    `,
    sql`DELETE FROM push_subscriptions WHERE user_id = ${userId}`,
    sql`DELETE FROM auth_tokens WHERE user_id = ${userId}`,
    sql`UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ${userId}`,
    sql`
      UPDATE users
      SET
        status = 'deleted',
        deleted_at = NOW(),
        email = ${`deleted-${userId}@deleted.invalid`},
        display_name = ${DELETED_PLAYER_NAME},
        short_name = NULL,
        password_hash = ${unusablePassword},
        handicap_index = NULL,
        home_club_id = NULL,
        paypal_link = NULL,
        avatar_color = NULL,
        profile_visibility = ${DELETED_VISIBILITY}::jsonb,
        email_verified_at = NULL,
        updated_at = NOW()
      WHERE id = ${userId}
    `,
  ])

  clearSessionCookie(response, request)

  return sendJson(response, 200, { deleted: true })
}

/** Vercel Cron ruft dies täglich mit "Authorization: Bearer CRON_SECRET" auf. */
async function cleanup(request, response) {
  const secret = String(process.env.CRON_SECRET || "")

  if (!secret) return sendError(response, 503, "Cron ist nicht konfiguriert.")

  if (!isSameSecret(request.headers?.authorization ?? "", `Bearer ${secret}`)) {
    return sendError(response, 401, "Nicht berechtigt.")
  }

  return sendJson(response, 200, { cleaned: await runMaintenance(getSql()) })
}

export const accountActions = Object.freeze({
  "push-config": { method: "GET", handle: pushConfig, errorMessage: "Push ist derzeit nicht verfügbar." },
  "push-subscribe": {
    method: "POST",
    handle: pushSubscribe,
    errorMessage: "Benachrichtigungen konnten nicht aktiviert werden.",
  },
  "push-unsubscribe": {
    method: "POST",
    handle: pushUnsubscribe,
    errorMessage: "Benachrichtigungen konnten nicht deaktiviert werden.",
  },
  "delete-account": {
    method: "POST",
    handle: deleteAccount,
    errorMessage: "Das Konto konnte nicht gelöscht werden.",
  },
  cleanup: { method: "GET", handle: cleanup, errorMessage: "Aufräumen fehlgeschlagen." },
})
