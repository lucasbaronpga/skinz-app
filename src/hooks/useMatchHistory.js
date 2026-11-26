import { useCallback, useEffect, useState } from "react"
import { apiRequest, getErrorMessage } from "../utils/api.js"

/** Lädt alle Matches des Nutzers von /api/matches. */
export default function useMatchHistory() {
  const [state, setState] = useState({ loading: true, matches: [], error: "" })

  const load = useCallback((signal) => {
    return apiRequest("/api/matches", { signal })
      .then((data) => setState({ loading: false, matches: Array.isArray(data.matches) ? data.matches : [], error: "" }))
      .catch((error) => {
        if (error?.name === "AbortError") return

        setState((current) => ({
          ...current,
          loading: false,
          error: getErrorMessage(error, "Die Runden konnten nicht geladen werden."),
        }))
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal)

    return () => controller.abort()
  }, [load])

  return { ...state, reload: () => load() }
}
