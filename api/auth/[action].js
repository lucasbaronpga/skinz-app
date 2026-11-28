import { accountActions } from "../../lib/accountActions.js"
import { adminActions } from "../../lib/adminActions.js"
import { setNoStoreHeaders } from "../../lib/auth.js"
import { authActions } from "../../lib/authActions.js"
import { getQueryValue, sendError } from "../../lib/http.js"

const actions = Object.freeze({ ...authActions, ...accountActions, ...adminActions })

/**
 * Eine Vercel-Function für Konto, Anmeldung, Push, Benutzerverwaltung und das tägliche Aufräumen:
 * /api/auth/login, /register, /session, /logout, /verify-email, /resend-verification,
 * /forgot-password, /reset-password, /push-config, /push-subscribe, /push-unsubscribe,
 * /delete-account, /cleanup (Vercel Cron), /admin-users und /admin-user-status (nur Admins).
 */
export default async function handler(request, response) {
  setNoStoreHeaders(response)

  const actionName = getQueryValue(request, "action")
  const action = Object.hasOwn(actions, actionName) ? actions[actionName] : null

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
