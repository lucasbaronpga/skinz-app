import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Flag,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import AdminLayout from "./AdminLayout"

const EMPTY_FORM = {
  name: "",
  holeCount: 18,
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export default function AdminGolfClubScreen() {
  const { clubId } = useParams()
  const [golfClub, setGolfClub] = useState(null)
  const [golfCourses, setGolfCourses] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const loadGolfClubAndCourses = useCallback(
    async ({ showRefreshIndicator = false } = {}) => {
      setErrorMessage("")

      if (showRefreshIndicator) {
        setIsRefreshing(true)
      }

      try {
        const [clubsResponse, coursesResponse] = await Promise.all([
          fetch("/api/admin/golf-clubs?active=all", {
            credentials: "same-origin",
          }),
          fetch(
            `/api/admin/golf-courses?clubId=${encodeURIComponent(clubId)}`,
            {
              credentials: "same-origin",
            }
          ),
        ])

        const [clubsData, coursesData] = await Promise.all([
          readJson(clubsResponse),
          readJson(coursesResponse),
        ])

        if (!clubsResponse.ok) {
          throw new Error(
            clubsData.error || "Golfclub konnte nicht geladen werden."
          )
        }

        if (!coursesResponse.ok) {
          throw new Error(
            coursesData.error || "Plätze konnten nicht geladen werden."
          )
        }

        const clubs = Array.isArray(clubsData.golfClubs)
          ? clubsData.golfClubs
          : []
        const selectedClub = clubs.find(
          (club) => String(club.id) === String(clubId)
        )

        if (!selectedClub) {
          throw new Error("Der ausgewählte Golfclub wurde nicht gefunden.")
        }

        setGolfClub(selectedClub)
        setGolfCourses(
          Array.isArray(coursesData.golfCourses)
            ? coursesData.golfCourses
            : []
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Golfclub und Plätze konnten nicht geladen werden."
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [clubId]
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadGolfClubAndCourses()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadGolfClubAndCourses])

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

    const name = form.name.trim()

    if (!name) {
      setErrorMessage("Bitte einen Namen für den Platz eingeben.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/golf-courses", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          golfClubId: clubId,
          name,
          holeCount: Number(form.holeCount),
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || "Platz konnte nicht angelegt werden.")
      }

      setGolfCourses((current) =>
        [...current, data.golfCourse].sort((first, second) =>
          first.name.localeCompare(second.name, "de")
        )
      )
      setSuccessMessage(
        `${data.golfCourse.name} wurde mit ${data.golfCourse.configuredHoleCount} Löchern angelegt.`
      )
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Platz konnte nicht angelegt werden."
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
        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700"
        >
          <ArrowLeft size={16} />
          Golfclubs & Plätze
        </Link>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center">
            <LoaderCircle size={30} className="animate-spin text-emerald-600" />
          </div>
        ) : golfClub ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Golfclub
                </p>
                <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  {golfClub.name}
                </h1>
                <div className="mt-3 flex items-start gap-2 text-sm font-bold text-slate-600">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span className="break-words">
                    {[golfClub.location, golfClub.state, golfClub.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </div>

              <span
                className={`flex min-h-8 items-center justify-center rounded-full px-4 py-1 text-center text-[10px] font-black uppercase tracking-widest ${
                  golfClub.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {golfClub.isActive ? "Aktiv" : "Inaktiv"}
              </span>
            </div>
          </div>
        ) : null}
      </section>

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

      {!isLoading && golfClub && (
        <>
          {showForm && (
            <section className="mt-5 rounded-[32px] border border-emerald-200/80 bg-emerald-50/70 p-5 shadow-lg shadow-emerald-900/5 backdrop-blur-3xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Neuer Datensatz
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-emerald-950">
                    Platz anlegen
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white/80 text-emerald-800 disabled:opacity-45"
                  aria-label="Formular schließen"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-5 grid gap-4 sm:grid-cols-2"
              >
                <label className="block text-sm font-black text-slate-800 sm:col-span-2">
                  Platzname
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Zum Beispiel Westplatz"
                    autoFocus
                    disabled={isSubmitting}
                    className={inputClassName}
                  />
                </label>

                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-black text-slate-800">
                    Lochanzahl
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {[9, 18].map((holeCount) => {
                      const isSelected = Number(form.holeCount) === holeCount

                      return (
                        <label
                          key={holeCount}
                          className={`flex min-h-16 cursor-pointer items-center justify-center rounded-[20px] border px-4 text-center text-sm font-black transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-900/10"
                              : "border-white/80 bg-white/80 text-slate-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="holeCount"
                            value={holeCount}
                            checked={isSelected}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                holeCount: Number(event.target.value),
                              }))
                            }
                            disabled={isSubmitting}
                            className="sr-only"
                          />
                          {holeCount} Löcher
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <p className="rounded-[20px] bg-white/70 px-4 py-3 text-xs font-bold leading-5 text-slate-600 sm:col-span-2">
                  Beim Speichern werden automatisch {form.holeCount} Löcher mit
                  Par 4 und fortlaufendem Handicap-Index angelegt. Par und
                  Handicap-Index können im nächsten Schritt gepflegt werden.
                </p>

                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !form.name.trim()}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[20px] bg-emerald-500 px-5 text-sm font-black text-white transition-transform enabled:active:scale-[0.98] disabled:opacity-45"
                  >
                    {isSubmitting && (
                      <LoaderCircle size={18} className="animate-spin" />
                    )}
                    Platz speichern
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

          <section className="mt-5 rounded-[32px] border border-white/70 bg-white/45 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Platzverwaltung
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Plätze
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    loadGolfClubAndCourses({ showRefreshIndicator: true })
                  }
                  disabled={isRefreshing || isSubmitting}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-slate-600 shadow-sm disabled:opacity-50"
                  aria-label="Plätze neu laden"
                >
                  <RefreshCw
                    size={18}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm((current) => !current)
                    setErrorMessage("")
                    setSuccessMessage("")
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#071819] px-4 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition-transform active:scale-[0.98]"
                >
                  {showForm ? <X size={18} /> : <Plus size={18} />}
                  {showForm ? "Schließen" : "Platz anlegen"}
                </button>
              </div>
            </div>

            {golfCourses.length === 0 ? (
              <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/55 p-8 text-center">
                <Building2 className="mx-auto text-slate-300" size={34} />
                <h3 className="mt-4 text-lg font-black text-slate-800">
                  Noch keine Plätze
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Lege den ersten 9- oder 18-Loch-Platz für {golfClub.name} an.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {golfCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/admin/courses/${clubId}/${course.id}`}
                    aria-label={`${course.name} öffnen`}
                    className="group block rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/5 focus-visible:ring-4 focus-visible:ring-emerald-200 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-black text-slate-950">
                          {course.name}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                          <Flag size={15} className="shrink-0" />
                          <span>{course.holeCount} Löcher</span>
                        </div>
                      </div>

                      <span
                        className={`flex min-h-7 shrink-0 items-center justify-center rounded-full px-3 py-1 text-center text-[10px] font-black uppercase tracking-widest ${
                          course.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {course.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-[18px] bg-slate-950/[0.04] px-3 py-3 text-center">
                        <div className="text-lg font-black text-slate-950">
                          {course.configuredHoleCount}
                        </div>
                        <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Angelegt
                        </div>
                      </div>
                      <div className="rounded-[18px] bg-slate-950/[0.04] px-3 py-3 text-center">
                        <div className="text-lg font-black text-slate-950">
                          {course.parTotal ?? "–"}
                        </div>
                        <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Gesamt-Par
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex min-h-11 items-center justify-between rounded-[18px] bg-emerald-50 px-4 text-sm font-black text-emerald-800 transition-colors group-hover:bg-emerald-100">
                      <span>Lochdaten pflegen</span>
                      <ChevronRight
                        size={18}
                        className="shrink-0 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  )
}
