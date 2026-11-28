import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { flattenGolfClubs } from "../utils/courses.js"

/**
 * Lädt die spielbaren Golfplätze, sobald ein Nutzer angemeldet ist.
 * Der bisherige GameContext lädt sie nur einmal beim App-Start und damit
 * oft vor der Anmeldung ("Eine aktive Anmeldung ist erforderlich").
 */
export default function useGolfCourses() {
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState({ loading: true, courses: [], error: "" })

  useEffect(() => {
    if (!isAuthenticated) return undefined

    const controller = new AbortController()

    apiRequest("/api/golf-courses", { signal: controller.signal })
      .then((data) => setState({ loading: false, courses: flattenGolfClubs(data), error: "" }))
      .catch((error) => {
        if (error?.name === "AbortError") return

        setState({
          loading: false,
          courses: [],
          error: getErrorMessage(error, "Die Plätze konnten nicht geladen werden."),
        })
      })

    return () => controller.abort()
  }, [isAuthenticated])

  return state
}
