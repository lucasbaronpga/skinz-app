import { requireAdmin, setNoStoreHeaders, toPublicUser } from "../../../lib/auth.js"
import { getSql } from "../../../lib/database.js"

const ALLOWED_TARGET_STATUSES = new Set(["active", "blocked"])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body)
    } catch {
      return {}
    }
  }

  return {}
}

function getUserId(request, body) {
  const bodyUserId = body?.userId
  const rawUserId = bodyUserId || (Array.isArray(request.query?.userId)
    ? request.query.userId[0]
    : request.query?.userId)

  return String(rawUserId || "").trim()
}

function normalizeReason(value) {
  const reason = String(value || "").trim()
  return reason ? reason.slice(0, 500) : null
}

function getAuditAction(previousStatus, nextStatus) {
  if (previousStatus === "pending" && nextStatus === "active") return "user.approved"
  if (nextStatus === "blocked") return "user.blocked"
  return "user.reactivated"
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "PATCH") {
    response.setHeader("Allow", "PATCH")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const admin = await requireAdmin(request)

    if (!admin) {
      return response.status(403).json({ error: "Administratorzugriff erforderlich." })
    }


    const body = getRequestBody(request)
    const userId = getUserId(request, body)
    const nextStatus = String(body.status || "").trim().toLowerCase()
    const reason = normalizeReason(body.reason)

    if (!UUID_PATTERN.test(userId)) {
      return response.status(400).json({ error: "Ungueltige Benutzer-ID." })
    }

    if (!ALLOWED_TARGET_STATUSES.has(nextStatus)) {
      return response.status(400).json({
        error: "Der Status muss active oder blocked sein.",
      })
    }

    if (userId === admin.user_id && nextStatus === "blocked") {
      return response.status(400).json({
        error: "Das eigene Administratorkonto kann nicht gesperrt werden.",
      })
    }

    const sql = getSql()
    const targetUsers = await sql`
      SELECT
        id,
        email,
        display_name,
        role,
        status,
        handicap_index,
        home_club_id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    const targetUser = targetUsers[0]

    if (!targetUser) {
      return response.status(404).json({ error: "Benutzerkonto nicht gefunden." })
    }

    if (targetUser.role === "admin" && targetUser.id !== admin.user_id) {
      return response.status(403).json({
        error: "Andere Administratorkonten koennen hier nicht geaendert werden.",
      })
    }

    if (targetUser.status === nextStatus) {
      return response.status(200).json({
        changed: false,
        user: toPublicUser(targetUser),
      })
    }

    const action = getAuditAction(targetUser.status, nextStatus)
    const previousData = JSON.stringify({ status: targetUser.status })
    const newData = JSON.stringify({ status: nextStatus })
    const updatedUsers = await sql.transaction([
      sql`
        UPDATE users
        SET
          status = ${nextStatus},
          approved_at = CASE
            WHEN ${nextStatus} = 'active' THEN COALESCE(approved_at, NOW())
            ELSE approved_at
          END,
          approved_by = CASE
            WHEN ${nextStatus} = 'active' THEN COALESCE(approved_by, ${admin.user_id})
            ELSE approved_by
          END,
          blocked_at = CASE
            WHEN ${nextStatus} = 'blocked' THEN NOW()
            ELSE NULL
          END,
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING
          id,
          email,
          display_name,
          role,
          status,
          handicap_index,
          home_club_id
      `,
      sql`
        INSERT INTO admin_audit_logs (
          admin_user_id,
          action,
          target_type,
          target_id,
          previous_data,
          new_data,
          reason
        )
        VALUES (
          ${admin.user_id},
          ${action},
          'user',
          ${userId},
          ${previousData}::jsonb,
          ${newData}::jsonb,
          ${reason}
        )
      `,
      sql`
        UPDATE user_sessions
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = ${userId}
          AND revoked_at IS NULL
          AND ${nextStatus} = 'blocked'
        RETURNING id
      `,
    ])

    return response.status(200).json({
      changed: true,
      action,
      user: toPublicUser(updatedUsers[0][0]),
    })
  } catch (error) {
    console.error("Admin user status update failed.", error)
    return response.status(500).json({
      error: "Benutzerstatus konnte nicht aktualisiert werden.",
    })
  }
}
