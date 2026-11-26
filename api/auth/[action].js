import { setNoStoreHeaders } from "../../lib/auth.js"
import { authActions } from "../../lib/authActions.js"
import { getQueryValue, sendError } from "../../lib/http.js"

/**
 * Eine einzige Vercel-Function für alle Auth-Endpunkte
 * (/api/auth/login, /register, /session, /logout, /verify-email,
 * /resend-verification, /forgot-password, /reset-password).
 */
export default async function handler(request, response) {
  setNoStoreHeaders(response)

  const actionName = getQueryValue(request, "action")
  const action = Object.hasOwn(authActions, actionName) ? authActions[actionName] : null

  if (!action) {
    return sendError(response, 404, "Nicht gefunden.")
  }

  if (request.method !== action.method) {
    response.setHeader("Allow", action.method)
    return sendError(response, 405, "Methode nicht erlaubt.")
  }

  try {
    return await action.handle(request, response)
  } catch (error) {
    console.error(`Auth action "${actionName}" failed.`, error)

    if (!response.headersSent) {
      return sendError(response, 500, action.errorMessage)
    }

    return undefined
  }
}
