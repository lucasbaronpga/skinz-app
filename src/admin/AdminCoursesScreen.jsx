import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"
import AdminLayout from "./AdminLayout"

const EMPTY_FORM = {
  name: "",
  location: "",
  state: "",
  country: "Deutschland",
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export default function AdminCoursesScreen() {
  const [golfClubs, setGolfClubs] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const loadGolfClubs = useCallback(async () => {
    setErrorMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/golf-clubs?active=all", {
        credentials: "same-origin",
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || "Golfclubs konnten nicht geladen werden.")
      }

      setGolfClubs(Array.isArray(data.golfClubs) ? data.golfClubs : [])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Golfclubs konnten nicht geladen werden."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function loadInitialGolfClubs() {
      try {
        const response = await fetch("/api/admin/golf-clubs?active=all", {
          credentials: "same-origin",
        })
        const data = await readJson(response)

        if (!response.ok) {
          throw new Error(
            data.error || "Golfclubs konnten nicht geladen werden."
          )
        }

        if (!isCancelled) {
          setGolfClubs(Array.isArray(data.golfClubs) ? data.golfClubs : [])
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Golfclubs konnten nicht geladen werden."
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInitialGolfClubs()

    return () => {
      isCancelled = true
    }
  }, [])

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function closeForm() {
    if (isSubmitting) return

    setShowForm(false)
    setForm(EMPTY_FORM)
    setErrorMessage("")
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!form.name.trim()) {
      setErrorMessage("Bitte einen Namen für den Golfclub eingeben.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/golf-clubs", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || "Golfclub konnte nicht angelegt werden.")
      }

      setGolfClubs((current) =>
        [...current, data.golfClub].sort((first, second) =>
          first.name.localeCompare(second.name, "de")
        )
      )
      setSuccessMessage(`${data.golfClub.name} wurde angelegt.`)
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Golfclub konnte nicht angelegt werden."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName =
    "mt-2 h-13 w-full rounded-[20px] border border-white/80 bg-white/80 px-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"

  return (
    <AdminLayout>
      <section className="rounded-[32px] border border-white/70 bg-white/50 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700"
            >
              <ArrowLeft size={16} />
              Administration
            </Link>

            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Golfclubs & Plätze
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Golfclubs und ihre Plätze werden zentral in Neon verwaltet. Öffne
              einen Golfclub, um seine Plätze und Lochdaten zu bearbeiten.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current)
              setErrorMessage("")
              setSuccessMessage("")
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-[20px] bg-[#071819] px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition-transform active:scale-[0.98]"
          >
            {showForm ? <X size={19} /> : <Plus size={19} />}
            {showForm ? "Schließen" : "Golfclub anlegen"}
          </button>
        </div>
      </section>

      {showForm && (
        <section className="mt-5 rounded-[32px] border border-emerald-200/80 bg-emerald-50/70 p-5 shadow-lg shadow-emerald-900/5 backdrop-blur-3xl sm:p-7">
          <h2 className="text-xl font-black text-emerald-950">
            Neuer Golfclub
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <label className="block text-sm font-black text-slate-800 sm:col-span-2">
              Name
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Golfclub Musterstadt"
                autoComplete="organization"
                autoFocus
                disabled={isSubmitting}
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-black text-slate-800">
              Ort
              <input
                value={form.location}
                onChange={(event) => updateForm("location", event.target.value)}
                placeholder="Musterstadt"
                autoComplete="address-level2"
                disabled={isSubmitting}
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-black text-slate-800">
              Bundesland
              <input
                value={form.state}
                onChange={(event) => updateForm("state", event.target.value)}
                placeholder="Rheinland-Pfalz"
                autoComplete="address-level1"
                disabled={isSubmitting}
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-black text-slate-800 sm:col-span-2">
              Land
              <input
                value={form.country}
                onChange={(event) => updateForm("country", event.target.value)}
                placeholder="Deutschland"
                autoComplete="country-name"
                disabled={isSubmitting}
                className={inputClassName}
              />
            </label>

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting || !form.name.trim()}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[20px] bg-emerald-500 px-5 text-sm font-black text-white transition-transform enabled:active:scale-[0.98] disabled:opacity-45"
              >
                {isSubmitting && (
                  <LoaderCircle size={18} className="animate-spin" />
                )}
                Golfclub speichern
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={isSubmitting}
                className="h-12 rounded-[20px] border border-slate-200 bg-white/80 px-5 text-sm font-black text-slate-600 disabled:opacity-45"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </section>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 rounded-[24px] border border-red-200 bg-red-50/90 px-5 py-4 text-center text-sm font-bold text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-center text-sm font-bold text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      <section className="mt-5 rounded-[32px] border border-white/70 bg-white/45 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Neon Datenbank
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Golfclubs
            </h2>
          </div>

          <button
            type="button"
            onClick={loadGolfClubs}
            disabled={isLoading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-slate-600 shadow-sm disabled:opacity-50"
            aria-label="Golfclubs neu laden"
          >
            <RefreshCw
              size={18}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoaderCircle size={28} className="animate-spin text-emerald-600" />
          </div>
        ) : golfClubs.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/55 p-8 text-center">
            <Building2 className="mx-auto text-slate-300" size={32} />
            <h3 className="mt-4 text-lg font-black text-slate-800">
              Noch keine Golfclubs
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Lege den ersten Golfclub über die Schaltfläche oben an.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {golfClubs.map((club) => (
              <Link
                key={club.id}
                to={`/admin/courses/${club.id}`}
                aria-label={`${club.name} öffnen`}
                className="group block rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/5 focus-visible:ring-4 focus-visible:ring-emerald-200 active:scale-[0.99]"
              >
                <article>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-black text-slate-950">
                        {club.name}
                      </h3>

                      <div className="mt-2 flex items-start gap-2 text-sm font-bold text-slate-500">
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span className="break-words">
                          {[club.location, club.state, club.country]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`flex min-h-7 shrink-0 items-center justify-center rounded-full px-3 py-1 text-center text-[10px] font-black uppercase tracking-widest ${
                        club.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {club.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>

                  <div className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-[20px] bg-slate-950/[0.04] px-4 py-3 text-sm font-black text-slate-600 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-800">
                    <span className="break-words">
                      {club.activeCourseCount} aktive Plätze · {club.courseCount}{" "}
                      gesamt
                    </span>
                    <ChevronRight
                      size={19}
                      className="shrink-0 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
