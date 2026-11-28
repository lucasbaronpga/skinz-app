import { useState } from "react"
import { ChevronRight, Trophy } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Avatar from "../components/Avatar"
import useApi from "../hooks/useApi"
import { Chip, EmptyState, ScreenHeader, Segmented } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass } from "../ui/scoreStyles.js"
import { formatCents, formatSkinz } from "../utils/format.js"
import { LEADERBOARD_SORTS, formatSkinzHandicap } from "../utils/stats.js"

function getValue(row, sort) {
  if (sort === "skinz") return { text: formatSkinz(row.skinz), className: "text-ink" }
  if (sort === "wins") return { text: `${row.wins} ${row.wins === 1 ? "Sieg" : "Siege"}`, className: "text-ink" }

  return { text: formatCents(row.earningsCents, { signed: true }), className: getMoneyTextClass(row.earningsCents) }
}

export default function LeaderboardScreen() {
  const navigate = useNavigate()
  const [sort, setSort] = useState("earnings")
  const [season, setSeason] = useState(null)
  const query = new URLSearchParams({ sort, ...(season ? { season: String(season) } : {}) })
  const { data, loading, error } = useApi(`/api/stats/leaderboard?${query}`)
  const rows = data?.rows ?? []
  const seasons = data?.seasons ?? []

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <ScreenHeader
          eyebrow={`Saison ${data?.season ?? ""}`}
          title="Leaderboard"
          subtitle="Alle Spieler der App im Kalenderjahr."
        />

        <Segmented className="mt-6" label="Sortierung" options={LEADERBOARD_SORTS} value={sort} onChange={setSort} />

        {seasons.length > 1 && (
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {seasons.map((year) => (
              <Chip key={year} selected={(season ?? data?.season) === year} onClick={() => setSeason(year)}>
                {year}
              </Chip>
            ))}
          </div>
        )}

        {loading && !data && <p className="mt-10 text-center text-sm font-medium text-ink-mute">Wird geladen …</p>}

        {error && (
          <div role="alert" className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {data && rows.length === 0 && (
          <EmptyState
            className="mt-8"
            icon={Trophy}
            title="Noch keine Runden"
            description="Sobald in dieser Saison ein Match abgeschlossen ist, erscheint hier die Rangliste."
          />
        )}

        {rows.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-[2.2rem_minmax(0,1fr)_auto] gap-3 border-b border-line/20 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
              <span>Pos</span>
              <span>Spieler</span>
              <span className="text-right">{LEADERBOARD_SORTS.find((option) => option.value === sort)?.label}</span>
            </div>
            {rows.map((row) => {
              const value = getValue(row, sort)
              const clickable = Boolean(row.userId)
              const content = (
                <>
                  <span className="text-base font-bold tabular-nums text-ink">{row.position}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar shortName={row.shortName} name={row.name} color={row.anonymous ? null : row.avatarColor} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[1.05rem] font-bold tracking-[-0.025em] text-ink">
                        {row.name}
                        {row.isMe && <span className="font-medium text-ink-mute"> (du)</span>}
                      </span>
                      <span className="block text-xs font-medium text-ink-mute">
                        {row.rounds} {row.rounds === 1 ? "Runde" : "Runden"}
                        {row.skinzHandicap !== null && ` · Skinz HCP ${formatSkinzHandicap(row.skinzHandicap)}`}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={cn("text-right font-bold tabular-nums", value.className)}>{value.text}</span>
                    {clickable && <ChevronRight size={16} className="text-ink-mute" aria-hidden="true" />}
                  </span>
                </>
              )
              const className = cn(
                "grid w-full grid-cols-[2.2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/10 px-1 py-3.5 text-left",
                row.isMe && "-mx-1 rounded-xl border-transparent bg-fill px-2"
              )

              return clickable ? (
                <button
                  key={`${row.position}-${row.userId}`}
                  type="button"
                  className={className}
                  onClick={() => navigate(row.isMe ? "/profile" : `/players/${row.userId}`)}
                >
                  {content}
                </button>
              ) : (
                <div key={`${row.position}-${row.name}`} className={className}>
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
