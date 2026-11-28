import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Avatar from "../components/Avatar"
import { Button, Card, Chip, ConfirmDialog, EmptyState, Pill, ScreenHeader, StatTile } from "../ui/index.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { formatDate } from "../utils/format.js"

const STATUS_PILLS = {
  pending: { tone: "warning", label: "Wartet" },
  active: { tone: "positive", label: "Aktiv" },
  blocked: { tone: "negative", label: "Gesperrt" },
}

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "pending", label: "Wartend" },
  { value: "active", label: "Aktiv" },
  { value: "blocked", label: "Gesperrt" },
]

const ACTION_COPY = {
  approve: {
    title: "Benutzer freigeben?",
    description: (name) => `${name} kann sich danach anmelden und mitspielen.`,
    confirmLabel: "Freigeben",
    done: (name) => `${name} wurde freigegeben.`,
    tone: "default",
  },
  block: {
    title: "Benutzer sperren?",
    description: (name) =>
      `${name} wird sofort abgemeldet und kann sich nicht mehr anmelden. Gespielte Matches bleiben erhalten.`,
    confirmLabel: "Sperren",
    done: (name) => `${name} wurde gesperrt.`,
    tone: "danger",
  },
  reactivate: {
    title: "Benutzer reaktivieren?",
    description: (name) => `${name} kann sich danach wieder anmelden.`,
    confirmLabel: "Reaktivieren",
    done: (name) => `${name} wurde reaktiviert.`,
    tone: "default",
  },
}

/** Welche Aktionen für einen Benutzer angeboten werden (Admins und das eigene Konto: keine). */
function getAvailableActions(user) {
  if (user.role === "admin" || user.isMe) return []
  if (user.status === "pending") return ["approve", "block"]
  if (user.status === "active") return ["block"]
  if (user.status === "blocked") return ["reactivate"]

  return []
}

function describeActivity(user) {
  const parts = [`Registriert ${formatDate(user.createdAt)}`]

  parts.push(user.lastLoginAt ? `zuletzt angemeldet ${formatDate(user.lastLoginAt)}` : "noch nie angemeldet")

  if (user.completedMatches > 0) {
    parts.push(`${user.completedMatches} ${user.completedMatches === 1 ? "Match" : "Matches"}`)
  }

  return parts.join(" · ")
}

function UserRow({ user, busy, onAction }) {
  const pill = user.role === "admin" ? { tone: "dark", label: "Admin" } : STATUS_PILLS[user.status]
  const actions = getAvailableActions(user)

  return (
    <div className="border-b border-line/10 px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar shortName={user.shortName} name={user.displayName} size="md" />
          <div className="min-w-0">
            <div className="truncate font-bold tracking-[-0.02em] text-ink">
              {user.displayName}
              {user.isMe && <span className="font-medium text-ink-mute"> (du)</span>}
            </div>
            <div className="break-all text-sm font-medium text-ink-mute">{user.email}</div>
            <div className="mt-1 text-xs font-medium leading-relaxed text-ink-mute">{describeActivity(user)}</div>
          </div>
        </div>
        {pill && <Pill tone={pill.tone}>{pill.label}</Pill>}
      </div>

      {actions.length > 0 && (
        <div className="mt-3 flex gap-2">
          {actions.map((action, index) => (
            <Button
              key={action}
              variant={index === 0 && action !== "block" ? "primary" : "glass"}
              className={`flex-1 ${action === "block" ? "text-red-600" : ""}`}
              disabled={busy}
              onClick={() => onAction(action, user)}
            >
              {ACTION_COPY[action].confirmLabel}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminUsersScreen() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [notice, setNotice] = useState("")

  const loadUsers = useCallback(() => {
    return apiRequest("/api/auth/admin-users")
      .then((data) => {
        setUsers(Array.isArray(data.users) ? data.users : [])
        setLoadError("")
      })
      .catch((error) => setLoadError(getErrorMessage(error, "Benutzer konnten nicht geladen werden.")))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const counts = useMemo(
    () => ({
      pending: users.filter((user) => user.status === "pending").length,
      active: users.filter((user) => user.status === "active").length,
      blocked: users.filter((user) => user.status === "blocked").length,
    }),
    [users]
  )

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de")

    return users.filter((user) => {
      if (filter !== "all" && user.status !== filter) return false

      return (
        !term ||
        [user.displayName, user.shortName, user.email].filter(Boolean).join(" ").toLocaleLowerCase("de").includes(term)
      )
    })
  }, [filter, search, users])

  async function handleConfirm() {
    if (!dialog) return

    const { action, user } = dialog

    setBusy(true)
    setActionError("")
    setNotice("")

    try {
      const data = await apiRequest("/api/auth/admin-user-status", {
        method: "POST",
        body: { userId: user.id, action },
      })

      setUsers((current) =>
        current.map((entry) => (entry.id === user.id ? { ...entry, ...data.user } : entry))
      )
      setNotice(ACTION_COPY[action].done(user.displayName))
    } catch (error) {
      setActionError(getErrorMessage(error))

      if (error?.code === "STATUS_CHANGED") loadUsers()
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(3rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Zurück zum Profil"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>

        <ScreenHeader
          className="mt-5"
          eyebrow="Administration"
          title="Benutzer"
          subtitle="Registrierungen freigeben und Konten verwalten. Golfplätze und Matches pflegst du in der Admin-App am PC."
        />

        <div className="mt-6 grid grid-cols-3 gap-2">
          <StatTile label="Wartend" value={counts.pending} valueClassName={counts.pending > 0 ? "text-amber-600" : ""} />
          <StatTile label="Aktiv" value={counts.active} />
          <StatTile label="Gesperrt" value={counts.blocked} />
        </div>

        <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((option) => (
            <Chip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </Chip>
          ))}
        </div>

        <label className="surface mt-4 flex items-center gap-3 rounded-2xl px-4">
          <Search size={18} className="shrink-0 text-ink-mute" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, Kürzel oder E-Mail suchen"
            aria-label="Benutzer suchen"
            className="h-12 w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-mute"
          />
        </label>

        {notice && (
          <div role="status" className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {notice}
          </div>
        )}

        {actionError && (
          <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}

        {isLoading && <p className="mt-10 text-center text-sm font-medium text-ink-mute">Benutzer werden geladen …</p>}

        {!isLoading && loadError && (
          <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {loadError}{" "}
            <button type="button" onClick={loadUsers} className="underline">
              Erneut versuchen
            </button>
          </div>
        )}

        {!isLoading && !loadError && visibleUsers.length === 0 && (
          <EmptyState
            className="mt-6"
            title={users.length === 0 ? "Noch keine Benutzer" : "Nichts gefunden"}
            description={
              filter === "pending" && !search.trim()
                ? "Niemand wartet gerade auf eine Freigabe."
                : "Passe Filter oder Suche an."
            }
          />
        )}

        {visibleUsers.length > 0 && (
          <Card className="mt-6 overflow-hidden">
            {visibleUsers.map((user) => (
              <UserRow key={user.id} user={user} busy={busy} onAction={(action, target) => setDialog({ action, user: target })} />
            ))}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog ? ACTION_COPY[dialog.action].title : ""}
        description={dialog ? ACTION_COPY[dialog.action].description(dialog.user.displayName) : ""}
        confirmLabel={dialog ? ACTION_COPY[dialog.action].confirmLabel : ""}
        tone={dialog ? ACTION_COPY[dialog.action].tone : "default"}
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
