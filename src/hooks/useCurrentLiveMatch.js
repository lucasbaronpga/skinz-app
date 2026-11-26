import { useEffect, useState } from "react"
import { apiRequest } from "../utils/api.js"

const POLL_INTERVAL_MS = 20000

/** Lädt das laufende oder pausierte Match des Nutzers und hält es aktuell. */
export default function useCurrentLiveMatch() {
  const [state, setState] = useState({ loading: true, match: null })

  useEffect(() => {
    let isCancelled = false

    function load() {
      apiRequest("/api/live/current")
        .then((data) => {
          if (!isCancelled) setState({ loading: false, match: data.match ?? null })
        })
        .catch((error) => {
          if (isCancelled) return

          console.error("Current match failed.", error)
          setState((current) => ({ ...current, loading: false }))
        })
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") load()
    }

    load()

    const timer = window.setInterval(handleVisibility, POLL_INTERVAL_MS)

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      isCancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  return state
}
