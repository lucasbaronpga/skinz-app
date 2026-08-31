import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  UserX,
  X,
} from "lucide-react"
import AdminLayout from "./AdminLayout"
import { useAuth } from "../context/AuthContext"

const STATUS_OPTIONS = [
  { value: "all", label: "Alle Status" },
  { value: "pending", label: "Ausstehend" },
  { value: "active", label: "Aktiv" },
  { value: "blocked", label: "Gesperrt" },
]

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function normalizeIdentity(value) {
  return String(value ?? "").trim().toLowerCase()
}

function getStatusMeta(status) {
  if (status === "active") {
    return {
      label: "Aktiv",
      className: "bg-emerald-100 text-emerald-700",
    }
  }

  if (status === "blocked") {
    return {
      label: "Gesperrt",
      className: "bg-red-100 text-red-700",
    }
  }

  return {
    label: "Ausstehend",
    className: "bg-amber-100 text-amber-700",
  }
}

function getActionMeta(nextStatus, currentStatus) {
  if (nextStatus === "blocked") {
    return {
      eyebrow: "Benutzer sperren",
      title: "Zugriff wirklich sperren?",
      description:
        "Der Benutzer kann sich anschließend nicht mehr anmelden. Bestehende Sitzungen werden beendet.",
      confirmLabel: "Benutzer sperren",
      confirmClassName:
        "bg-red-500 text-white shadow-[0_16px_38px_rgba(239,68,68,0.24)] hover:bg-red-600",
      iconClassName: "bg-red-100 text-red-600",
      Icon: UserX,
    }
  }

  if (currentStatus === "blocked") {
    return {
      eyebrow: "Benutzer reaktivieren",
      title: "Zugriff wieder freigeben?",
      description:
        "Der Benutzer erhält wieder Zugriff und kann sich erneut bei Skinz anmelden.",
      confirmLabel: "Benutzer reaktivieren",
      confirmClassName:
        "bg-emerald-500 text-white shadow-[0_16px_38px_rgba(16,185,129,0.24)] hover:bg-emerald-600",
      iconClassName: "bg-emerald-100 text-emerald-700",
      Icon: UserCheck,
    }
  }

  return {
    eyebrow: "Registrierung freigeben",
    title: "Benutzer wirklich freigeben?",
    description:
      "Die Registrierung wird aktiviert. Der Benutzer kann sich anschließend bei Skinz anmelden.",
    confirmLabel: "Benutzer freigeben",
    confirmClassName:
      "bg-emerald-500 text-white shadow-[0_16px_38px_rgba(16,185,129,0.24)] hover:bg-emerald-600",
    iconClassName: "bg-emerald-100 text-emerald-700",
    Icon: UserCheck,
  }
}

export default function AdminUsersScreen() {
  const { user: authenticatedUser } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [activeUserId, setActiveUserId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/users", {
        credentials: "same-origin",
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || "Benutzer konnten nicht geladen werden.")
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Benutzer konnten nicht geladen werden."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadUsers()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadUsers])

  useEffect(() => {
    if (!pendingAction) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape" && !activeUserId) {
        setPendingAction(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [activeUserId, pendingAction])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de")

    return users.filter((user) => {
      const matchesStatus = status === "all" || user.status === status
      const haystack = [
        user.displayName,
        user.name,
        user.email,
        user.homeClubName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("de")

      return matchesStatus && (!term || haystack.includes(term))
    })
  }, [search, status, users])

  const counts = useMemo(
    () => ({
      total: users.length,
      pending: users.filter((user) => user.status === "pending").length,
      active: users.filter((user) => user.status === "active").length,
      blocked: users.filter((user) => user.status === "blocked").length,
    }),
    [users]
  )

  function isOwnAccount(user) {
    const sameId =
      user?.id !== undefined &&
      authenticatedUser?.id !== undefined &&
      String(user.id) === String(authenticatedUser.id)
    const sameEmail =
      normalizeIdentity(user?.email) &&
      normalizeIdentity(user?.email) === normalizeIdentity(authenticatedUser?.email)

    return Boolean(user?.isCurrentUser || sameId || sameEmail)
  }

  function requestUserUpdate(user, nextStatus) {
    if (isOwnAccount(user) && nextStatus === "blocked") return

    setErrorMessage("")
    setSuccessMessage("")
    setPendingAction({ user, nextStatus })
  }

  async function confirmUserUpdate() {
    if (!pendingAction || activeUserId) return

    const { user, nextStatus } = pendingAction

    if (isOwnAccount(user) && nextStatus === "blocked") {
      setPendingAction(null)
      setErrorMessage("Das eigene Administratorkonto kann nicht gesperrt werden.")
      return
    }

    setActiveUserId(user.id)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const response = await fetch("/api/admin/users/status", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          status: nextStatus,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || "Benutzer konnte nicht aktualisiert werden.")
      }

      setUsers((current) =>
        current.map((item) => (item.id === user.id ? data.user : item))
      )
      setSuccessMessage(data.message || "Benutzer wurde aktualisiert.")
      setPendingAction(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Benutzer konnte nicht aktualisiert werden."
      )
    } finally {
      setActiveUserId(null)
    }
  }

  const actionMeta = pendingAction
    ? getActionMeta(pendingAction.nextStatus, pendingAction.user.status)
    : null

  return (
    <AdminLayout>
      <section className="rounded-[32px] border border-white/70 bg-white/50 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Benutzer
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Registrierungen prüfen, freigeben, sperren und reaktivieren.
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="flex h-12 items-center justify-center gap-2 rounded-[20px] bg-[#071819] px-5 text-sm font-black text-white disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={isLoading ? "animate-spin" : ""}
            />
            Aktualisieren
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Gesamt", counts.total],
            ["Ausstehend", counts.pending],
            ["Aktiv", counts.active],
            ["Gesperrt", counts.blocked],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-white/80 bg-white/70 p-4 text-center"
            >
              <div className="text-2xl font-black text-slate-950">{value}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[32px] border border-white/70 bg-white/45 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
        <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
          <label className="relative block">
            <span className="sr-only">Benutzer suchen</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name oder E-Mail suchen"
              className="h-13 w-full rounded-[20px] border border-white/80 bg-white/80 pl-12 pr-4 text-sm font-bold text-slate-950 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-13 rounded-[20px] border border-white/80 bg-white/80 px-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800"
          >
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center">
            <LoaderCircle size={30} className="animate-spin text-emerald-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/55 p-8 text-center">
            <UserRoundCog className="mx-auto text-slate-300" size={36} />
            <h2 className="mt-4 text-lg font-black text-slate-800">
              Keine Benutzer gefunden
            </h2>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredUsers.map((user) => {
              const statusMeta = getStatusMeta(user.status)
              const ownAccount = isOwnAccount(user)
              const isUpdating = activeUserId === user.id

              return (
                <article
                  key={user.id}
                  className="rounded-[26px] border border-white/80 bg-white/75 p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-lg font-black text-slate-950">
                          {user.displayName || user.name || "Unbekannt"}
                        </h2>
                        {user.role === "admin" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                            <ShieldCheck size={11} />
                            Admin
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-sm font-semibold text-slate-500">
                        {user.email}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        HCP {user.handicapIndex ?? "–"} ·{" "}
                        {user.homeClubName || "Kein Heimatclub"}
                      </p>
                    </div>

                    <div className="flex w-full gap-2 sm:w-auto">
                      {user.status !== "active" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => requestUserUpdate(user, "active")}
                          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[18px] bg-emerald-500 px-4 text-sm font-black text-white disabled:opacity-45 sm:flex-none"
                        >
                          {isUpdating ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <UserCheck size={17} />
                          )}
                          {user.status === "blocked"
                            ? "Reaktivieren"
                            : "Freigeben"}
                        </button>
                      )}

                      {user.status === "active" && !ownAccount && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => requestUserUpdate(user, "blocked")}
                          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[18px] bg-red-50 px-4 text-sm font-black text-red-600 disabled:opacity-45 sm:flex-none"
                        >
                          {isUpdating ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <UserX size={17} />
                          )}
                          Sperren
                        </button>
                      )}

                      {ownAccount && (
                        <span className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[18px] bg-emerald-50 px-4 text-sm font-black text-emerald-700 sm:flex-none">
                          <CheckCircle2 size={17} />
                          Eigenes Konto
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {pendingAction && actionMeta && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071819]/55 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10 backdrop-blur-xl sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-action-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !activeUserId) {
              setPendingAction(null)
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-[38px] border border-white/70 bg-white/90 p-5 shadow-[0_32px_90px_rgba(7,24,25,0.34)] backdrop-blur-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] ${actionMeta.iconClassName}`}
              >
                <actionMeta.Icon size={25} />
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={Boolean(activeUserId)}
                aria-label="Dialog schließen"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                {actionMeta.eyebrow}
              </p>
              <h2
                id="user-action-title"
                className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950"
              >
                {actionMeta.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                {actionMeta.description}
              </p>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/80 bg-white/75 p-4 shadow-sm">
              <div className="break-words text-lg font-black text-slate-950">
                {pendingAction.user.displayName ||
                  pendingAction.user.name ||
                  "Unbekannt"}
              </div>
              <div className="mt-1 break-all text-sm font-semibold text-slate-500">
                {pendingAction.user.email}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={confirmUserUpdate}
                disabled={Boolean(activeUserId)}
                className={`flex min-h-14 w-full items-center justify-between rounded-[22px] px-5 text-left text-sm font-black transition active:scale-[0.99] disabled:opacity-45 ${actionMeta.confirmClassName}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                    {activeUserId ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <actionMeta.Icon size={18} />
                    )}
                  </span>
                  <span className="truncate">
                    {activeUserId
                      ? "Wird gespeichert..."
                      : actionMeta.confirmLabel}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="ml-4 text-xl font-black leading-none"
                >
                  →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={Boolean(activeUserId)}
                className="min-h-12 w-full rounded-[20px] px-5 text-sm font-black text-slate-500 transition hover:bg-slate-100/80 active:scale-[0.99] disabled:opacity-40"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
