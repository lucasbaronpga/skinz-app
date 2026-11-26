import { setNoStoreHeaders } from "../../lib/auth.js"
import { flightActions, runFlightAction } from "../../lib/flightActions.js"
import { getQueryValue, sendError } from "../../lib/http.js"

/**
 * Eine Vercel-Function für alle Flight-Endpunkte:
 * GET  /api/flights/list | get?id= | preview?token=
 * POST /api/flights/create | invite | remove | respond | join | start | discard
 */
export default async function handler(request, response) {
  setNoStoreHeaders(response)

  const actionName = getQueryValue(request, "action")
  const action = Object.hasOwn(flightActions, actionName) ? flightActions[actionName] : null

  if (!action) {
    return sendError(response, 404, "Nicht gefunden.")
  }

  if (request.method !== action.method) {
    response.setHeader("Allow", action.method)
    return sendError(response, 405, "Methode nicht erlaubt.")
  }

  try {
    return await runFlightAction(action, request, response)
  } catch (error) {
    console.error(`Flight action "${actionName}" failed.`, error)

    if (!response.headersSent) {
      return sendError(response, 500, "Die Anfrage konnte nicht verarbeitet werden.")
    }

    return undefined
  }
}
