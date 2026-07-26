import { requireAdmin, setNoStoreHeaders, toPublicUser } from "../../../lib/auth.js"
import { getSql } from "../../../lib/database.js"

const ALLOWED_STATUSES = new Set(["pending", "active", "blocked"])

function getStatusFilter(request) {
  const rawStatus = Array.isArray(request.query?.status)
    ? request.query.status[0]
    : request.query?.status
  const status = String(rawStatus || "").trim().toLowerCase()

  return status || null
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const admin = await requireAdmin(request)

    if (!admin) {
      return response.status(403).json({ error: "Administratorzugriff erforderlich." })
    }

    const status = getStatusFilter(request)

    if (status && !ALLOWED_STATUSES.has(status)) {
      return response.status(400).json({ error: "Ungueltiger Benutzerstatus." })
    }

    const sql = getSql()
    const users = status
      ? await sql`
          SELECT
            u.id,
            u.email,
            u.display_name,
            u.role,
            u.status,
            u.handicap_index,
            u.home_club_id,
            gc.name AS home_club_name,
            u.created_at,
            u.approved_at,
            u.blocked_at,
            u.last_login_at
          FROM users AS u
          LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
          WHERE u.status = ${status}
          ORDER BY u.created_at DESC, u.display_name ASC
        `
      : await sql`
          SELECT
            u.id,
            u.email,
            u.display_name,
            u.role,
            u.status,
            u.handicap_index,
            u.home_club_id,
            gc.name AS home_club_name,
            u.created_at,
            u.approved_at,
            u.blocked_at,
            u.last_login_at
          FROM users AS u
          LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
          ORDER BY
            CASE u.status
              WHEN 'pending' THEN 1
              WHEN 'active' THEN 2
              WHEN 'blocked' THEN 3
              ELSE 4
            END,
            u.created_at DESC,
            u.display_name ASC
        `

    return response.status(200).json({
      users: users.map((user) => ({
        ...toPublicUser(user),
        homeClubName: user.home_club_name || null,
        createdAt: user.created_at,
        approvedAt: user.approved_at,
        blockedAt: user.blocked_at,
        lastLoginAt: user.last_login_at,
      })),
    })
  } catch (error) {
    console.error("Admin user list failed.", error)
    return response.status(500).json({ error: "Benutzer konnten nicht geladen werden." })
  }
}
