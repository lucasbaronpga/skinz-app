import { useCallback, useEffect, useState } from "react"
import { Check, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button, Card, Pill } from "../ui/index.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { formatCents } from "../utils/format.js"
import { getGameModeLabel } from "../utils/gameModes.js"

const POLL_INTERVAL_MS = 15000

function getScorer(flight) {
  return flight.players.find((player) => player.isScorer)
}

function getAcceptedCount(flight) {
  return flight.players.filter((player) => player.status === "accepted").length
}

function FlightSummary({ flight }) {
  return (
    <span className="mt-1 block text-sm font-medium text-ink-mute">
      {[
        flight.course.clubName || flight.course.name,
        getGameModeLabel(flight.config.gameMode),
        `${formatCents(flight.config.stakeCents)} pro Skin`,
      ]
        .filter(Boolean)
        .join(" · ")}
    </span>
  )
}

function InvitationRow({ flight, busy, onRespond, onOpen }) {
  const scorer = getScorer(flight)

  return (
    <div className="border-b border-line/10 px-4 py-4 last:border-b-0">
      <button type="button" onClick={() => onOpen(flight.id)} className="flex w-full items-start justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block font-bold tracking-[-0.02em] text-ink">
            {scorer?.name ?? "Ein Spieler"} lädt dich ein
          </span>
          <FlightSummary flight={flight} />
        </span>
        <Pill tone="warning">Einladung</Pill>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="glass" disabled={busy} onClick={() => onRespond(flight.id, false)}>
          Absagen
        </Button>
        <Button variant="primary" disabled={busy} onClick={() => onRespond(flight.id, true)}>
          <Check size={18} aria-hidden="true" />
          Zusagen
        </Button>
      </div>
    </div>
  )
}

function StatusRow({ flight, title, subtitle, pill, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(flight.id)}
      className="flex w-full items-center justify-between gap-3 border-b border-line/10 px-4 py-4 text-left last:border-b-0"
    >
      <span className="min-w-0">
        <span className="block font-bold tracking-[-0.02em] text-ink">{title}</span>
        <span className="mt-1 block text-sm font-medium text-ink-mute">{subtitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {pill}
        <ChevronRight size={18} className="text-ink-mute" aria-hidden="true" />
      </span>
    </button>
  )
}

/**
 * Einladungen und offene Flights ganz oben auf Home. Aktualisiert sich beim
 * Öffnen und alle 15 Sekunden, solange die Seite sichtbar ist.
 */
export default function HomeInvitations({ className }) {
  const navigate = useNavigate()
  const [flights, setFlights] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState("")

  const loadFlights = useCallback(() => {
    return apiRequest("/api/flights/list")
      .then((data) => setFlights(Array.isArray(data.flights) ? data.flights : []))
      .catch((loadError) => console.error("Flight list failed.", loadError))
  }, [])

  useEffect(() => {
    loadFlights()

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadFlights()
    }, POLL_INTERVAL_MS)

    function handleVisibility() {
      if (document.visibilityState === "visible") loadFlights()
    }

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [loadFlights])

  async function handleRespond(flightId, accept) {
    setError("")
    setBusyId(flightId)

    try {
      await apiRequest("/api/flights/respond", { method: "POST", body: { flightId, accept } })
      await loadFlights()
    } catch (respondError) {
      setError(getErrorMessage(respondError))
      loadFlights()
    } finally {
      setBusyId(null)
    }
  }

  const openFlight = (flightId) => navigate(`/flights/${flightId}`)
  const visibleFlights = flights.filter((flight) => !flight.isExpired)

  if (visibleFlights.length === 0) return null

  return (
    <section className={className}>
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
        Einladungen & Flights
      </h2>
      <Card className="overflow-hidden">
        {visibleFlights.map((flight) => {
          if (flight.isScorer) {
            const accepted = getAcceptedCount(flight)

            return (
              <StatusRow
                key={flight.id}
                flight={flight}
                title="Dein Flight wartet"
                subtitle={`${flight.course.clubName || flight.course.name} · ${accepted} ${
                  accepted === 1 ? "Zusage" : "Zusagen"
                }`}
                pill={<Pill tone="dark">Scorer</Pill>}
                onOpen={openFlight}
              />
            )
          }

          if (flight.myStatus === "invited") {
            return (
              <InvitationRow
                key={flight.id}
                flight={flight}
                busy={busyId === flight.id}
                onRespond={handleRespond}
                onOpen={openFlight}
              />
            )
          }

          return (
            <StatusRow
              key={flight.id}
              flight={flight}
              title="Du bist dabei"
              subtitle={`${getScorer(flight)?.name ?? "Der Scorer"} startet das Match.`}
              pill={<Pill tone="positive">Zugesagt</Pill>}
              onOpen={openFlight}
            />
          )
        })}
      </Card>
      {error && (
        <div role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
    </section>
  )
}
