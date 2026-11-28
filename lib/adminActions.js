import { getSession } from "./auth.js"
import { getSql } from "./database.js"
import { getClientIp, readBody, sendError, sendJson } from "./http.js"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const MAXIMUM_REASON_LENGTH = 200

/** Erlaubte Statuswechsel der Benutzerverwaltung. */
export const STATUS_CHANGES = Object.freeze({
  approve: { from: ["pending"], to: "active", audit: "admin.user_approved" },
  block: { from: ["pending", "active"], to: "blocked", audit: "admin.user_blocked" },
  reactivate: { from: ["blocked"], to: "active", audit: "admin.user_reactivated" },
})

const MESSAGES = Object.freeze({
  unauthenticated: "Anmeldung erforderlich.",
  forbidden: "Keine Administratorberechtigung.",
  notFound: "Benutzerkonto nicht gefunden.",
  adminTarget: "Administratorkonten können hier nicht geändert werden.",
  changed: "Der Status hat sich inzwischen geändert. Bitte die Liste aktualisieren.",
})

export class AdminInputError extends Error {
  constructor(message) {
    super(message)
    this.name = "AdminInputError"
  }
}

/** Prüft die Eingabe für einen Statuswechsel. */
export function parseStatusChange(body) {
  const userId = String(body?.userId ?? "").trim().toLowerCase()
  const action = String(body?.action ?? "")
  const reason =
    String(body?.reason ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAXIMUM_REASON_LENGTH) || null

  if (!UUID_PATTERN.test(userId)) throw new AdminInputError("Der Benutzer ist ungültig.")
  if (!Object.hasOwn(STATUS_CHANGES, action)) throw new AdminInputError("Die Aktion ist ungültig.")

  return { userId, action, reason }
}

function toIsoString(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function requireAdminSession(request, response) {
  const session = await getSession(request)

  if (!session) {
    sendError(response, 401, MESSAGES.unauthenticated)
    return null
  }

  if (session.role !== "admin") {
    sendError(response, 403, MESSAGES.forbidden)
    return null
  }

  return session
}

async function listUsers(request, response) {
  const session = await requireAdminSession(request, response)

  if (!session) return undefined

  const sql = getSql()
  const rows = await sql`
    SELECT
      u.id, u.email, u.display_name, u.short_name, u.role, u.status,
      u.email_verified_at, u.created_at, u.last_login_at,
      (
        SELECT COUNT(*)::int
        FROM match_players AS mp
        JOIN matches AS m ON m.id = mp.match_id
        WHERE mp.user_id = u.id AND m.status = 'completed'
      ) AS completed_matches
    FROM users AS u
    WHERE u.status <> 'deleted'
    ORDER BY
      CASE u.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
      u.created_at DESC
  `

  return sendJson(response, 200, {
    users: rows.map((row) => ({
      id: String(row.id),
      email: row.email,
      displayName: row.display_name,
      shortName: row.short_name || null,
      role: row.role,
      status: row.status,
      emailVerified: Boolean(row.email_verified_at),
      createdAt: toIsoString(row.created_at),
      lastLoginAt: toIsoString(row.last_login_at),
      completedMatches: Number(row.completed_matches) || 0,
      isMe: String(row.id) === String(session.user_id),
    })),
  })
}

async function changeStatus(request, response) {
  const session = await requireAdminSession(request, response)

  if (!session) return undefined

  let change

  try {
    change = parseStatusChange(readBody(request))
  } catch (error) {
    if (error instanceof AdminInputError) return sendError(response, 400, error.message)

    throw error
  }

  const rule = STATUS_CHANGES[change.action]
  const sql = getSql()
  const targets = await sql`SELECT id, role, status FROM users WHERE id = ${change.userId} LIMIT 1`
  const target = targets[0]

  if (!target || target.status === "deleted") return sendError(response, 404, MESSAGES.notFound)
  if (target.role === "admin") return sendError(response, 403, MESSAGES.adminTarget)

  if (!rule.from.includes(target.status)) {
    return sendJson(response, 409, { error: MESSAGES.changed, code: "STATUS_CHANGED" })
  }

  // Eine einzige Anweisung: Statuswechsel, Sitzungen beenden (bei Sperre) und Protokoll gemeinsam.
  const adminId = String(session.user_id)
  const rows = await sql`
    WITH updated AS (
      UPDATE users
      SET
        status = ${rule.to}::text,
        approved_at = CASE WHEN ${rule.to}::text = 'active' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
        approved_by = CASE WHEN ${rule.to}::text = 'active' THEN COALESCE(approved_by, ${adminId}::uuid) ELSE approved_by END,
        email_verified_at = CASE WHEN ${rule.to}::text = 'active' THEN COALESCE(email_verified_at, NOW()) ELSE email_verified_at END,
        blocked_at = CASE WHEN ${rule.to}::text = 'blocked' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = ${change.userId}::uuid
        AND role <> 'admin'
        AND status = ANY(${rule.from}::text[])
      RETURNING id, status, email_verified_at
    ),
    revoked AS (
      UPDATE user_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE user_id IN (SELECT id FROM updated)
        AND revoked_at IS NULL
        AND ${rule.to}::text = 'blocked'
      RETURNING id
    ),
    logged AS (
      INSERT INTO admin_audit_logs (
        admin_user_id, action, target_type, target_id, previous_data, new_data, reason, ip_address
      )
      SELECT
        ${adminId}::uuid, ${rule.audit}::text, 'user', updated.id::text,
        ${JSON.stringify({ status: target.status })}::jsonb,
        ${JSON.stringify({ status: rule.to })}::jsonb,
        ${change.reason}::text, ${getClientIp(request)}::inet
      FROM updated
      RETURNING id
    )
    SELECT id, status, email_verified_at FROM updated
  `

  if (!rows[0]) return sendJson(response, 409, { error: MESSAGES.changed, code: "STATUS_CHANGED" })

  return sendJson(response, 200, {
    user: {
      id: String(rows[0].id),
      status: rows[0].status,
      emailVerified: Boolean(rows[0].email_verified_at),
    },
  })
}

export const adminActions = Object.freeze({
  "admin-users": {
    method: "GET",
    handle: listUsers,
    errorMessage: "Benutzer konnten nicht geladen werden.",
  },
  "admin-user-status": {
    method: "POST",
    handle: changeStatus,
    errorMessage: "Der Benutzerstatus konnte nicht geändert werden.",
  },
})
