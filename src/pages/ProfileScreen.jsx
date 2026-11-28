import { useState } from "react"
import { ChevronRight, FileText, LogOut, Pencil, ShieldCheck, Trash2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Avatar from "../components/Avatar"
import NotificationSettings from "../components/NotificationSettings"
import PlayerStats from "../components/PlayerStats"
import { useAuth } from "../context/AuthContext"
import useApi from "../hooks/useApi"
import { Button, Card, Chip, Segmented } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass } from "../ui/scoreStyles.js"
import { formatCents } from "../utils/format.js"
import { formatHandicapIndex, formatSkinzHandicap } from "../utils/stats.js"
import { getThemePreference, setThemePreference } from "../utils/theme.js"

const THEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
]

function Section({ title, children }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{title}</h2>
      {children}
    </section>
  )
}

function LinkRow({ to, icon: Icon, label, danger = false }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3.5 font-semibold last:border-b-0",
        danger ? "text-red-600" : "text-ink"
      )}
    >
      <span className="flex items-center gap-3">
        <Icon size={18} aria-hidden="true" />
        {label}
      </span>
      <ChevronRight size={18} className="text-ink-mute" aria-hidden="true" />
    </Link>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [season, setSeason] = useState(null)
  const [theme, setTheme] = useState(getThemePreference)
  const { data, error } = useApi(`/api/stats/me${season ? `?season=${season}` : ""}`)
  const profile = data?.profile
  const stats = data?.stats
  const isAdmin = user?.role === "admin"

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-4">
          <Avatar shortName={profile?.shortName || user?.shortName} name={user?.displayName} color={profile?.avatarColor} size="lg" />
          <Link to="/profile/edit" className="btn btn-glass" aria-label="Profil bearbeiten">
            <Pencil size={16} aria-hidden="true" />
            Bearbeiten
          </Link>
        </div>

        <h1 className="mt-5 text-[clamp(2rem,9vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.045em]">
          {profile?.displayName ?? user?.displayName}
        </h1>
        <p className="mt-2 text-[15px] font-medium text-ink-mute">
          {[profile?.shortName, profile?.homeClubName].filter(Boolean).join(" · ") || "Skinz-Spieler"}
        </p>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Card className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">Skinz HCP</div>
              <div className="mt-1.5 text-[1.9rem] font-bold leading-none tracking-[-0.04em] tabular-nums">
                {formatSkinzHandicap(stats.skinzHandicap)}
              </div>
              <div className="mt-1 text-xs font-medium text-ink-mute">
                {stats.skinzHandicap === null
                  ? `ab 3 Runden (${stats.skinzHandicapRounds}/3)`
                  : `aus ${Math.min(stats.skinzHandicapRounds, 10)} Runden`}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">Offizielles HCP</div>
              <div className="mt-1.5 text-[1.9rem] font-bold leading-none tracking-[-0.04em] tabular-nums">
                {formatHandicapIndex(profile?.handicapIndex)}
              </div>
              <div className="mt-1 text-xs font-medium text-ink-mute">selbst gepflegt</div>
            </Card>
          </div>
        )}

        {stats?.seasons?.length > 1 && (
          <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stats.seasons.map((year) => (
              <Chip key={year} selected={stats.season === year} onClick={() => setSeason(year)}>
                {year}
              </Chip>
            ))}
          </div>
        )}

        {stats && <PlayerStats stats={stats} />}

        {stats?.headToHead?.length > 0 && (
          <Section title="Head-to-Head">
            <Card className="overflow-hidden">
              {stats.headToHead.map((row) => {
                const content = (
                  <>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar shortName={row.shortName} name={row.name} color={row.anonymous ? null : row.avatarColor} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold tracking-[-0.02em] text-ink">{row.name}</span>
                        <span className="block text-xs font-medium text-ink-mute">
                          {row.matches} {row.matches === 1 ? "Match" : "Matches"} · {row.wins}–{row.losses}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={cn("font-bold tabular-nums", getMoneyTextClass(row.balanceCents))}>
                        {formatCents(row.balanceCents, { signed: true })}
                      </span>
                      {row.userId && <ChevronRight size={16} className="text-ink-mute" aria-hidden="true" />}
                    </span>
                  </>
                )
                const className = "flex w-full items-center justify-between gap-3 border-b border-line/10 px-4 py-3 text-left last:border-b-0"

                return row.userId ? (
                  <button key={row.userId} type="button" className={className} onClick={() => navigate(`/players/${row.userId}`)}>
                    {content}
                  </button>
                ) : (
                  <div key={row.name} className={className}>
                    {content}
                  </div>
                )
              })}
            </Card>
            <p className="mt-2 text-xs font-medium text-ink-mute">Bilanz aus Skinz-Differenz × Einsatz, ohne Oozle.</p>
          </Section>
        )}

        <Section title="Benachrichtigungen">
          <NotificationSettings />
        </Section>

        <Section title="Darstellung">
          <Segmented
            label="Farbmodus"
            options={THEME_OPTIONS}
            value={theme}
            onChange={(value) => {
              setThemePreference(value)
              setTheme(value)
            }}
          />
        </Section>

        <Section title="Konto">
          <Card className="overflow-hidden">
            {isAdmin && <LinkRow to="/admin" icon={ShieldCheck} label="Administration" />}
            <LinkRow to="/privacy" icon={FileText} label="Datenschutz" />
            {!isAdmin && <LinkRow to="/profile/delete" icon={Trash2} label="Konto löschen" danger />}
          </Card>
        </Section>

        <Button variant="glass" className="mt-6 w-full text-red-600" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" />
          Abmelden
        </Button>
      </div>
    </div>
  )
}
