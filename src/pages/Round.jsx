import {
  useMemo,
  useState,
} from "react"

import {
  useNavigate,
} from "react-router-dom"

import {
  motion,
} from "framer-motion"

import {
  ArrowRight,
  Euro,
  MapPin,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react"

import {
  useAuth,
} from "../context/AuthContext"

import {
  useGame,
} from "../context/GameContext"

export default function Round() {

  const navigate =
    useNavigate()

  const {
    user,
  } = useAuth()

  const {
    startMatch,
    activeMatchId,
    hasActiveMatch,

    courses,
    selectedCourseId,
    setSelectedCourseId,
    currentCourse,
  } = useGame()

  function normalizeName(
    value
  ) {

    return String(value || "")
      .trim()
      .toLowerCase()
  }

  function getCourseName(
    course
  ) {

    return (
      course?.name ||
      "Erster Golfclub Westpfalz"
    )
  }

  function getCourseLocation(
    course
  ) {

    return (
      course?.location ||
      "Westpfalz"
    )
  }

  function getCoursePar(
    course
  ) {

    return (
      course?.par ||
      72
    )
  }

  function getCourseMeta(
    course
  ) {

    return `${getCourseLocation(
      course
    )} · Par ${getCoursePar(
      course
    )}`
  }

  function buildInitialPlayers() {

    const userName =
      user?.name?.trim()

    if (!userName) {

      return [
        "Lucas",
        "Ben",
      ]
    }

    const defaultOpponent =
      normalizeName(userName) ===
      "ben"
        ? "Lucas"
        : "Ben"

    return [
      userName,
      defaultOpponent,
    ]
  }

  const [
    players,
    setPlayers,
  ] = useState(
    buildInitialPlayers
  )

  const [
    newPlayer,
    setNewPlayer,
  ] = useState("")

  const [
    stake,
    setStake,
  ] = useState(2)

  const uniquePlayers =
    useMemo(() => {

      const playerMap =
        new Map()

      players.forEach(
        (player) => {

          const trimmedName =
            player.trim()

          if (!trimmedName) {
            return
          }

          const key =
            normalizeName(
              trimmedName
            )

          if (!playerMap.has(key)) {

            playerMap.set(
              key,
              trimmedName
            )
          }

        }
      )

      return Array.from(
        playerMap.values()
      )

    }, [
      players,
    ])

  const canStart =
    uniquePlayers.length >= 2

  function addPlayer() {

    const name =
      newPlayer.trim()

    if (!name) {
      return
    }

    const alreadyExists =
      uniquePlayers.some(
        (player) =>
          normalizeName(player) ===
          normalizeName(name)
      )

    if (alreadyExists) {

      setNewPlayer("")
      return
    }

    setPlayers(
      (currentPlayers) => [
        ...currentPlayers,
        name,
      ]
    )

    setNewPlayer("")
  }

  function removePlayer(
    name
  ) {

    setPlayers(
      (currentPlayers) =>
        currentPlayers.filter(
          (player) =>
            normalizeName(player) !==
            normalizeName(name)
        )
    )
  }

  function handleStartMatch() {

    if (!canStart) {
      return
    }

    if (hasActiveMatch) {

      const confirmed =
        window.confirm(
          "Es läuft bereits ein Match. Neues Match starten und aktuelles Match überschreiben?"
        )

      if (!confirmed) {
        return
      }
    }

    const didStart =
      startMatch(
        uniquePlayers,
        stake,
        selectedCourseId
      )

    if (didStart) {
      navigate("/live")
    }
  }

  return (

    <div className="min-h-screen bg-[#f5f5f7] pb-36 pt-8 text-slate-950">

      <div className="mx-auto max-w-md px-5">

        {/* Header */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}
        >

          <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
            Match Setup
          </div>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Neue Runde
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-400">
            Wähle Golfplatz, Flight und
            Einsatz. Danach geht es
            direkt ins Live Scoring.
          </p>

        </motion.div>

        {/* Active Match Warning */}
        {hasActiveMatch && (

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: 0.03,
            }}

            className="mt-8 rounded-[30px] border border-amber-100 bg-white p-5 shadow-sm"
          >

            <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-500">
              Aktives Match
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Match läuft bereits
            </div>

            <div className="mt-2 text-sm font-bold leading-relaxed text-slate-400">
              Wenn du ein neues Match startest,
              wird das aktuelle Match überschrieben.
            </div>

          </motion.div>

        )}

        {/* Match ID */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            delay: 0.04,
          }}

          className="mt-8 rounded-[34px] border border-slate-100 bg-white p-5 shadow-sm"
        >

          <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Nächste Match ID
          </div>

          <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            {activeMatchId}
          </div>

          <div className="mt-2 text-sm font-bold text-slate-400">
            Diese ID wird beim Start der Runde verwendet.
          </div>

        </motion.div>

        {/* Golfplatz / Einsatz Hero */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            delay: 0.06,
          }}

          className="mt-6 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
        >

          <div className="p-8">

            {/* Golfplatz */}
            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <div className="flex items-center gap-2 text-slate-500">

                  <MapPin
                    size={16}
                  />

                  <div className="text-xs font-black uppercase tracking-[0.3em]">
                    Golfplatz
                  </div>

                </div>

                <div className="mt-4 truncate text-5xl font-black tracking-tight">
                  {getCourseName(
                    currentCourse
                  )}
                </div>

                <div className="mt-2 text-sm font-bold text-slate-400">
                  {getCourseMeta(
                    currentCourse
                  )}
                </div>

              </div>

              <div className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                Live
              </div>

            </div>

            {/* Einsatz */}
            <div className="mt-10 flex items-end justify-between">

              <div>

                <div className="flex items-center gap-2 text-slate-500">

                  <Euro
                    size={16}
                  />

                  <div className="text-xs font-black uppercase tracking-widest">
                    Einsatz pro Loch
                  </div>

                </div>

                <div className="mt-3 text-7xl font-black tracking-tight text-emerald-400">
                  {stake}€
                </div>

              </div>

              <div className="flex items-center gap-3">

                <motion.button
                  whileTap={{
                    scale: 0.9,
                  }}

                  onClick={() =>
                    setStake(
                      Math.max(
                        1,
                        stake - 1
                      )
                    )
                  }

                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl"
                >

                  <Minus
                    size={22}
                    strokeWidth={3}
                  />

                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.9,
                  }}

                  onClick={() =>
                    setStake(
                      stake + 1
                    )
                  }

                  className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
                >

                  <Plus
                    size={22}
                    strokeWidth={3}
                  />

                </motion.button>

              </div>

            </div>

          </div>

        </motion.div>

        {/* Golfplatz Auswahl */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            delay: 0.07,
          }}

          className="mt-8 rounded-[40px] bg-white p-6 shadow-sm"
        >

          <div className="flex items-center justify-between">

            <div>

              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Golfplatz
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Golfplatz wählen
              </div>

            </div>

            <div className="text-3xl">
              ⛳
            </div>

          </div>

          <div className="mt-6 space-y-3">

            {courses.map(
              (course) => {

                const isActive =
                  selectedCourseId ===
                  course.id

                return (

                  <motion.button
                    key={course.id}

                    whileTap={{
                      scale: 0.985,
                    }}

                    onClick={() =>
                      setSelectedCourseId(
                        course.id
                      )
                    }

                    className={`w-full rounded-[28px] border px-5 py-4 text-left shadow-sm transition-all ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-100 bg-white"
                    }`}
                  >

                    <div className="flex items-center justify-between gap-4">

                      <div className="min-w-0">

                        <div className="truncate text-2xl font-black tracking-tight text-slate-950">
                          {getCourseName(
                            course
                          )}
                        </div>

                        <div className="mt-1 text-sm font-bold text-slate-400">
                          {getCourseLocation(
                            course
                          )}
                        </div>

                      </div>

                      <div className="shrink-0 text-right">

                        <div className="text-3xl font-black text-slate-950">
                          {getCoursePar(
                            course
                          )}
                        </div>

                        <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                          Par
                        </div>

                      </div>

                    </div>

                    {isActive && (

                      <div className="mt-4 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                        Ausgewählt
                      </div>

                    )}

                  </motion.button>

                )
              }
            )}

          </div>

        </motion.div>

        {/* Players */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            delay: 0.1,
          }}

          className="mt-8 rounded-[40px] bg-white p-6 shadow-sm"
        >

          {/* Header */}
          <div className="flex items-center justify-between">

            <div>

              <div className="flex items-center gap-2 text-slate-400">

                <Users
                  size={18}
                />

                <div className="text-xs font-black uppercase tracking-[0.25em]">
                  Flight
                </div>

              </div>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Spieler
              </h2>

            </div>

            <div className="rounded-full border border-slate-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">

              {uniquePlayers.length} aktiv

            </div>

          </div>

          {/* Add Player */}
          <div className="mt-6 flex gap-3">

            <input
              value={newPlayer}

              onChange={(event) =>
                setNewPlayer(
                  event.target.value
                )
              }

              onKeyDown={(event) => {

                if (
                  event.key ===
                  "Enter"
                ) {
                  addPlayer()
                }
              }}

              placeholder="Spielername"

              className="h-16 min-w-0 flex-1 rounded-[26px] border border-slate-100 bg-white px-5 text-lg font-black text-slate-950 shadow-sm outline-none placeholder:text-slate-300 focus:border-emerald-400"
            />

            <motion.button
              whileTap={{
                scale: 0.92,
              }}

              onClick={addPlayer}

              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[26px] bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)]"
            >

              <Plus
                size={28}
                strokeWidth={3}
              />

            </motion.button>

          </div>

          {/* Player List */}
          <div className="mt-6 space-y-3">

            {uniquePlayers.length === 0 && (

              <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch keine Spieler hinzugefügt.
              </div>

            )}

            {uniquePlayers.map(
              (player) => {

                const isCurrentUser =
                  normalizeName(player) ===
                  normalizeName(user?.name)

                return (

                  <div
                    key={player}

                    className="flex items-center justify-between rounded-[30px] border border-slate-100 bg-white p-4 shadow-sm"
                  >

                    {/* Left */}
                    <div className="flex min-w-0 items-center gap-4">

                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black shadow-sm ${
                          isCurrentUser
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-950 text-white"
                        }`}
                      >

                        {player.charAt(0)}

                      </div>

                      <div className="min-w-0">

                        <div className="truncate text-2xl font-black tracking-tight text-slate-950">
                          {player}
                        </div>

                        <div className="mt-1 text-sm font-bold text-slate-400">

                          {isCurrentUser
                            ? "Du"
                            : "Aktiv im Match"}

                        </div>

                      </div>

                    </div>

                    {/* Remove */}
                    <motion.button
                      whileTap={{
                        scale: 0.9,
                      }}

                      onClick={() =>
                        removePlayer(
                          player
                        )
                      }

                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm"
                    >

                      <X
                        size={20}
                        strokeWidth={3}
                      />

                    </motion.button>

                  </div>

                )
              }
            )}

          </div>

        </motion.div>

        {/* Hint */}
        {!canStart && (

          <div className="mt-5 rounded-[28px] border border-red-100 bg-white p-5 text-center text-sm font-bold text-red-500 shadow-sm">
            Mindestens zwei unterschiedliche Spieler werden benötigt.
          </div>

        )}

        {/* Start Button */}
        <motion.button
          whileTap={{
            scale: 0.98,
          }}

          disabled={
            !canStart
          }

          onClick={
            handleStartMatch
          }

          className="mt-8 flex w-full items-center justify-between rounded-[34px] bg-emerald-500 px-6 py-6 text-xl font-black text-white shadow-[0_18px_45px_rgba(16,185,129,0.3)] disabled:opacity-40"
        >

          <span>
            {hasActiveMatch
              ? "Neues Match starten"
              : "Match starten"}
          </span>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">

            <ArrowRight
              size={24}
              strokeWidth={3}
            />

          </div>

        </motion.button>

      </div>

    </div>
  )
}