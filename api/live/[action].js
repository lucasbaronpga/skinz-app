import { setNoStoreHeaders } from "../../lib/auth.js"
import { getQueryValue, sendError } from "../../lib/http.js"
import { liveActions, runLiveAction } from "../../lib/liveActions.js"

/**
 * Eine Vercel-Function für das Live Scoring:
 * GET  /api/live/current | get?id=
 * POST /api/live/score | pause | resume | cancel
 */
export default async function handler(request, response) {
  setNoStoreHeaders(response)

  const actionName = getQueryValue(request, "action")
  const action = Object.hasOwn(liveActions, actionName) ? liveActions[actionName] : null

  if (!action) {
    return sendError(response, 404, "Nicht gefunden.")
  }

  if (request.method !== action.method) {
    response.setHeader("Allow", action.method)
    return sendError(response, 405, "Methode nicht erlaubt.")
  }

  try {
    return await runLiveAction(action, request, response)
  } catch (error) {
    console.error(`Live action "${actionName}" failed.`, error)

    if (!response.headersSent) {
      return sendError(response, 500, "Die Anfrage konnte nicht verarbeitet werden.")
    }

    return undefined
  }
}
