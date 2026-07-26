import {
  requireActiveUser,
  setNoStoreHeaders,
  toPublicUser,
} from "../../lib/auth.js"
import { getSql } from "../../lib/database.js"

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const currentUser = await requireActiveUser(request)

    if (!currentUser) {
      return response.status(401).json({
        error: "Anmeldung erforderlich.",
      })
    }

    const sql = getSql()

    const users = await sql`
      SELECT
        u.id,
        u.display_name,
        u.role,
        u.status,
        u.handicap_index,
        u.home_club_id,
        gc.name AS home_club_name
      FROM users AS u
      LEFT JOIN golf_clubs AS gc
        ON gc.id = u.home_club_id
      WHERE u.status = 'active'
      ORDER BY
        LOWER(BTRIM(u.display_name)) ASC,
        u.id ASC
    `

    const currentUserId = String(currentUser.user_id || currentUser.id || "")

    return response.status(200).json({
      players: users.map((user) => ({
        ...toPublicUser(user),
        homeClubName: user.home_club_name || null,
        isCurrentUser: String(user.id) === currentUserId,
      })),
    })
  } catch (error) {
    console.error("Player list failed.", error)

    return response.status(500).json({
      error: "Spieler konnten nicht geladen werden.",
    })
  }
}
