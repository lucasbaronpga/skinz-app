import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"
import { Button, Card } from "../ui/index.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"

const CONSEQUENCES = [
  "Dein Profil, deine E-Mail-Adresse, dein PayPal-Link und deine Einstellungen werden gelöscht.",
  "Offene Flights und Einladungen fallen weg.",
  "Abgeschlossene Matches bleiben für deine Mitspieler erhalten. Du erscheinst dort als „Gelöschter Spieler“.",
  "Du wirst auf allen Geräten abgemeldet. Das lässt sich nicht rückgängig machen.",
]

export default function DeleteAccountScreen() {
  const navigate = useNavigate()
  const { user, checkSession } = useAuth()
  const [password, setPassword] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const isAdmin = user?.role === "admin"

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setBusy(true)

    try {
      await apiRequest("/api/auth/delete-account", { method: "POST", body: { password } })
      await checkSession()
      navigate("/login", { replace: true })
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Das Konto konnte nicht gelöscht werden."))
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Zurück zum Profil"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="text-[1.6rem] font-bold tracking-[-0.04em]">Konto löschen</h1>
        </div>

        <Card className="mt-6 p-4">
          <ul className="space-y-2.5 text-[15px] font-medium leading-relaxed text-ink-soft">
            {CONSEQUENCES.map((text) => (
              <li key={text} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </Card>

        {isAdmin ? (
          <Card className="mt-6 p-4 text-sm font-medium text-ink-mute">
            Admin-Konten können nicht in der App gelöscht werden.
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Passwort zur Bestätigung</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-line/15 bg-card px-4 text-base font-semibold text-ink outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100"
              />
            </label>
            <label className="flex items-start gap-3 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              Ich habe verstanden, dass mein Konto endgültig gelöscht wird.
            </label>

            {error && (
              <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" variant="danger" size="lg" className="w-full" disabled={busy || !confirmed || !password}>
              {busy ? "Wird gelöscht …" : "Konto endgültig löschen"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
