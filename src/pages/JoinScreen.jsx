import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"
import { Button, Card, EmptyState, ScreenHeader, StatTile } from "../ui/index.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { formatCents } from "../utils/format.js"
import { getGameModeLabel } from "../utils/gameModes.js"
import { clearPendingInvite, readInviteToken, savePendingInvite } from "../utils/invite.js"

function Page({ children }) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">{children}</div>
    </div>
  )
}

function InvitePreview({ token }) {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: "loading", flight: null, error: "" })
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    clearPendingInvite()
    apiRequest(`/api/flights/preview?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then((data) => setState({ status: "ready", flight: data.flight, error: "" }))
      .catch((error) => {
        if (error?.name === "AbortError") return
        setState({ status: "error", flight: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [token])

  async function handleJoin() {
    setJoinError("")
    setIsJoining(true)

    try {
      const data = await apiRequest("/api/flights/join", { method: "POST", body: { token } })

      navigate(`/flights/${data.flight.id}`, { replace: true })
    } catch (error) {
      setJoinError(getErrorMessage(error))
      setIsJoining(false)
    }
  }

  if (state.status === "loading") {
    return <p className="pt-10 text-center text-sm font-medium text-ink-mute">Einladung wird geladen …</p>
  }

  if (state.status === "error") {
    return (
      <EmptyState
        className="mt-10"
        title="Einladung nicht verfügbar"
        description={state.error}
        action={
          <Button variant="primary" onClick={() => navigate("/round")}>
            Zu „Neue Runde“
          </Button>
        }
      />
    )
  }

  const { flight } = state
  const scorer = flight.players.find((player) => player.isScorer)
  const isMember = flight.myStatus === "accepted" || flight.isScorer

  return (
    <>
      <ScreenHeader
        eyebrow={`Einladung · ${getGameModeLabel(flight.config.gameMode)}`}
        title={flight.course.clubName || flight.course.name || "Golfplatz"}
        subtitle={`${scorer?.name ?? "Ein Spieler"} lädt dich zu einer Runde Skinz ein.`}
      />
      <div className="mt-6 grid grid-cols-3 gap-2">
        <StatTile label="Pro Skin" value={formatCents(flight.config.stakeCents)} valueClassName="text-[1.35rem]" />
        <StatTile label="Löcher" value={flight.course.holeCount} />
        <StatTile label="Plätze frei" value={flight.freeSeats} />
      </div>
      <Card className="mt-6 overflow-hidden">
        {flight.players
          .filter((player) => player.status !== "declined")
          .map((player) => (
            <div key={player.userId} className="border-b border-line/10 px-4 py-3 font-bold text-ink last:border-b-0">
              {player.name}
              {player.isScorer && <span className="font-medium text-ink-mute"> · Scorer</span>}
            </div>
          ))}
      </Card>

      {joinError && (
        <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {joinError}
        </div>
      )}

      {isMember ? (
        <Button variant="primary" size="lg" className="mt-8 w-full" onClick={() => navigate(`/flights/${flight.id}`)}>
          Flight öffnen
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="mt-8 w-full"
          onClick={handleJoin}
          disabled={isJoining || flight.freeSeats === 0}
        >
          {isJoining ? "Bitte warten …" : flight.freeSeats === 0 ? "Flight ist voll" : "Zusagen und beitreten"}
        </Button>
      )}
    </>
  )
}

/**
 * Einstieg über Einladungslink oder QR-Code. Ohne Anmeldung wird die Einladung
 * gemerkt und nach Anmeldung oder Registrierung automatisch wieder geöffnet.
 */
export default function JoinScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const token = readInviteToken(location.hash)

  useEffect(() => {
    if (token && !isAuthenticated) savePendingInvite(token)
  }, [isAuthenticated, token])

  if (!token) {
    return (
      <Page>
        <EmptyState
          className="mt-10"
          title="Link unvollständig"
          description="Bitte öffne den Einladungslink direkt aus der Nachricht oder scanne den QR-Code erneut."
        />
      </Page>
    )
  }

  if (!isAuthenticated) {
    return (
      <Page>
        <ScreenHeader
          eyebrow="Einladung"
          title="Eine Runde Skinz?"
          subtitle="Melde dich an oder registriere dich kostenlos. Danach geht es direkt zur Einladung."
        />
        <Button variant="primary" size="lg" className="mt-8 w-full" onClick={() => navigate("/login")}>
          Anmelden oder registrieren
        </Button>
      </Page>
    )
  }

  return (
    <Page>
      <InvitePreview token={token} />
    </Page>
  )
}
