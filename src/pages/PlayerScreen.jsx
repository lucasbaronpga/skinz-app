import { ChevronLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Avatar from "../components/Avatar"
import PlayerStats from "../components/PlayerStats"
import useApi from "../hooks/useApi"
import { Button, Card, EmptyState, StatTile } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass } from "../ui/scoreStyles.js"
import { formatCents } from "../utils/format.js"
import { formatHandicapIndex, formatSkinzHandicap } from "../utils/stats.js"

export default function PlayerScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading } = useApi(`/api/stats/player?id=${encodeURIComponent(id)}`)
  const profile = data?.profile

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Zurück"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>

        {loading && <p className="mt-10 text-center text-sm font-medium text-ink-mute">Wird geladen …</p>}

        {error && (
          <EmptyState
            className="mt-8"
            title="Spieler nicht verfügbar"
            description={error}
            action={
              <Button variant="primary" onClick={() => navigate("/leaderboard")}>
                Zum Leaderboard
              </Button>
            }
          />
        )}

        {profile && (
          <>
            <div className="mt-6 flex items-center gap-4">
              <Avatar shortName={profile.shortName} name={profile.displayName} color={profile.avatarColor} size="lg" />
              <div className="min-w-0">
                <h1 className="truncate text-[2rem] font-bold leading-tight tracking-[-0.045em]">{profile.displayName}</h1>
                <p className="text-[15px] font-medium text-ink-mute">
                  {[profile.shortName, profile.homeClubName].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <StatTile label="Skinz HCP" value={formatSkinzHandicap(profile.skinzHandicap)} />
              <StatTile label="Offizielles HCP" value={formatHandicapIndex(profile.handicapIndex)} />
            </div>

            {data.versusMe && (
              <Card className="mt-6 flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">Gegen dich</div>
                  <div className="mt-1 font-bold text-ink">
                    {data.versusMe.matches} {data.versusMe.matches === 1 ? "Match" : "Matches"} · {data.versusMe.wins}–
                    {data.versusMe.losses}
                  </div>
                </div>
                <div className={cn("text-xl font-bold tabular-nums", getMoneyTextClass(data.versusMe.balanceCents))}>
                  {formatCents(data.versusMe.balanceCents, { signed: true })}
                </div>
              </Card>
            )}

            {data.stats ? (
              <PlayerStats stats={data.stats} />
            ) : (
              <Card className="mt-9 px-4 py-5 text-center text-sm font-medium text-ink-mute">
                Die Statistik ist privat.
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
