import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, Minus, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useGame } from "../context/GameContext"
import { Button, Card, Pill, ScreenHeader } from "../ui/index.js"
import cn from "../ui/cn.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { formatCents } from "../utils/format.js"
import { GAME_MODE_OPTIONS, getGameModeLabel } from "../utils/gameModes.js"
import {
  DEFAULT_OOZLE_CENTS,
  DEFAULT_STAKE_CENTS,
  canStepStake,
  stepStake,
} from "../utils/stake.js"

const UUID_PATTERN = /^[0-9a-f-]{36}$/i

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
        {children}
      </h2>
      {action}
    </div>
  )
}

function OptionRow({ selected, onClick, title, subtitle, trailing }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 border-b border-line/10 px-4 py-4 text-left transition-colors last:border-b-0",
        selected && "bg-fill"
      )}
    >
      <span className="min-w-0">
        <span className="block text-[1.05rem] font-bold leading-tight tracking-[-0.02em] text-ink">
          {title}
        </span>
        {subtitle && (
          <span className="mt-1 block text-sm font-medium leading-snug text-ink-mute">{subtitle}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {trailing}
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2",
            selected ? "border-ink bg-ink" : "border-line/25"
          )}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-page" />}
        </span>
      </span>
    </button>
  )
}

function Stepper({ label, valueCents, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{label}</div>
        <div className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-ink">
          {formatCents(valueCents)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(stepStake(valueCents, -1))}
          disabled={!canStepStake(valueCents, -1)}
          aria-label={`${label} verringern`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-ink transition active:scale-95 disabled:opacity-30"
        >
          <Minus size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onChange(stepStake(valueCents, 1))}
          disabled={!canStepStake(valueCents, 1)}
          aria-label={`${label} erhöhen`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-page transition active:scale-95 disabled:opacity-30"
        >
          <Plus size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors",
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

function FlightRow({ flight, onOpen }) {
  const accepted = flight.players.filter((player) => player.status === "accepted").length
  const scorer = flight.players.find((player) => player.isScorer)
  let statusPill = <Pill tone="positive">Zugesagt</Pill>

  if (flight.isExpired) statusPill = <Pill tone="negative">Abgelaufen</Pill>
  else if (flight.isScorer) statusPill = <Pill tone="dark">Scorer</Pill>
  else if (flight.myStatus === "invited") statusPill = <Pill tone="warning">Einladung</Pill>

  return (
    <button
      type="button"
      onClick={() => onOpen(flight.id)}
      className="flex w-full items-center justify-between gap-4 border-b border-line/10 px-4 py-4 text-left last:border-b-0"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-mute">
          {getGameModeLabel(flight.config.gameMode)} · {formatCents(flight.config.stakeCents)} pro Skin
        </span>
        <span className="mt-1 block truncate text-[1.1rem] font-bold tracking-[-0.025em] text-ink">
          {flight.course.clubName || flight.course.name}
        </span>
        <span className="mt-1 block text-sm font-medium text-ink-mute">
          {flight.isScorer ? "Dein Flight" : `von ${scorer?.name ?? "Scorer"}`} · {accepted} Zusagen
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {statusPill}
        <ChevronRight size={18} className="text-ink-mute" aria-hidden="true" />
      </span>
    </button>
  )
}

export default function RoundSetupScreen() {
  const navigate = useNavigate()
  const { courses, coursesLoading, coursesError, hasActiveMatch } = useGame()
  const [flights, setFlights] = useState([])
  const [flightsLoading, setFlightsLoading] = useState(true)
  const [flightsError, setFlightsError] = useState("")
  const [courseId, setCourseId] = useState("")
  const [gameMode, setGameMode] = useState("classic")
  const [stakeCents, setStakeCents] = useState(DEFAULT_STAKE_CENTS)
  const [oozleEnabled, setOozleEnabled] = useState(false)
  const [oozleCents, setOozleCents] = useState(DEFAULT_OOZLE_CENTS)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const playableCourses = useMemo(
    () => (Array.isArray(courses) ? courses.filter((course) => UUID_PATTERN.test(String(course?.id))) : []),
    [courses]
  )
  const selectedCourseId = playableCourses.some((course) => course.id === courseId)
    ? courseId
    : playableCourses[0]?.id ?? ""
  const ownOpenFlight = flights.find((flight) => flight.isScorer && !flight.isExpired)
  const otherFlights = flights.filter((flight) => flight !== ownOpenFlight)
  const isWolffn = gameMode === "wolffn"

  const loadFlights = useCallback(() => {
    return apiRequest("/api/flights/list")
      .then((data) => {
        setFlights(Array.isArray(data.flights) ? data.flights : [])
        setFlightsError("")
      })
      .catch((error) => setFlightsError(getErrorMessage(error, "Flights konnten nicht geladen werden.")))
      .finally(() => setFlightsLoading(false))
  }, [])

  useEffect(() => {
    loadFlights()

    function handleFocus() {
      if (document.visibilityState === "visible") loadFlights()
    }

    document.addEventListener("visibilitychange", handleFocus)

    return () => document.removeEventListener("visibilitychange", handleFocus)
  }, [loadFlights])

  async function handleCreate() {
    setCreateError("")
    setIsCreating(true)

    try {
      const data = await apiRequest("/api/flights/create", {
        method: "POST",
        body: {
          golfCourseId: selectedCourseId,
          gameMode,
          stakeCents,
          oozle: { enabled: !isWolffn && oozleEnabled, valueCents: oozleCents },
        },
      })

      navigate(`/flights/${data.flight.id}`)
    } catch (error) {
      setCreateError(getErrorMessage(error, "Der Flight konnte nicht angelegt werden."))
      setIsCreating(false)

      if (error?.code === "OPEN_FLIGHT_EXISTS") loadFlights()
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <ScreenHeader
          eyebrow="Neue Runde"
          title="Flight anlegen"
          subtitle="Platz, Spielmodus und Einsatz wählen. Danach lädst du deine Mitspieler ein."
        />

        {hasActiveMatch && (
          <Card className="mt-6 flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-mute">
                Laufendes Match
              </div>
              <div className="mt-1 font-bold text-ink">Du bist noch auf der Runde.</div>
            </div>
            <Button variant="primary" onClick={() => navigate("/live")}>
              Weiterspielen
            </Button>
          </Card>
        )}

        {(flightsLoading || otherFlights.length > 0 || flightsError) && (
          <>
            <SectionTitle>Einladungen & Flights</SectionTitle>
            <Card className="overflow-hidden">
              {flightsLoading && (
                <div className="px-4 py-5 text-sm font-medium text-ink-mute">Wird geladen …</div>
              )}
              {!flightsLoading && flightsError && (
                <div className="px-4 py-5 text-sm font-semibold text-red-600">{flightsError}</div>
              )}
              {!flightsLoading &&
                otherFlights.map((flight) => (
                  <FlightRow key={flight.id} flight={flight} onOpen={(id) => navigate(`/flights/${id}`)} />
                ))}
            </Card>
          </>
        )}

        {ownOpenFlight ? (
          <>
            <SectionTitle>Dein offener Flight</SectionTitle>
            <Card className="overflow-hidden">
              <FlightRow flight={ownOpenFlight} onOpen={(id) => navigate(`/flights/${id}`)} />
            </Card>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-mute">
              Du kannst nur einen offenen Flight gleichzeitig haben. Starte oder verwirf ihn, um einen
              neuen anzulegen.
            </p>
          </>
        ) : (
          <>
            <SectionTitle>Platz</SectionTitle>
            <Card className="overflow-hidden" role="radiogroup" aria-label="Platz">
              {coursesLoading && (
                <div className="px-4 py-5 text-sm font-medium text-ink-mute">Plätze werden geladen …</div>
              )}
              {!coursesLoading && coursesError && (
                <div className="px-4 py-5 text-sm font-semibold text-red-600">{coursesError}</div>
              )}
              {!coursesLoading && !coursesError && playableCourses.length === 0 && (
                <div className="px-4 py-5 text-sm font-medium text-ink-mute">Keine spielbaren Plätze.</div>
              )}
              {!coursesLoading &&
                playableCourses.map((course) => (
                  <OptionRow
                    key={course.id}
                    selected={course.id === selectedCourseId}
                    onClick={() => setCourseId(course.id)}
                    title={course.clubName || course.name}
                    subtitle={[
                      course.clubName && course.name !== course.clubName ? course.name : null,
                      course.location,
                      `${course.holeCount} Löcher`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    trailing={
                      <span className="text-right">
                        <span className="block text-lg font-bold tabular-nums text-ink">{course.par}</span>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
                          Par
                        </span>
                      </span>
                    }
                  />
                ))}
            </Card>

            <SectionTitle>Spielmodus</SectionTitle>
            <Card className="overflow-hidden" role="radiogroup" aria-label="Spielmodus">
              {GAME_MODE_OPTIONS.map((option) => (
                <OptionRow
                  key={option.value}
                  selected={gameMode === option.value}
                  onClick={() => setGameMode(option.value)}
                  title={option.value === "wolffn" ? `🐺 ${option.label}` : option.label}
                  subtitle={option.description}
                />
              ))}
            </Card>

            <SectionTitle>Einsatz</SectionTitle>
            <Card className="overflow-hidden">
              <Stepper label="Pro Skin" valueCents={stakeCents} onChange={setStakeCents} />
            </Card>

            {!isWolffn && (
              <>
                <SectionTitle>Nebenwette</SectionTitle>
                <Card className="overflow-hidden">
                  <div className="flex items-start justify-between gap-4 px-4 py-4">
                    <div>
                      <div className="text-[1.05rem] font-bold tracking-[-0.02em] text-ink">Oozle</div>
                      <p className="mt-1 text-sm font-medium leading-snug text-ink-mute">
                        Auf Par 3: Grün getroffen und höchstens 2 Putts gewinnt, 3 Putts zahlt (Foozle).
                        Trifft niemand, wandert der Einsatz doppelt weiter.
                      </p>
                    </div>
                    <Switch checked={oozleEnabled} onChange={setOozleEnabled} label="Oozle spielen" />
                  </div>
                  {oozleEnabled && (
                    <div className="border-t border-line/10">
                      <Stepper label="Pro Oozle" valueCents={oozleCents} onChange={setOozleCents} />
                    </div>
                  )}
                </Card>
              </>
            )}

            {createError && (
              <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {createError}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="mt-8 w-full"
              onClick={handleCreate}
              disabled={!selectedCourseId || isCreating || coursesLoading}
            >
              {isCreating ? "Wird angelegt …" : "Flight anlegen"}
            </Button>
            <p className="mt-3 text-center text-xs font-medium text-ink-mute">
              Mitspieler lädst du im nächsten Schritt aus der Liste, per Link oder QR-Code ein.
            </p>
          </>
        )}

      </div>
    </div>
  )
}
