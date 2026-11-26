import { useMemo, useState } from "react"
import { ChevronRight, ClipboardList } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"
import useMatchHistory from "../hooks/useMatchHistory"
import { Button, Chip, EmptyState, Pill, ScreenHeader, StatTile } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass } from "../ui/scoreStyles.js"
import { formatCents, formatDate, formatSkinz } from "../utils/format.js"
import {
  getCompletedMatches,
  getMatchTitle,
  getModeLabel,
  getStandings,
  getWinnerLabel,
} from "../utils/matchHistory.js"

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "classic", label: "Classic" },
  { value: "professional", label: "Professional" },
  { value: "wolffn", label: "Wolffn" },
]

function MatchRow({ match, userId, onOpen }) {
  const me = getStandings(match, userId).find((player) => player.isMe)

  return (
    <button
      type="button"
      onClick={() => onOpen(match.id)}
      className="flex w-full items-start justify-between gap-4 border-b border-line/10 py-5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold uppercase tracking-[0.02em] text-ink-mute">
          {[formatDate(match.completedAt), getModeLabel(match), match.matchCode].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-2 block truncate text-[1.3rem] font-bold leading-[1.15] tracking-[-0.035em] text-ink">
          {getMatchTitle(match)}
        </span>
        <span className="mt-2 block text-sm font-medium text-ink-mute">
          Sieger: <span className="font-semibold text-ink">{getWinnerLabel(match)}</span> ·{" "}
          {match.players.length} Spieler · {formatCents(Math.round(match.stake * 100))} pro Skin
        </span>
      </span>
      <span className="flex shrink-0 items-start gap-2">
        {me && (
          <span className="text-right">
            <span className={cn("block text-lg font-bold tabular-nums tracking-[-0.02em]", getMoneyTextClass(me.totalCents))}>
              {formatCents(me.totalCents, { signed: true })}
            </span>
            <span className="block text-xs font-semibold text-ink-mute">{formatSkinz(me.skinz)}</span>
          </span>
        )}
        <ChevronRight size={18} className="mt-1 text-ink-mute" aria-hidden="true" />
      </span>
    </button>
  )
}

export default function MatchArchiveScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading, matches, error, reload } = useMatchHistory()
  const [filter, setFilter] = useState("all")

  const completed = useMemo(() => getCompletedMatches(matches), [matches])
  const live = matches.filter((match) => match.status === "active")
  const visible = filter === "all" ? completed : completed.filter((match) => match.gameMode === filter)

  const summary = useMemo(() => {
    const results = completed
      .map((match) => getStandings(match, user?.id).find((player) => player.isMe))
      .filter(Boolean)

    return {
      rounds: results.length,
      wins: results.filter((player) => player.position === "1").length,
      balanceCents: results.reduce((total, player) => total + player.totalCents, 0),
    }
  }, [completed, user?.id])

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <ScreenHeader eyebrow="Archiv" title="Runden" subtitle="Alle abgeschlossenen Matches mit Scorecard und Abrechnung." />

        {completed.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            <StatTile label="Runden" value={summary.rounds} />
            <StatTile label="Siege" value={summary.wins} />
            <StatTile
              label="Saldo"
              value={formatCents(summary.balanceCents, { signed: true })}
              valueClassName={cn("text-[1.3rem]", getMoneyTextClass(summary.balanceCents))}
            />
          </div>
        )}

        {live.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">Läuft gerade</h2>
            {live.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => navigate(`/live/${match.id}`)}
                className="surface flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ink">{getMatchTitle(match)}</span>
                  <span className="mt-1 block text-sm font-medium text-ink-mute">
                    {getModeLabel(match)} · {match.matchCode}
                  </span>
                </span>
                <Pill tone="positive">Live</Pill>
              </button>
            ))}
          </section>
        )}

        {completed.length > 0 && (
          <div className="-mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((option) => (
              <Chip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.label}
              </Chip>
            ))}
          </div>
        )}

        {loading && <p className="mt-10 text-center text-sm font-medium text-ink-mute">Runden werden geladen …</p>}

        {!loading && error && (
          <div role="alert" className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}{" "}
            <button type="button" onClick={reload} className="underline">
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && completed.length === 0 && (
          <EmptyState
            className="mt-8"
            icon={ClipboardList}
            title="Noch keine Runden"
            description="Sobald du ein Match abgeschlossen hast, erscheint es hier mit Scorecard und Abrechnung."
            action={
              <Button variant="primary" onClick={() => navigate("/round")}>
                Neue Runde
              </Button>
            }
          />
        )}

        {!loading && visible.length > 0 && (
          <div className="mt-4 border-t border-line/10">
            {visible.map((match) => (
              <MatchRow key={match.id} match={match} userId={user?.id} onOpen={(id) => navigate(`/matches/${id}`)} />
            ))}
          </div>
        )}

        {!loading && completed.length > 0 && visible.length === 0 && (
          <p className="mt-8 text-center text-sm font-medium text-ink-mute">Keine Runden in diesem Spielmodus.</p>
        )}
      </div>
    </div>
  )
}
