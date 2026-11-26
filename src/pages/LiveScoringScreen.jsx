import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { getResultLabel, getTeeOrder } from "../../lib/engine/index.js"
import AppBackground from "../components/AppBackground"
import Scorecard from "../components/Scorecard"
import { useGame } from "../context/GameContext"
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  LeaderboardHeader,
  LeaderboardRow,
  Pill,
  ScoreTile,
  ScreenHeader,
} from "../ui/index.js"
import cn from "../ui/cn.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { formatCents, formatSkinz } from "../utils/format.js"
import {
  formatDateTime,
  getCourseTitle,
  getHolesPlayed,
  getModeTitle,
  getStandings,
} from "../utils/liveMatch.js"

const POLL_INTERVAL_MS = 5000
const TOAST_DURATION_MS = 2600
const MIN_SCORE = 1
const MAX_SCORE = 20
const PUTT_OPTIONS = [
  { value: 1, label: "1 Putt" },
  { value: 2, label: "2 Putts" },
  { value: 3, label: "3+ Putts" },
]

function createDraft(match, holeNumber) {
  const input = match.inputs[holeNumber - 1]
  const par = match.course.pars[holeNumber - 1]
  const oozle = input?.oozle

  return {
    key: `${holeNumber}:${match.version}`,
    scores: Object.fromEntries(
      match.players.map((player) => [player.userId, input?.scores?.[player.userId] ?? par])
    ),
    wolffn: {
      decision: input?.wolffn?.decision ?? null,
      askedPlayerId: input?.wolffn?.askedPlayerId ?? null,
    },
    oozle: oozle?.noGreen
      ? { noGreen: true, playerId: null, putts: null }
      : { noGreen: false, playerId: oozle?.playerId ?? null, putts: oozle?.putts ?? null },
  }
}

function buildHolePayload({ draft, isWolffn, oozleRequired }) {
  const hole = { scores: draft.scores }

  if (isWolffn) {
    hole.wolffn =
      draft.wolffn.decision === "alone"
        ? { decision: "alone" }
        : { decision: draft.wolffn.decision, askedPlayerId: draft.wolffn.askedPlayerId }
  }

  if (oozleRequired) {
    hole.oozle = draft.oozle.noGreen
      ? { noGreen: true }
      : { playerId: draft.oozle.playerId, putts: draft.oozle.putts }
  }

  return hole
}

function getNames(match, ids) {
  const names = new Map(match.players.map((player) => [player.userId, player.name]))

  return ids.map((id) => names.get(id) ?? "Spieler").join(" + ")
}

function describeHole(match, hole) {
  if (!hole) return ""

  if (hole.tie) {
    return hole.carryoverAfter > 0
      ? `Loch ${hole.holeNumber} geteilt · ${formatSkinz(hole.carryoverAfter)} im Carryover`
      : `Loch ${hole.holeNumber} geteilt`
  }

  return `${getNames(match, hole.winnerPlayerIds)} gewinnt ${formatSkinz(hole.potSkinz)} auf Loch ${hole.holeNumber}`
}

function getScorecardRows(match) {
  return match.players.map((player) => ({
    key: player.userId,
    label: player.shortName || player.name,
    scores: match.course.pars.map((_, index) => match.inputs[index]?.scores?.[player.userId] ?? null),
  }))
}

function Section({ title, action, children, className }) {
  return (
    <section className={cn("mt-9", className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ScoreInput({ name, score, par, disabled, onChange }) {
  const label = getResultLabel(score, par)

  function step(delta) {
    const next = Math.min(MAX_SCORE, Math.max(MIN_SCORE, score + delta))

    if (next !== score) onChange(next)
  }

  function handleDragEnd(_event, info) {
    if (info.offset.y < -24 || info.velocity.y < -400) step(1)
    else if (info.offset.y > 24 || info.velocity.y > 400) step(-1)
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault()
      step(1)
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault()
      step(-1)
    }
  }

  return (
    <motion.div
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Score von ${name}, nach oben wischen erhöht, nach unten verringert`}
      aria-valuenow={score}
      aria-valuemin={MIN_SCORE}
      aria-valuemax={MAX_SCORE}
      aria-disabled={disabled}
      drag={disabled ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.18}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      onKeyDown={disabled ? undefined : handleKeyDown}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={cn(
        "shrink-0 touch-none select-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-emerald-200",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      )}
    >
      <ScoreTile score={score} label={label} size="lg" />
    </motion.div>
  )
}

function WolffnSetup({ match, holeNumber, draft, onChange }) {
  const playerIds = match.players.map((player) => player.userId)
  const teeOrder = getTeeOrder(playerIds, holeNumber)
  const decider = teeOrder[0]
  const { decision, askedPlayerId } = draft.wolffn
  let teamSummary = null

  if (decision === "alone") {
    teamSummary = `${getNames(match, [decider])} spielt allein gegen drei (Pot ×2)`
  } else if (askedPlayerId && decision === "accepted") {
    teamSummary = `${getNames(match, [decider, askedPlayerId])} gegen ${getNames(
      match,
      teeOrder.filter((id) => id !== decider && id !== askedPlayerId)
    )}`
  } else if (askedPlayerId && decision === "declined") {
    teamSummary = `${getNames(match, [askedPlayerId])} spielt allein gegen drei (Pot ×2)`
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-mute">
        Abschlag:
        {teeOrder.map((id, index) => (
          <span key={id} className={cn("font-bold", index === 0 ? "text-ink" : "text-ink-soft")}>
            {index + 1}. {getNames(match, [id])}
          </span>
        ))}
      </div>
      <div className="mt-3 text-lg font-bold tracking-[-0.02em] text-ink">
        🐺 {getNames(match, [decider])} entscheidet
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {teeOrder.slice(1).map((id) => (
          <Chip
            key={id}
            selected={askedPlayerId === id}
            onClick={() => onChange({ decision: null, askedPlayerId: id })}
          >
            fragt {getNames(match, [id])}
          </Chip>
        ))}
        <Chip selected={decision === "alone"} onClick={() => onChange({ decision: "alone", askedPlayerId: null })}>
          Allein spielen
        </Chip>
      </div>

      {askedPlayerId && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant={decision === "accepted" ? "primary" : "glass"}
            onClick={() => onChange({ decision: "accepted", askedPlayerId })}
          >
            Angenommen
          </Button>
          <Button
            variant={decision === "declined" ? "primary" : "glass"}
            onClick={() => onChange({ decision: "declined", askedPlayerId })}
          >
            Abgelehnt
          </Button>
        </div>
      )}

      {teamSummary && <p className="mt-4 text-sm font-semibold text-ink">{teamSummary}</p>}
    </Card>
  )
}

function OozleSetup({ match, draft, amountCents, unitsAtStake, onChange }) {
  const { noGreen, playerId, putts } = draft.oozle
  let summary = null

  if (noGreen) summary = "Carryover: Einsatz wandert doppelt zum nächsten Par 3."
  else if (playerId && putts) {
    summary =
      putts >= 3
        ? `Foozle · ${getNames(match, [playerId])} zahlt jedem ${formatCents(amountCents)}`
        : `Oozle · ${getNames(match, [playerId])} bekommt von jedem ${formatCents(amountCents)}`
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold tracking-[-0.02em] text-ink">Oozle</div>
          <p className="mt-1 text-sm font-medium text-ink-mute">Wer liegt nach dem Abschlag am nächsten zur Fahne?</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-ink">{formatCents(amountCents)}</div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
            {unitsAtStake > 1 ? `je Gegner · ×${unitsAtStake}` : "je Gegner"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {match.players.map((player) => (
          <Chip
            key={player.userId}
            selected={!noGreen && playerId === player.userId}
            onClick={() => onChange({ noGreen: false, playerId: player.userId, putts: null })}
          >
            {player.name}
          </Chip>
        ))}
        <Chip selected={noGreen} onClick={() => onChange({ noGreen: true, playerId: null, putts: null })}>
          Niemand auf dem Grün
        </Chip>
      </div>

      {!noGreen && playerId && (
        <div className="mt-3 flex flex-wrap gap-2">
          {PUTT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              selected={putts === option.value}
              onClick={() => onChange({ noGreen: false, playerId, putts: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      )}

      {summary && <p className="mt-4 text-sm font-semibold text-ink">{summary}</p>}
    </Card>
  )
}

function Standings({ match }) {
  const holesPlayed = getHolesPlayed(match)
  const thru = holesPlayed >= match.course.holeCount ? "F" : holesPlayed

  return (
    <>
      <LeaderboardHeader />
      {getStandings(match).map((player) => (
        <LeaderboardRow
          key={player.userId}
          position={player.position}
          name={player.name}
          shortName={`${player.shortName ? `${player.shortName} · ` : ""}${formatSkinz(player.skinz)}`}
          thru={thru}
          toPar={player.totalToPar}
          earningsCents={player.totalCents}
          highlight={player.isMe}
        />
      ))}
    </>
  )
}

function Payments({ match }) {
  const payments = match.result?.settlement?.payments ?? []

  if (payments.length === 0) {
    return (
      <Card className="px-4 py-5 text-center text-sm font-semibold text-ink-mute">
        Keine Zahlungen nötig, alle sind ausgeglichen.
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {payments.map((payment) => (
        <div
          key={`${payment.fromPlayerId}-${payment.toPlayerId}`}
          className="flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3.5 last:border-b-0"
        >
          <span className="min-w-0 text-[15px] font-semibold text-ink">
            {getNames(match, [payment.fromPlayerId])}
            <span className="font-medium text-ink-mute"> zahlt </span>
            {getNames(match, [payment.toPlayerId])}
          </span>
          <span className="shrink-0 text-lg font-bold tabular-nums text-ink">
            {formatCents(payment.amountCents)}
          </span>
        </div>
      ))}
    </Card>
  )
}

function Page({ children, withSaveBar = false }) {
  return (
    <div
      className={cn(
        "relative min-h-[100dvh] overflow-x-hidden text-ink",
        withSaveBar ? "pb-[calc(8rem+env(safe-area-inset-bottom))]" : "pb-[calc(3rem+env(safe-area-inset-bottom))]"
      )}
    >
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">{children}</div>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Zurück zu Home"
      className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
    >
      <ChevronLeft size={22} aria-hidden="true" />
    </button>
  )
}

export default function LiveScoringScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { restoreActiveMatch } = useGame()
  const [state, setState] = useState({ status: "loading", match: null, error: "" })
  const [selectedHole, setSelectedHole] = useState(null)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(() => {
    const path = id ? `/api/live/get?id=${encodeURIComponent(id)}` : "/api/live/current"

    return apiRequest(path)
      .then((data) => {
        setState(
          data.match
            ? { status: "ready", match: data.match, error: "" }
            : { status: "none", match: null, error: "" }
        )
      })
      .catch((error) => {
        setState((current) =>
          current.status === "ready"
            ? current
            : { status: error?.status === 404 ? "missing" : "error", match: null, error: getErrorMessage(error) }
        )
      })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const match = state.match
  const shouldPoll = Boolean(match) && !match.canScore && match.status !== "completed"

  // Mitspieler (und pausierte Matches) aktualisieren sich automatisch.
  useEffect(() => {
    if (!shouldPoll) return undefined

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [load, shouldPoll])

  useEffect(() => {
    if (!toast) return undefined

    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [toast])

  if (state.status === "loading") {
    return (
      <Page>
        <p className="pt-16 text-center text-sm font-medium text-ink-mute">Match wird geladen …</p>
      </Page>
    )
  }

  if (!match) {
    const isNone = state.status === "none"

    return (
      <Page>
        <BackButton onClick={() => navigate("/")} />
        <EmptyState
          className="mt-8"
          title={isNone ? "Kein laufendes Match" : state.status === "missing" ? "Match nicht gefunden" : "Laden fehlgeschlagen"}
          description={isNone ? "Lege eine neue Runde an und lade deine Mitspieler ein." : state.error}
          action={
            <Button variant="primary" onClick={() => navigate(isNone ? "/round" : "/")}>
              {isNone ? "Neue Runde" : "Zu Home"}
            </Button>
          }
        />
      </Page>
    )
  }

  const holeCount = match.course.holeCount
  const holesPlayed = getHolesPlayed(match)
  const isCompleted = match.status === "completed"
  const isPaused = match.status === "paused"
  const isWolffn = match.config.gameMode === "wolffn"
  const nextHole = Math.min(holesPlayed + 1, holeCount)
  const activeHole = Math.min(selectedHole ?? (isCompleted ? holeCount : nextHole), holeCount)
  const isCorrection = activeHole <= holesPlayed
  const par = match.course.pars[activeHole - 1]
  const result = match.result
  const holeResult = result?.holes?.[activeHole - 1] ?? null
  const currentDraft =
    draft && draft.key === `${activeHole}:${match.version}` ? draft : createDraft(match, activeHole)
  const oozleRequired = match.config.oozle.enabled && par === 3
  const oozleUnits = holeResult?.oozle
    ? holeResult.oozle.unitsAtStake
    : Math.max(result?.oozleCarryoverUnits ?? 0, 1)
  const oozleAmountCents = oozleUnits * (match.config.oozle.valueCents ?? 0)
  const carryoverBefore = holeResult ? holeResult.carryoverBefore : result?.carryoverSkinz ?? 0
  const wolffnOk =
    !isWolffn ||
    currentDraft.wolffn.decision === "alone" ||
    (Boolean(currentDraft.wolffn.askedPlayerId) &&
      ["accepted", "declined"].includes(currentDraft.wolffn.decision))
  const oozleOk =
    !oozleRequired ||
    currentDraft.oozle.noGreen ||
    (Boolean(currentDraft.oozle.playerId) && [1, 2, 3].includes(currentDraft.oozle.putts))
  const showEntry = match.canScore && !isCompleted
  const canPause = match.status === "active" && !match.legacy
  const completesMatch = !isCorrection && activeHole === holeCount
  const scorer = match.players.find((player) => player.isScorer)
  const lengths = match.course.lengths[activeHole - 1]
  const handicap = match.course.handicapIndexes[activeHole - 1]

  function updateDraft(changes) {
    setDraft({ ...currentDraft, ...changes })
  }

  function selectHole(holeNumber) {
    setSelectedHole(holeNumber === nextHole && !isCompleted ? null : holeNumber)
    setActionError("")
  }

  async function postAction(path, body) {
    setBusy(true)
    setActionError("")

    try {
      return await apiRequest(path, { method: "POST", body })
    } catch (error) {
      setActionError(getErrorMessage(error))

      if (error?.code === "VERSION_CONFLICT") load()

      return null
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  async function saveHole() {
    const data = await postAction("/api/live/score", {
      matchId: match.id,
      holeNumber: activeHole,
      expectedVersion: match.version,
      hole: buildHolePayload({ draft: currentDraft, isWolffn, oozleRequired }),
    })

    if (!data?.match) return

    setState({ status: "ready", match: data.match, error: "" })
    setDraft(null)
    setSelectedHole(null)
    setToast({
      id: Date.now(),
      text: describeHole(data.match, data.match.result?.holes?.[activeHole - 1]),
    })
  }

  async function changeStatus(action) {
    const data = await postAction(`/api/live/${action}`, { matchId: match.id })

    if (!data) return

    if (action === "cancel") {
      restoreActiveMatch({ force: true })
      navigate("/", { replace: true })
      return
    }

    setState({ status: "ready", match: data.match, error: "" })
  }

  function handleSaveClick() {
    if (completesMatch) {
      setDialog({
        kind: "complete",
        title: "Match abschließen?",
        description: "Das letzte Loch wird gespeichert und die Endabrechnung erstellt. Danach sind keine Korrekturen mehr möglich.",
        confirmLabel: "Abschließen",
      })
      return
    }

    saveHole()
  }

  function handleConfirm() {
    if (dialog?.kind === "complete") saveHole()
    else if (dialog?.kind === "pause") changeStatus("pause")
    else if (dialog?.kind === "cancel") changeStatus("cancel")
  }

  let statusPill = <Pill tone="positive">Live</Pill>

  if (isPaused) statusPill = <Pill tone="warning">Pausiert</Pill>
  if (isCompleted) statusPill = <Pill tone="dark">Beendet</Pill>

  return (
    <Page withSaveBar={showEntry}>
      <div className="flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate("/")} />
        <div className="flex items-center gap-2">
          {statusPill}
          <Pill>{match.matchCode}</Pill>
        </div>
      </div>

      <ScreenHeader
        className="mt-5"
        eyebrow={`${getModeTitle(match)} · ${getCourseTitle(match)}`}
        title={isCompleted ? "Match beendet" : `Loch ${activeHole}`}
        subtitle={
          isCompleted
            ? `${holeCount} Löcher · ${formatCents(match.config.stakeCents)} pro Skin`
            : [`Par ${par}`, handicap ? `HCP ${handicap}` : null, lengths ? `${lengths} m` : null]
                .filter(Boolean)
                .join(" · ")
        }
      />

      {match.legacy && (
        <Card className="mt-6 p-5">
          <div className="font-bold text-ink">Altes Match</div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink-mute">
            Dieses Match wurde mit der vorherigen App-Version gestartet und kann hier nicht weitergespielt
            werden. Du kannst es abbrechen und eine neue Runde anlegen.
          </p>
        </Card>
      )}

      {isPaused && (
        <Card className="mt-6 p-5">
          <div className="font-bold text-ink">Match pausiert</div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink-mute">
            {match.isPauseExpired
              ? "Die Pause ist länger als drei Tage. Das Match wird automatisch gelöscht."
              : `Ohne Fortsetzung wird das Match am ${formatDateTime(match.pauseExpiresAt)} gelöscht.`}
          </p>
          {match.canControl && !match.isPauseExpired && !match.legacy && (
            <Button variant="primary" className="mt-4 w-full" disabled={busy} onClick={() => changeStatus("resume")}>
              Fortsetzen
            </Button>
          )}
        </Card>
      )}

      {!match.canScore && !isCompleted && !isPaused && !match.legacy && (
        <Card className="mt-6 p-4 text-sm font-medium leading-relaxed text-ink-mute">
          {scorer?.name ?? "Der Scorer"} erfasst die Scores. Die Ansicht aktualisiert sich automatisch.
        </Card>
      )}

      {showEntry && (
        <>
          {holesPlayed > 0 && (
            <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: Math.min(holesPlayed + 1, holeCount) }, (_, index) => index + 1).map((holeNumber) => (
                <Chip
                  key={holeNumber}
                  selected={holeNumber === activeHole}
                  onClick={() => selectHole(holeNumber)}
                  className="min-w-[2.75rem] px-3"
                >
                  {holeNumber}
                </Chip>
              ))}
            </div>
          )}

          {isCorrection && (
            <Card className="mt-4 p-4 text-sm font-medium leading-relaxed text-ink-mute">
              <span className="font-bold text-ink">Korrektur Loch {activeHole}.</span> Beim Speichern wird das ganze
              Match neu berechnet. Aktuell: {describeHole(match, holeResult)}.
            </Card>
          )}

          <p className="mt-5 text-sm font-medium text-ink-mute">
            Im Topf: <span className="font-bold text-ink">{formatSkinz(carryoverBefore + 1)}</span>
            {carryoverBefore > 0 && ` (inkl. ${formatSkinz(carryoverBefore)} Carryover)`}
            {isWolffn && " · ×2 bei 1 gegen 3, Birdie ×2, Eagle ×4"}
          </p>

          {isWolffn && (
            <Section title="Wolffn" className="mt-5">
              <WolffnSetup
                match={match}
                holeNumber={activeHole}
                draft={currentDraft}
                onChange={(wolffn) => updateDraft({ wolffn })}
              />
            </Section>
          )}

          {oozleRequired && (
            <Section title="Nebenwette" className="mt-5">
              <OozleSetup
                match={match}
                draft={currentDraft}
                amountCents={oozleAmountCents}
                unitsAtStake={oozleUnits}
                onChange={(oozle) => updateDraft({ oozle })}
              />
            </Section>
          )}

          <Section title="Scores" className="mt-5" action={<span className="text-xs font-medium text-ink-mute">Wischen ↑ mehr · ↓ weniger</span>}>
            <Card className="overflow-hidden">
              {match.players.map((player) => {
                const score = currentDraft.scores[player.userId]

                return (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between gap-4 border-b border-line/10 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[1.15rem] font-bold tracking-[-0.025em] text-ink">
                        {player.name}
                        {player.isMe && <span className="font-medium text-ink-mute"> (du)</span>}
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-ink-mute">{getResultLabel(score, par)}</div>
                    </div>
                    <ScoreInput
                      name={player.name}
                      score={score}
                      par={par}
                      disabled={busy}
                      onChange={(value) => updateDraft({ scores: { ...currentDraft.scores, [player.userId]: value } })}
                    />
                  </div>
                )
              })}
            </Card>
          </Section>
        </>
      )}

      {isCompleted && (
        <Section title="Endabrechnung">
          <Payments match={match} />
        </Section>
      )}

      {result && (
        <Section title={isCompleted ? "Ergebnis" : "Leaderboard"}>
          <Standings match={match} />
        </Section>
      )}

      {result && (
        <Section title="Scorecard">
          <Scorecard
            pars={match.course.pars}
            rows={getScorecardRows(match)}
            activeHole={activeHole}
            onSelectHole={showEntry ? selectHole : null}
            selectableUntil={holesPlayed + 1}
          />
        </Section>
      )}

      {actionError && (
        <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      )}

      {isCompleted && (
        <div className="mt-8 grid gap-2">
          <Button variant="primary" size="lg" onClick={() => navigate(`/matches/${match.id}`)}>
            Details und PayPal
          </Button>
          <Button variant="glass" onClick={() => navigate("/")}>
            Zu Home
          </Button>
        </div>
      )}

      {match.canControl && (
        <div className="mt-8 grid grid-cols-2 gap-2">
          {canPause && (
            <Button
              variant="glass"
              disabled={busy}
              onClick={() =>
                setDialog({
                  kind: "pause",
                  title: "Match pausieren?",
                  description: "Du kannst es später fortsetzen. Nach drei Tagen Pause wird es automatisch gelöscht.",
                  confirmLabel: "Pausieren",
                })
              }
            >
              Pausieren
            </Button>
          )}
          <Button
            variant="glass"
            className={cn("text-red-600", !canPause && "col-span-2")}
            disabled={busy}
            onClick={() =>
              setDialog({
                kind: "cancel",
                title: "Match abbrechen?",
                description: "Das Match wird beendet und nicht gewertet. Das lässt sich nicht rückgängig machen.",
                confirmLabel: "Match abbrechen",
                tone: "danger",
              })
            }
          >
            Abbrechen
          </Button>
        </div>
      )}

      {showEntry && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="nav-glass w-full max-w-md rounded-full p-1.5">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={busy || !wolffnOk || !oozleOk}
              onClick={handleSaveClick}
            >
              {busy
                ? "Wird gespeichert …"
                : !wolffnOk
                  ? "Wolffn-Entscheidung wählen"
                  : !oozleOk
                    ? "Oozle vervollständigen"
                    : isCorrection
                      ? `Korrektur Loch ${activeHole} speichern`
                      : completesMatch
                        ? "Letztes Loch speichern"
                        : `Loch ${activeHole} speichern`}
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-5"
          >
            <div className="max-w-md rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-page shadow-lg">
              {toast.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </Page>
  )
}
