import { useCallback, useEffect, useState } from "react"
import { apiRequest, getErrorMessage } from "../utils/api.js"

/** Lädt eine GET-Ressource. Bei leerem Pfad wird nichts geladen. */
export default function useApi(path) {
  const [state, setState] = useState({ path: null, data: null, error: "" })

  const load = useCallback(
    (signal) =>
      apiRequest(path, { signal })
        .then((data) => setState({ path, data, error: "" }))
        .catch((error) => {
          if (error?.name !== "AbortError") setState({ path, data: null, error: getErrorMessage(error) })
        }),
    [path]
  )

  useEffect(() => {
    if (!path) return undefined

    const controller = new AbortController()

    load(controller.signal)

    return () => controller.abort()
  }, [load, path])

  const isCurrent = state.path === path

  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : "",
    loading: Boolean(path) && !isCurrent,
    reload: () => load(),
    setData: (data) => setState({ path, data, error: "" }),
  }
}
