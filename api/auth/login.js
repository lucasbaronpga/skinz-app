import {
  createSession,
  setNoStoreHeaders,
  setSessionCookie,
  toPublicUser,
  verifyLogin,
} from "../../lib/auth.js"

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

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const { email, password } = getRequestBody(request)
    const user = await verifyLogin(email, password)

    if (!user) {
      return response.status(401).json({ error: "E-Mail oder Passwort ist ungueltig." })
    }

    if (user.status === "pending") {
      return response.status(403).json({ error: "Das Benutzerkonto wartet auf Freigabe." })
    }

    if (user.status === "blocked") {
      return response.status(403).json({ error: "Das Benutzerkonto ist gesperrt." })
    }

    if (user.status !== "active") {
      return response.status(403).json({ error: "Das Benutzerkonto ist nicht aktiv." })
    }

    const sessionToken = await createSession(user.id, request)
    setSessionCookie(response, sessionToken, request)

    return response.status(200).json({
      authenticated: true,
      user: toPublicUser(user),
    })
  } catch (error) {
    console.error("Login failed.", error)
    return response.status(500).json({ error: "Anmeldung derzeit nicht moeglich." })
  }
}
