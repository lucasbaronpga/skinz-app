import {
  ArrowLeft,
  Flag,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import AdminLayout from "./AdminLayout"

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function normalizeHole(hole) {
  return {
    id: hole.id,
    holeNumber: Number(hole.holeNumber),
    par: Number(hole.par),
    handicapIndex: Number(hole.handicapIndex),
  }
}

function normalizeGolfCourse(golfCourse) {
  return {
    ...golfCourse,
    holeCount: Number(golfCourse.holeCount),
    parTotal:
      golfCourse.parTotal === null || golfCourse.parTotal === undefined
        ? null
        : Number(golfCourse.parTotal),
  }
}

export default function AdminGolfCourseScreen() {
  const { clubId, courseId } = useParams()
  const [golfCourse, setGolfCourse] = useState(null)
  const [holes, setHoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const loadGolfCourse = useCallback(
    async ({ showRefreshIndicator = false } = {}) => {
      setErrorMessage("")

      if (showRefreshIndicator) {
        setIsRefreshing(true)
      }

      try {
        const query = new URLSearchParams({ clubId, courseId })
        const response = await fetch(`/api/admin/golf-courses?${query}`, {
          credentials: "same-origin",
        })
        const data = await readJson(response)

        if (!response.ok) {
          throw new Error(data.error || "Platz konnte nicht geladen werden.")
        }

        setGolfCourse(normalizeGolfCourse(data.golfCourse))
        setHoles(
          Array.isArray(data.holes) ? data.holes.map(normalizeHole) : []
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Platz konnte nicht geladen werden."
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [clubId, courseId]
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadGolfCourse()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadGolfCourse])

  const parTotal = useMemo(
    () => holes.reduce((total, hole) => total + Number(hole.par || 0), 0),
    [holes]
  )

  const duplicateHandicapIndexes = useMemo(() => {
    const counts = new Map()

    holes.forEach((hole) => {
      const value = Number(hole.handicapIndex)
      counts.set(value, (counts.get(value) || 0) + 1)
    })

    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([value]) => value)
    )
  }, [holes])

  function updateHole(holeNumber, field, value) {
    setSuccessMessage("")
    setHoles((current) =>
      current.map((hole) =>
        hole.holeNumber === holeNumber
          ? { ...hole, [field]: Number(value) }
          : hole
      )
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    const normalizedHoles = holes.map(
      ({ holeNumber, par, handicapIndex }) => ({
        holeNumber: Number(holeNumber),
        par: Number(par),
        handicapIndex: Number(handicapIndex),
      })
    )

    if (normalizedHoles.length !== Number(golfCourse.holeCount)) {
      setErrorMessage(
        `Es wurden ${normalizedHoles.length} von ${Number(golfCourse.holeCount)} Lochdatensätzen geladen. Bitte die Lochdaten neu laden.`
      )
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/golf-courses", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          golfClubId: clubId,
          courseId,
          holes: normalizedHoles,
        }),
      })
      const data = await readJson(response)

      if (!response.ok) {
        throw new Error(data.error || "Lochdaten konnten nicht gespeichert werden.")
      }

      setHoles(
        Array.isArray(data.holes) ? data.holes.map(normalizeHole) : holes
      )
      setGolfCourse((current) => ({
        ...current,
        parTotal: data.golfCourse?.parTotal ?? parTotal,
      }))
      setSuccessMessage("Par und Handicap-Indizes wurden gespeichert.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Lochdaten konnten nicht gespeichert werden."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminLayout>
      <section className="rounded-[32px] border border-white/70 bg-white/50 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
        <Link
          to={`/admin/courses/${clubId}`}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700"
        >
          <ArrowLeft size={16} />
          Zurück zum Golfclub
        </Link>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center">
            <LoaderCircle size={30} className="animate-spin text-emerald-600" />
          </div>
        ) : golfCourse ? (
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Platz
              </p>
              <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                {golfCourse.name}
              </h1>
              <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                <Flag size={16} />
                <span>{golfCourse.holeCount} Löcher</span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="min-w-24 rounded-[20px] bg-white/75 px-4 py-3 text-center">
                <div className="text-xl font-black text-slate-950">{parTotal}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Gesamt-Par
                </div>
              </div>
              <span className="flex min-h-8 items-center justify-center self-start rounded-full bg-emerald-100 px-4 py-1 text-center text-[10px] font-black uppercase tracking-widest text-emerald-700">
                {golfCourse.isActive ? "Aktiv" : "Inaktiv"}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {errorMessage && (
        <div role="alert" className="mt-5 rounded-[24px] border border-red-200 bg-red-50/90 px-5 py-4 text-center text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-center text-sm font-bold text-emerald-800">
          {successMessage}
        </div>
      )}

      {!isLoading && golfCourse && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-[32px] border border-white/70 bg-white/45 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Lochverwaltung
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Par & Handicap
              </h2>
            </div>

            <button
              type="button"
              onClick={() => loadGolfCourse({ showRefreshIndicator: true })}
              disabled={isRefreshing || isSaving}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-slate-600 shadow-sm disabled:opacity-50"
              aria-label="Lochdaten neu laden"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {holes.map((hole) => {
              const hasDuplicate = duplicateHandicapIndexes.has(
                Number(hole.handicapIndex)
              )

              return (
                <fieldset key={hole.id || hole.holeNumber} className="rounded-[24px] border border-white/80 bg-white/75 p-4 shadow-sm">
                  <legend className="sr-only">Loch {hole.holeNumber}</legend>
                  <div className="grid grid-cols-[56px_1fr_1fr] items-end gap-3">
                    <div className="flex h-14 items-center justify-center rounded-[18px] bg-[#071819] text-xl font-black text-white">
                      {hole.holeNumber}
                    </div>

                    <label className="text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Par
                      <select
                        value={hole.par}
                        onChange={(event) => updateHole(hole.holeNumber, "par", event.target.value)}
                        disabled={isSaving}
                        className="mt-2 h-14 w-full rounded-[18px] border border-slate-200 bg-white px-3 text-center text-lg font-black text-slate-950 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      >
                        {[3, 4, 5, 6].map((par) => (
                          <option key={par} value={par}>{par}</option>
                        ))}
                      </select>
                    </label>

                    <label className={`text-center text-[10px] font-black uppercase tracking-wider ${hasDuplicate ? "text-red-600" : "text-slate-500"}`}>
                      HCP
                      <select
                        value={hole.handicapIndex}
                        onChange={(event) => updateHole(hole.holeNumber, "handicapIndex", event.target.value)}
                        disabled={isSaving}
                        className={`mt-2 h-14 w-full rounded-[18px] border bg-white px-3 text-center text-lg font-black text-slate-950 outline-none focus:ring-4 ${hasDuplicate ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-emerald-400 focus:ring-emerald-100"}`}
                      >
                        {Array.from({ length: 18 }, (_, index) => index + 1).map((handicapIndex) => (
                          <option key={handicapIndex} value={handicapIndex}>{handicapIndex}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </fieldset>
              )
            })}
          </div>

          {duplicateHandicapIndexes.size > 0 && (
            <p className="mt-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
              Jeder Handicap-Index darf nur einmal vergeben werden.
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-emerald-500 px-5 text-sm font-black text-white shadow-lg shadow-emerald-900/10 transition-transform enabled:active:scale-[0.99] disabled:opacity-45"
          >
            {isSaving ? <LoaderCircle size={19} className="animate-spin" /> : <Save size={19} />}
            Lochdaten speichern
          </button>
        </form>
      )}
    </AdminLayout>
  )
}
