import { ArrowRight, ChevronRight } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Avatar from "../components/Avatar"
import HomeInvitations from "../components/HomeInvitations"
import HomeLiveMatchCard from "../components/HomeLiveMatchCard"
import { useAuth } from "../context/AuthContext"
import useApi from "../hooks/useApi"
import useCurrentLiveMatch from "../hooks/useCurrentLiveMatch"
import useMatchHistory from "../hooks/useMatchHistory"
import { Button, Card, StatTile, TopBar } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass, getToParTextClass } from "../ui/scoreStyles.js"
import { formatCents, formatDate, formatSkinz, formatToPar } from "../utils/format.js"
import { getCompletedMatches, getMatchTitle, getModeLabel, getStandings } from "../utils/matchHistory.js"

function Section({ title, action, children }) {
  return (
    <section className="mt-9">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function NewRoundCard() {
  return (
    <Card variant="hero" className="p-5">
      <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-white/60">Neue Runde</div>
      <div className="mt-3 text-[2rem] font-bold leading-tight tracking-[-0.045em]">Bereit für den ersten Abschlag?</div>
      <p className="mt-2 text-sm font-medium text-white/60">Platz wählen, Einsatz festlegen und Mitspieler einladen.</p>
      <Link to="/round" className="btn btn-glass btn-lg mt-6 w-full justify-between">
        Runde starten
        <ArrowRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { match: liveMatch } = useCurrentLiveMatch()
  const { matches } = useMatchHistory()
  const { data: me } = useApi("/api/stats/me")
  const { data: board } = useApi("/api/stats/leaderboard?sort=earnings")
  const stats = me?.stats
  const lastMatch = getCompletedMatches(matches)[0] ?? null
  const lastResult = lastMatch ? getStandings(lastMatch, user?.id).find((player) => player.isMe) : null
  const topThree = (board?.rows ?? []).slice(0, 3)

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <TopBar
          right={
            <Link to="/profile" aria-label="Profil">
              <Avatar shortName={me?.profile?.shortName || user?.shortName} name={user?.displayName} color={me?.profile?.avatarColor} />
            </Link>
          }
        />

        <h1 className="mt-6 text-[clamp(2rem,9vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.045em]">
          Hallo {String(user?.displayName || "").split(" ")[0]}
        </h1>

        <HomeInvitations className="mt-7" />

        <div className="mt-7">{liveMatch ? <HomeLiveMatchCard match={liveMatch} /> : <NewRoundCard />}</div>

        {stats && stats.rounds > 0 && (
          <Section
            title={`Saison ${stats.season}`}
            action={
              <Link to="/profile" className="text-sm font-semibold text-ink">
                Statistik
              </Link>
            }
          >
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Platz" value={stats.position ?? "–"} />
              <StatTile
                label="Saldo"
                value={formatCents(stats.earningsCents, { signed: true })}
                valueClassName={cn("text-[1.3rem]", getMoneyTextClass(stats.earningsCents))}
              />
              <StatTile label="Skinz" value={stats.skinz} />
            </div>
          </Section>
        )}

        {lastMatch && lastResult && (
          <Section title="Letzte Runde">
            <button
              type="button"
              onClick={() => navigate(`/matches/${lastMatch.id}`)}
              className="surface flex w-full items-center justify-between gap-4 rounded-[18px] px-4 py-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold uppercase tracking-[0.02em] text-ink-mute">
                  {formatDate(lastMatch.completedAt)} · {getModeLabel(lastMatch)}
                </span>
                <span className="mt-1 block truncate text-[1.15rem] font-bold tracking-[-0.025em] text-ink">
                  {getMatchTitle(lastMatch)}
                </span>
                <span className="mt-1 block text-sm font-medium text-ink-mute">
                  Platz {lastResult.position} · {lastResult.totalStrokes} Schläge ·{" "}
                  <span className={getToParTextClass(lastResult.totalToPar)}>{formatToPar(lastResult.totalToPar)}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-right">
                  <span className={cn("block text-lg font-bold tabular-nums", getMoneyTextClass(lastResult.totalCents))}>
                    {formatCents(lastResult.totalCents, { signed: true })}
                  </span>
                  <span className="block text-xs font-semibold text-ink-mute">{formatSkinz(lastResult.skinz)}</span>
                </span>
                <ChevronRight size={18} className="text-ink-mute" aria-hidden="true" />
              </span>
            </button>
          </Section>
        )}

        <Section
          title="Leaderboard"
          action={
            <Link to="/leaderboard" className="text-sm font-semibold text-ink">
              Alle
            </Link>
          }
        >
          {topThree.length === 0 ? (
            <Card className="px-4 py-5 text-center text-sm font-medium text-ink-mute">
              Noch keine Runden in dieser Saison.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {topThree.map((row) => (
                <div
                  key={`${row.position}-${row.name}`}
                  className={cn(
                    "flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3 last:border-b-0",
                    row.isMe && "bg-fill"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-7 text-base font-bold tabular-nums text-ink">{row.position}</span>
                    <Avatar shortName={row.shortName} name={row.name} color={row.avatarColor} size="sm" />
                    <span className="truncate font-bold tracking-[-0.02em] text-ink">{row.name}</span>
                  </span>
                  <span className={cn("shrink-0 font-bold tabular-nums", getMoneyTextClass(row.earningsCents))}>
                    {formatCents(row.earningsCents, { signed: true })}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </Section>

        {!liveMatch && !lastMatch && (
          <Button variant="primary" size="lg" className="mt-9 w-full" onClick={() => navigate("/round")}>
            Erste Runde starten
          </Button>
        )}
      </div>
    </div>
  )
}
