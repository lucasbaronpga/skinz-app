import { setNoStoreHeaders } from "../../lib/auth.js"
import { getQueryValue, sendError } from "../../lib/http.js"
import { runStatsAction, statsActions } from "../../lib/statsActions.js"

/**
 * Eine Vercel-Function für Leaderboard, Statistik und Profil:
 * GET  /api/stats/leaderboard?season=&sort= | me?season= | player?id=&season= | clubs
 * POST /api/stats/profile
 */
export default async function handler(request, response) {
  setNoStoreHeaders(response)

  const actionName = getQueryValue(request, "action")
  const action = Object.hasOwn(statsActions, actionName) ? statsActions[actionName] : null

  if (!action) return sendError(response, 404, "Nicht gefunden.")

  if (request.method !== action.method) {
    response.setHeader("Allow", action.method)
    return sendError(response, 405, "Methode nicht erlaubt.")
  }

  try {
    return await runStatsAction(action, request, response)
  } catch (error) {
    console.error(`Stats action "${actionName}" failed.`, error)

    if (!response.headersSent) return sendError(response, 500, "Die Anfrage konnte nicht verarbeitet werden.")

    return undefined
  }
}
