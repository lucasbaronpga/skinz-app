import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Link2, QrCode, Search, UserPlus, X } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import InviteQrCode from "../components/InviteQrCode"
import { Button, Card, ConfirmDialog, EmptyState, Pill, ScreenHeader, StatTile } from "../ui/index.js"
import cn from "../ui/cn.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { formatCents } from "../utils/format.js"
import { getGameModeLabel, getRequiredPlayers } from "../utils/gameModes.js"
import { buildInviteUrl } from "../utils/invite.js"

const POLL_INTERVAL_MS = 4000

const STATUS_PILLS = {
  accepted: { tone: "positive", label: "Zugesagt" },
  invited: { tone: "warning", label: "Eingeladen" },
  declined: { tone: "negative", label: "Abgesagt" },
}

function formatHandicap(value) {
  return value === null || value === undefined
    ? null
    : `HCP ${Number(value).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

function SectionTitle({ children }) {
  return (
    <h2 className="mb-3 mt-9 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
      {children}
    </h2>
  )
}

function PlayerRow({ player, canRemove, onRemove, busy }) {
  const pill = player.isScorer ? { tone: "dark", label: "Scorer" } : STATUS_PILLS[player.status]

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3.5 last:border-b-0",
        player.status === "declined" && "opacity-55"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fill text-sm font-bold text-ink">
          {player.shortName || player.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-bold tracking-[-0.02em] text-ink">
            {player.name}
            {player.isMe && <span className="font-medium text-ink-mute"> (du)</span>}
          </div>
          {formatHandicap(player.handicapIndex) && (
            <div className="text-sm font-medium text-ink-mute">{formatHandicap(player.handicapIndex)}</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pill && <Pill tone={pill.tone}>{pill.label}</Pill>}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(player)}
            disabled={busy}
            aria-label={`${player.name} entfernen`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-fill text-ink-soft disabled:opacity-40"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function FlightScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [flight, setFlight] = useState(null)
  const [loadState, setLoadState] = useState("loading")
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState("")
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dialog, setDialog] = useState(null)
  const redirectedRef = useRef(false)

  const applyFlight = useCallback((nextFlight) => {
    setFlight(nextFlight)
    setLoadState("ready")
  }, [])

  const loadFlight = useCallback(() => {
    return apiRequest(`/api/flights/get?id=${encodeURIComponent(id)}`)
      .then((data) => applyFlight(data.flight))
      .catch((error) => {
        if (error?.status === 404) setLoadState("missing")
        else setLoadState((current) => (current === "ready" ? current : "error"))
      })
  }, [applyFlight, id])

  // Solange der Flight offen ist, alle 4 Sekunden aktualisieren.
  useEffect(() => {
    loadFlight()

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadFlight()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [loadFlight])

  // Gestartet: Der Scorer geht direkt ins Live Scoring.
  useEffect(() => {
    if (flight?.status !== "active" || !flight.isScorer || redirectedRef.current) return

    redirectedRef.current = true
    navigate(`/live/${flight.id}`, { replace: true })
  }, [flight, navigate])

  const isEditable = flight?.status === "open" && flight.isScorer && !flight.isExpired

  useEffect(() => {
    if (!isEditable) return undefined

    const controller = new AbortController()

    apiRequest("/api/players", { signal: controller.signal })
      .then((data) => setPlayers(Array.isArray(data.players) ? data.players : []))
      .catch((error) => {
        if (error?.name !== "AbortError") console.error("Player list failed.", error)
      })

    return () => controller.abort()
  }, [isEditable])

  const inviteUrl = flight?.inviteToken ? buildInviteUrl(window.location.origin, flight.inviteToken) : ""
  const accepted = flight ? flight.players.filter((player) => player.status === "accepted") : []
  const pending = flight ? flight.players.filter((player) => player.status === "invited") : []
  const required = getRequiredPlayers(flight?.config.gameMode)
  const canStart = accepted.length >= required.min && accepted.length <= required.max

  const invitablePlayers = useMemo(() => {
    if (!flight) return []

    const taken = new Set(
      flight.players.filter((player) => player.status !== "declined").map((player) => player.userId)
    )
    const term = search.trim().toLowerCase()

    return players
      .filter((player) => !taken.has(String(player.id)))
      .filter((player) =>
        !term ||
        [player.displayName, player.shortName, player.homeClubName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      )
      .slice(0, 8)
  }, [flight, players, search])

  async function runAction(path, body, { onSuccess } = {}) {
    setActionError("")
    setBusy(true)

    try {
      const data = await apiRequest(path, { method: "POST", body })

      if (data.flight) applyFlight(data.flight)
      onSuccess?.(data)
    } catch (error) {
      setActionError(getErrorMessage(error))
      loadFlight()
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  async function handleShare() {
    if (!inviteUrl) return

    const shareData = { title: "Skinz Flight", text: "Spiel mit mir eine Runde Skinz:", url: inviteUrl }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      if (error?.name !== "AbortError") setActionError("Der Link konnte nicht geteilt werden.")
    }
  }

  function requestStart() {
    if (pending.length > 0) {
      setDialog({
        kind: "start",
        title: "Match jetzt starten?",
        description: `${pending.map((player) => player.name).join(", ")} ${
          pending.length === 1 ? "hat" : "haben"
        } noch nicht zugesagt und ${pending.length === 1 ? "wird" : "werden"} entfernt.`,
        confirmLabel: "Match starten",
      })
      return
    }

    runAction("/api/flights/start", { flightId: flight.id })
  }

  function handleConfirm() {
    if (dialog?.kind === "start") {
      runAction("/api/flights/start", { flightId: flight.id })
    } else if (dialog?.kind === "discard") {
      runAction("/api/flights/discard", { flightId: flight.id }, { onSuccess: () => navigate("/round", { replace: true }) })
    } else if (dialog?.kind === "leave") {
      runAction("/api/flights/respond", { flightId: flight.id, accept: false })
    }
  }

  const page = (content) => (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">{content}</div>
    </div>
  )

  if (loadState === "loading") {
    return page(<p className="pt-10 text-center text-sm font-medium text-ink-mute">Flight wird geladen …</p>)
  }

  if (loadState === "missing" || loadState === "error" || !flight) {
    return page(
      <EmptyState
        className="mt-10"
        title={loadState === "error" ? "Laden fehlgeschlagen" : "Flight nicht verfügbar"}
        description={
          loadState === "error"
            ? "Bitte prüfe deine Verbindung und versuche es erneut."
            : "Der Flight wurde verworfen oder du bist nicht mehr dabei."
        }
        action={
          <Button variant="primary" onClick={() => navigate("/round")}>
            Zu „Neue Runde“
          </Button>
        }
      />
    )
  }

  const scorer = flight.players.find((player) => player.isScorer)

  return page(
    <>
      <ScreenHeader
        eyebrow={`Flight · ${getGameModeLabel(flight.config.gameMode)}`}
        title={flight.course.clubName || flight.course.name || "Golfplatz"}
        subtitle={[flight.course.clubName ? flight.course.name : null, flight.course.location]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {flight.status === "open" && !flight.isExpired && <Pill tone="warning">Wartet auf Start</Pill>}
        {flight.status === "open" && flight.isExpired && <Pill tone="negative">Abgelaufen</Pill>}
        {flight.status !== "open" && <Pill tone="positive">Gestartet · {flight.matchCode}</Pill>}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <StatTile label="Pro Skin" value={formatCents(flight.config.stakeCents)} valueClassName="text-[1.35rem]" />
        <StatTile label="Löcher" value={flight.course.holeCount} />
        <StatTile
          label="Oozle"
          value={flight.config.oozle.enabled ? formatCents(flight.config.oozle.valueCents) : "Aus"}
          valueClassName="text-[1.35rem]"
        />
      </div>

      {flight.status !== "open" && !flight.isScorer && (
        <Card className="mt-6 p-5">
          <div className="font-bold text-ink">Das Match ist gestartet.</div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink-mute">
            {scorer?.name ?? "Der Scorer"} erfasst die Scores. Du siehst Leaderboard und Scorecard live mit.
          </p>
          <Button variant="primary" className="mt-4 w-full" onClick={() => navigate(`/live/${flight.id}`)}>
            Live verfolgen
          </Button>
        </Card>
      )}

      {flight.status === "open" && !flight.isScorer && flight.myStatus === "invited" && !flight.isExpired && (
        <Card className="mt-6 p-5">
          <div className="font-bold text-ink">{scorer?.name ?? "Der Scorer"} lädt dich ein.</div>
          <p className="mt-1 text-sm font-medium text-ink-mute">Bist du dabei?</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="glass"
              disabled={busy}
              onClick={() => runAction("/api/flights/respond", { flightId: flight.id, accept: false })}
            >
              Absagen
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => runAction("/api/flights/respond", { flightId: flight.id, accept: true })}
            >
              <Check size={18} aria-hidden="true" />
              Zusagen
            </Button>
          </div>
        </Card>
      )}

      {flight.status === "open" && !flight.isScorer && flight.myStatus === "accepted" && (
        <Card className="mt-6 flex items-center justify-between gap-4 p-5">
          <div>
            <div className="font-bold text-ink">Du bist dabei.</div>
            <p className="mt-1 text-sm font-medium text-ink-mute">Der Scorer startet das Match.</p>
          </div>
          <Button
            variant="glass"
            disabled={busy}
            onClick={() =>
              setDialog({
                kind: "leave",
                title: "Flight verlassen?",
                description: "Du kannst über den Einladungslink wieder beitreten, solange Platz ist.",
                confirmLabel: "Verlassen",
                tone: "danger",
              })
            }
          >
            Verlassen
          </Button>
        </Card>
      )}

      {flight.status === "open" && !flight.isScorer && flight.myStatus === "declined" && (
        <Card className="mt-6 flex items-center justify-between gap-4 p-5">
          <div className="font-bold text-ink">Du hast abgesagt.</div>
          {!flight.isExpired && (
            <Button
              variant="primary"
              disabled={busy || flight.freeSeats === 0}
              onClick={() => runAction("/api/flights/respond", { flightId: flight.id, accept: true })}
            >
              Doch dabei
            </Button>
          )}
        </Card>
      )}

      <SectionTitle>
        Spieler · {accepted.length} von {required.max === required.min ? required.max : `${required.min}–${required.max}`}
      </SectionTitle>
      <Card className="overflow-hidden">
        {flight.players.map((player) => (
          <PlayerRow
            key={player.userId}
            player={player}
            busy={busy}
            canRemove={isEditable && !player.isScorer}
            onRemove={(target) =>
              runAction("/api/flights/remove", { flightId: flight.id, userId: target.userId })
            }
          />
        ))}
      </Card>

      {isEditable && (
        <>
          <SectionTitle>Einladen · {flight.freeSeats} {flight.freeSeats === 1 ? "Platz" : "Plätze"} frei</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="glass" onClick={handleShare} disabled={!inviteUrl}>
              <Link2 size={18} aria-hidden="true" />
              {copied ? "Kopiert" : "Link teilen"}
            </Button>
            <Button variant="glass" onClick={() => setShowQr((current) => !current)} aria-pressed={showQr}>
              <QrCode size={18} aria-hidden="true" />
              {showQr ? "QR ausblenden" : "QR-Code"}
            </Button>
          </div>

          {showQr && inviteUrl && (
            <Card className="mt-3 p-5 text-center">
              <InviteQrCode url={inviteUrl} />
              <p className="mt-3 text-sm font-medium text-ink-mute">
                Mitspieler scannen den Code mit der Kamera und treten direkt bei.
              </p>
            </Card>
          )}

          {flight.freeSeats > 0 && (
            <Card className="mt-3 overflow-hidden">
              <label className="flex items-center gap-3 border-b border-line/10 px-4">
                <Search size={18} className="shrink-0 text-ink-mute" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Spieler suchen"
                  aria-label="Registrierte Spieler suchen"
                  className="h-12 w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-mute"
                />
              </label>
              {invitablePlayers.length === 0 && (
                <div className="px-4 py-4 text-sm font-medium text-ink-mute">
                  {search.trim() ? "Kein passender Spieler gefunden." : "Keine weiteren Spieler verfügbar."}
                </div>
              )}
              {invitablePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  disabled={busy}
                  onClick={() => runAction("/api/flights/invite", { flightId: flight.id, userIds: [player.id] })}
                  className="flex w-full items-center justify-between gap-3 border-b border-line/10 px-4 py-3 text-left last:border-b-0 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold tracking-[-0.02em] text-ink">{player.displayName}</span>
                    <span className="block text-sm font-medium text-ink-mute">
                      {[player.shortName, player.homeClubName].filter(Boolean).join(" · ") || "Aktiver Spieler"}
                    </span>
                  </span>
                  <UserPlus size={20} className="shrink-0 text-ink" aria-hidden="true" />
                </button>
              ))}
            </Card>
          )}
        </>
      )}

      {actionError && (
        <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      )}

      {flight.status === "open" && flight.isScorer && (
        <div className="mt-8 space-y-2">
          {!flight.isExpired && (
            <Button variant="primary" size="lg" className="w-full" onClick={requestStart} disabled={!canStart || busy}>
              {busy ? "Bitte warten …" : "Match starten"}
            </Button>
          )}
          {!canStart && !flight.isExpired && (
            <p className="text-center text-xs font-medium text-ink-mute">
              {flight.config.gameMode === "wolffn"
                ? "Wolffn startet mit genau vier Zusagen."
                : "Zum Start braucht es mindestens zwei Zusagen."}
            </p>
          )}
          <Button
            variant="glass"
            className="w-full"
            disabled={busy}
            onClick={() =>
              setDialog({
                kind: "discard",
                title: "Flight verwerfen?",
                description: "Alle Einladungen verfallen. Das lässt sich nicht rückgängig machen.",
                confirmLabel: "Verwerfen",
                tone: "danger",
              })
            }
          >
            Flight verwerfen
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
    </>
  )
}
