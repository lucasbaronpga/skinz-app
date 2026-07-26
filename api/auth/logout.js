import {
  clearSessionCookie,
  revokeSession,
  setNoStoreHeaders,
} from "../../lib/auth.js"

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    await revokeSession(request)
    clearSessionCookie(response, request)

    return response.status(200).json({ authenticated: false })
  } catch (error) {
    console.error("Logout failed.", error)
    clearSessionCookie(response, request)
    return response.status(500).json({ error: "Abmeldung derzeit nicht moeglich." })
  }
}
