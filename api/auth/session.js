import { getSession, setNoStoreHeaders, toPublicUser } from "../../lib/auth.js"

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const session = await getSession(request)

    if (!session) {
      return response.status(401).json({ authenticated: false })
    }

    return response.status(200).json({
      authenticated: true,
      user: toPublicUser(session),
    })
  } catch (error) {
    console.error("Session check failed.", error)
    return response.status(500).json({ error: "Sitzung konnte nicht geprueft werden." })
  }
}
