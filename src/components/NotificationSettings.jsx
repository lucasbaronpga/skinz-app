import { useEffect, useState } from "react"
import useApi from "../hooks/useApi"
import { Card } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getErrorMessage } from "../utils/api.js"
import { disablePush, enablePush, getPushState, isPushSupported, needsHomeScreenInstall } from "../utils/push.js"

function Switch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40",
        checked ? "bg-fairway" : "bg-fill"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-6"
        )}
      />
    </button>
  )
}

/** Push-Benachrichtigungen für dieses Gerät ein- und ausschalten. */
export default function NotificationSettings() {
  const { data: config } = useApi("/api/auth/push-config")
  const [state, setState] = useState({ loading: true, supported: isPushSupported(), permission: "default", subscribed: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let isCancelled = false

    getPushState().then((next) => {
      if (!isCancelled) setState({ loading: false, ...next })
    })

    return () => {
      isCancelled = true
    }
  }, [])

  async function handleChange(enabled) {
    setError("")
    setBusy(true)

    try {
      if (enabled) await enablePush(config.publicKey)
      else await disablePush()

      setState({ loading: false, ...(await getPushState()) })
    } catch (changeError) {
      setError(getErrorMessage(changeError, "Die Einstellung konnte nicht gespeichert werden."))
      setState({ loading: false, ...(await getPushState()) })
    } finally {
      setBusy(false)
    }
  }

  let hint = "Einladungen, Matchstart und dein Ergebnis nach dem Match."

  if (needsHomeScreenInstall()) {
    hint = "Auf dem iPhone: Skinz in Safari über Teilen → „Zum Home-Bildschirm“ installieren und dort einschalten."
  } else if (!state.supported) {
    hint = "Dieser Browser unterstützt keine Push-Nachrichten."
  } else if (config && !config.enabled) {
    hint = "Push-Nachrichten sind auf dem Server noch nicht eingerichtet."
  } else if (state.permission === "denied") {
    hint = "Benachrichtigungen sind in den Browser-Einstellungen blockiert."
  }

  const disabled =
    busy ||
    state.loading ||
    !state.supported ||
    !config?.enabled ||
    needsHomeScreenInstall() ||
    (state.permission === "denied" && !state.subscribed)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-ink">Push auf diesem Gerät</div>
          <div className="mt-0.5 text-xs font-medium leading-relaxed text-ink-mute">{hint}</div>
        </div>
        <Switch label="Push-Nachrichten" checked={state.subscribed} disabled={disabled} onChange={handleChange} />
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </Card>
  )
}
