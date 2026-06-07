import { useMemo, useState } from "react"

import { useNavigate } from "react-router-dom"

import { AnimatePresence, motion } from "framer-motion"

import AppBackground from "../components/AppBackground"

import { useAuth } from "../context/AuthContext"

import { GAME_MODES, useGame } from "../context/GameContext"

const MIN_STAKE = 0.1
const MAX_STAKE = 100

const STAKE_PRESETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function roundStake(value) {
  return Math.round(toNumber(value, MIN_STAKE) * 100) / 100
}

function formatStake(value) {
  const amount = roundStake(value)

  const hasCents = Math.abs(amount % 1) > 0

  if (hasCents) {
    return `${amount.toFixed(2).replace(".", ",")}€`
  }

  return `${amount.toFixed(0)}€`
}

function getCourseName(course) {
  return course?.name || "Erster Golfclub Westpfalz"
}

function getCoursePar(course) {
  return toNumber(course?.par, 72)
}

function clampStake(value) {
  const number = roundStake(value)

  if (!Number.isFinite(number)) {
    return MIN_STAKE
  }

  return roundStake(Math.min(Math.max(number, MIN_STAKE), MAX_STAKE))
}

function getPreviousStakePreset(currentStake) {
  const current = roundStake(currentStake)

  const previousPreset = [...STAKE_PRESETS]
    .reverse()
    .find((preset) => preset < current)

  return previousPreset || MIN_STAKE
}

function getNextStakePreset(currentStake) {
  const current = roundStake(currentStake)

  const nextPreset = STAKE_PRESETS.find((preset) => preset > current)

  return nextPreset || MAX_STAKE
}

function buildInitialPlayers(userName) {
  const cleanedUserName = userName?.trim()

  if (!cleanedUserName) {
    return ["Lucas", "Ben"]
  }

  const defaultOpponent = normalizeName(cleanedUserName) === "ben"
    ? "Lucas"
    : "Ben"

  return [cleanedUserName, defaultOpponent]
}

function getGameModeMeta(gameMode) {
  if (gameMode === GAME_MODES.PROFESSIONAL) {
    return {
      label: "Skinz Professional",
      shortLabel: "Pro",
      description: "Birdie zählt 2 Skinz, Eagle oder besser zählt 3 Skinz.",
    }
  }

  if (gameMode === GAME_MODES.WOLFFN) {
    return {
      label: "🐺 Wolffn",
      shortLabel: "🐺 Wolffn",
      description: "4 Spieler. Teams, Bestball und echter Champ-Modus.",
    }
  }

  return {
    label: "Classic Skinz",
    shortLabel: "Classic",
    description: "Jeder eindeutige Lochgewinn zählt 1 Skin.",
  }
}

function ModePill({ children, isDark = false }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl ${
        isDark
          ? "border border-white/15 bg-white/10 text-slate-200"
          : "border border-white/70 bg-white/[0.46] text-slate-600"
      }`}
    >
      {children}
    </span>
  )
}

export default function RoundSetupScreen() {
  const navigate = useNavigate()

  const { user } = useAuth()

  const {
    startMatch,
    activeMatchId,
    hasActiveMatch,
    courses,
    selectedCourseId,
    setSelectedCourseId,
    currentCourse,
  } = useGame()

  const safeCourses = Array.isArray(courses) ? courses : []

  const [players, setPlayers] = useState(() => buildInitialPlayers(user?.name))
  const [newPlayer, setNewPlayer] = useState("")
  const [stake, setStake] = useState(2)
  const [selectedGameMode, setSelectedGameMode] = useState(GAME_MODES.CLASSIC)
  const [showWolffnModal, setShowWolffnModal] = useState(false)

  const uniquePlayers = useMemo(() => {
    const playerMap = new Map()

    players.forEach((player) => {
      const trimmedName = String(player || "").trim()

      if (!trimmedName) {
        return
      }

      const key = normalizeName(trimmedName)

      if (!playerMap.has(key)) {
        playerMap.set(key, trimmedName)
      }
    })

    return Array.from(playerMap.values())
  }, [players])

  const cleanedNewPlayer = newPlayer.trim()

  const newPlayerAlreadyExists = uniquePlayers.some(
    (player) => normalizeName(player) === normalizeName(cleanedNewPlayer)
  )

  const canAddPlayer = cleanedNewPlayer.length > 0 && !newPlayerAlreadyExists

  const isProfessionalMode = selectedGameMode === GAME_MODES.PROFESSIONAL
  const isWolffnMode = selectedGameMode === GAME_MODES.WOLFFN

  const gameModeMeta = getGameModeMeta(selectedGameMode)

  const wolffnPlayerCountValid = uniquePlayers.length === 4

  const canStart = isWolffnMode
    ? wolffnPlayerCountValid
    : uniquePlayers.length >= 2

  function addPlayer() {
    if (!cleanedNewPlayer) {
      return
    }

    if (newPlayerAlreadyExists) {
      setNewPlayer("")
      return
    }

    setPlayers((currentPlayers) => [...currentPlayers, cleanedNewPlayer])

    setNewPlayer("")
  }

  function removePlayer(name) {
    setPlayers((currentPlayers) =>
      currentPlayers.filter(
        (player) => normalizeName(player) !== normalizeName(name)
      )
    )
  }

  function decreaseStake() {
    setStake((currentStake) => clampStake(getPreviousStakePreset(currentStake)))
  }

  function increaseStake() {
    setStake((currentStake) => clampStake(getNextStakePreset(currentStake)))
  }

  function selectGameMode(nextGameMode) {
    if (
      nextGameMode === GAME_MODES.WOLFFN &&
      selectedGameMode !== GAME_MODES.WOLFFN
    ) {
      setShowWolffnModal(true)
      return
    }

    setSelectedGameMode(nextGameMode)
  }

  function confirmWolffnMode() {
    setSelectedGameMode(GAME_MODES.WOLFFN)
    setShowWolffnModal(false)
  }

  function cancelWolffnMode() {
    setShowWolffnModal(false)
  }

  function handleStartMatch() {
    if (!canStart) {
      return
    }

    if (hasActiveMatch) {
      const confirmed = window.confirm(
        "Du bist noch auf der Runde. Neue Runde starten und aktuelle Runde überschreiben?"
      )

      if (!confirmed) {
        return
      }
    }

    const didStart = startMatch(
      uniquePlayers,
      stake,
      selectedCourseId,
      selectedGameMode
    )

    if (didStart) {
      navigate("/live")
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(13rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
          }}
          className="pt-8"
        >
          <div className="text-[12px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
            Match Setup
          </div>

          <h1 className="mt-3 text-[3.85rem] font-black leading-none tracking-[-0.07em] text-slate-950">
            Neue Runde
          </h1>

          <p className="mt-4 max-w-sm text-base font-semibold leading-relaxed tracking-[-0.02em] text-slate-600">
            Course, Flight, Einsatz und Spielmodus festlegen.
          </p>
        </motion.div>

        {hasActiveMatch && (
          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.03,
              duration: 0.35,
              ease: "easeOut",
            }}
            className="mt-8 rounded-[32px] border border-amber-200/70 bg-white/[0.52] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">
              Aktive Runde
            </div>

            <div className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
              Runde läuft bereits
            </div>

            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Wenn du eine neue Runde startest, wird die aktuelle Runde
              überschrieben.
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.06,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 overflow-hidden rounded-[38px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
        >
          <div className="relative p-8">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
            />

            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[12px] font-black uppercase tracking-[0.22em] text-emerald-200/85">
                    Course
                  </div>

                  <div className="mt-4 max-w-[260px] text-[2.55rem] font-black leading-none tracking-[-0.055em]">
                    {getCourseName(currentCourse)}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <ModePill isDark>{gameModeMeta.shortLabel}</ModePill>
                </div>
              </div>

              <div className="mt-10 flex items-end justify-between gap-5">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">
                    €/Skin
                  </div>

                  <div className="mt-3 text-[4.6rem] font-black leading-none tracking-[-0.075em] text-amber-300">
                    {formatStake(stake)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{
                      scale: 0.9,
                    }}
                    onClick={decreaseStake}
                    disabled={roundStake(stake) <= MIN_STAKE}
                    aria-label="Einsatz verringern"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-2xl font-black text-white backdrop-blur-xl transition disabled:opacity-30"
                  >
                    −
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{
                      scale: 0.9,
                    }}
                    onClick={increaseStake}
                    disabled={roundStake(stake) >= MAX_STAKE}
                    aria-label="Einsatz erhöhen"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white text-2xl font-black text-slate-950 shadow-sm transition disabled:opacity-40"
                  >
                    +
                  </motion.button>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Match
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-300">
                    {activeMatchId || "-"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Step
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-300">
                    {formatStake(getPreviousStakePreset(stake))} /{" "}
                    {formatStake(getNextStakePreset(stake))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.08,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Game Mode
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Spielmodus
              </div>
            </div>

            <ModePill>{gameModeMeta.shortLabel}</ModePill>
          </div>

          <div className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
            {gameModeMeta.description}
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => selectGameMode(GAME_MODES.CLASSIC)}
              className={`w-full rounded-[28px] border px-5 py-5 text-left transition ${
                selectedGameMode === GAME_MODES.CLASSIC
                  ? "border-emerald-300/70 bg-emerald-50/80"
                  : "border-white/70 bg-white/[0.48] backdrop-blur-xl"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl font-black tracking-[-0.035em] text-slate-950">
                    Classic Skinz
                  </div>

                  <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                    Jeder eindeutige Lochgewinn zählt 1 Skin.
                  </div>
                </div>

                <div
                  className={`h-5 w-5 shrink-0 rounded-full border ${
                    selectedGameMode === GAME_MODES.CLASSIC
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white/60"
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectGameMode(GAME_MODES.PROFESSIONAL)}
              className={`w-full rounded-[28px] border px-5 py-5 text-left transition ${
                selectedGameMode === GAME_MODES.PROFESSIONAL
                  ? "border-orange-300/70 bg-orange-50/85"
                  : "border-white/70 bg-white/[0.48] backdrop-blur-xl"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl font-black tracking-[-0.035em] text-slate-950">
                    Skinz Professional
                  </div>

                  <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                    Birdie zählt 2 Skinz, Eagle oder besser zählt 3 Skinz.
                  </div>
                </div>

                <div
                  className={`h-5 w-5 shrink-0 rounded-full border ${
                    selectedGameMode === GAME_MODES.PROFESSIONAL
                      ? "border-orange-500 bg-orange-500"
                      : "border-slate-300 bg-white/60"
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectGameMode(GAME_MODES.WOLFFN)}
              className={`w-full rounded-[28px] border px-5 py-5 text-left transition ${
                selectedGameMode === GAME_MODES.WOLFFN
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-white/70 bg-white/[0.48] text-slate-950 backdrop-blur-xl"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl font-black tracking-[-0.035em]">
                    🐺 Wolffn
                  </div>

                  <div
                    className={`mt-1 text-sm font-semibold leading-relaxed ${
                      selectedGameMode === GAME_MODES.WOLFFN
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    4 Spieler. Teams, Bestball und echter Champ-Modus.
                  </div>
                </div>

                <div
                  className={`h-5 w-5 shrink-0 rounded-full border ${
                    selectedGameMode === GAME_MODES.WOLFFN
                      ? "border-white bg-white"
                      : "border-slate-300 bg-white/60"
                  }`}
                />
              </div>
            </button>
          </div>

          {isWolffnMode && (
            <div className="mt-5 rounded-[24px] border border-slate-900/10 bg-slate-950 px-5 py-4 text-sm font-semibold leading-relaxed text-slate-300 shadow-sm">
              🐺 Wolffn braucht exakt 4 Spieler. Der erste Spieler am Loch
              entscheidet: Partner, Ablehnung oder allein gegen drei.
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Course
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Platz wählen
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Selected
              </div>

              <div className="mt-1 text-xl font-black text-slate-950">
                Par {getCoursePar(currentCourse)}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {safeCourses.length === 0 && (
              <div className="rounded-[26px] border border-white/70 bg-white/[0.42] p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                Keine Courses verfügbar.
              </div>
            )}

            {safeCourses.map((course) => {
              const isActive = selectedCourseId === course.id

              return (
                <motion.button
                  key={course.id}
                  type="button"
                  whileTap={{
                    scale: 0.985,
                  }}
                  onClick={() => setSelectedCourseId(course.id)}
                  aria-pressed={isActive}
                  className={`w-full rounded-[28px] border px-5 py-5 text-left transition ${
                    isActive
                      ? "border-emerald-300/70 bg-emerald-50/85"
                      : "border-white/70 bg-white/[0.42] backdrop-blur-xl"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-2xl font-black leading-tight tracking-[-0.035em] text-slate-950">
                        {getCourseName(course)}
                      </div>

                      <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        {isActive ? "Selected" : "Available"}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-4xl font-black leading-none text-slate-950">
                        {getCoursePar(course)}
                      </div>

                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Par
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.12,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Flight
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Mitspieler
              </div>
            </div>

            <div
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                isWolffnMode && !wolffnPlayerCountValid
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-white/70 bg-white/[0.46] text-slate-600"
              }`}
            >
              {uniquePlayers.length} aktiv
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <input
              id="new-player"
              value={newPlayer}
              onChange={(event) => setNewPlayer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addPlayer()
                }
              }}
              placeholder="Mitspieler"
              autoComplete="given-name"
              enterKeyHint="done"
              aria-label="Mitspieler hinzufügen"
              className="h-16 min-w-0 flex-1 rounded-[26px] border border-white/70 bg-white/[0.62] px-5 text-lg font-black text-slate-950 shadow-sm outline-none backdrop-blur-xl placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />

            <motion.button
              type="button"
              whileTap={{
                scale: canAddPlayer ? 0.92 : 1,
              }}
              onClick={addPlayer}
              disabled={!canAddPlayer}
              aria-label="Mitspieler hinzufügen"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[26px] bg-slate-950 text-3xl font-black text-white shadow-[0_14px_35px_rgba(15,23,42,0.25)] transition disabled:cursor-not-allowed disabled:opacity-35"
            >
              +
            </motion.button>
          </div>

          {cleanedNewPlayer && newPlayerAlreadyExists && (
            <div className="mt-3 rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-600">
              Dieser Spieler ist bereits im Flight.
            </div>
          )}

          {isWolffnMode && !wolffnPlayerCountValid && (
            <div className="mt-3 rounded-[22px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
              Wolffn braucht exakt 4 Spieler.
            </div>
          )}

          <div className="mt-6 space-y-3">
            {uniquePlayers.length === 0 && (
              <div className="rounded-[26px] border border-white/70 bg-white/[0.42] p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                Noch kein Flight zusammengestellt.
              </div>
            )}

            {uniquePlayers.map((player) => {
              const isCurrentUser =
                normalizeName(player) === normalizeName(user?.name)

              return (
                <div
                  key={player}
                  className="flex items-center justify-between rounded-[28px] border border-white/70 bg-white/[0.42] p-4 shadow-sm backdrop-blur-xl"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black uppercase shadow-sm ${
                        isCurrentUser
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-950 text-white"
                      }`}
                    >
                      {player.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-2xl font-black tracking-[-0.035em] text-slate-950">
                        {player}
                      </div>

                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        {isCurrentUser ? "Du" : "Im Flight"}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{
                      scale: 0.9,
                    }}
                    onClick={() => removePlayer(player)}
                    aria-label={`${player} entfernen`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white/70 text-xl font-black text-red-500 shadow-sm transition hover:bg-red-50"
                  >
                    ×
                  </motion.button>
                </div>
              )
            })}
          </div>
        </motion.div>

        {!canStart && (
          <div className="mt-5 rounded-[28px] border border-red-100 bg-white/[0.62] p-5 text-center text-sm font-bold text-red-500 shadow-sm backdrop-blur-xl">
            {isWolffnMode
              ? "Wolffn braucht exakt 4 Spieler."
              : "Mindestens zwei Mitspieler werden für eine Runde benötigt."}
          </div>
        )}

        <motion.button
          type="button"
          whileTap={{
            scale: canStart ? 0.98 : 1,
          }}
          disabled={!canStart}
          onClick={handleStartMatch}
          className={`mt-8 flex w-full items-center justify-between rounded-[34px] px-6 py-6 text-xl font-black text-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isWolffnMode
              ? "bg-slate-950"
              : isProfessionalMode
                ? "bg-orange-500"
                : "bg-emerald-500"
          }`}
        >
          <span>
            {hasActiveMatch
              ? "Neue Runde starten"
              : isWolffnMode
                ? "🐺 Wolffn starten"
                : isProfessionalMode
                  ? "Pro Runde starten"
                  : "Runde starten"}
          </span>

          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl">
            →
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showWolffnModal && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 30,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              className="w-full max-w-sm overflow-hidden rounded-[40px] border border-white/70 bg-white/[0.76] text-center shadow-2xl backdrop-blur-2xl"
            >
              <div className="p-8">
                <div
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-950 text-5xl shadow-[0_18px_45px_rgba(15,23,42,0.24)]"
                  aria-hidden="true"
                >
                  🐺
                </div>

                <div className="mt-6 text-4xl font-black tracking-[-0.045em] text-slate-950">
                  Are you sure?
                </div>

                <div className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
                  Wolffn is made for real golf champs.
                </div>
              </div>

              <div className="border-t border-white/70">
                <button
                  type="button"
                  onClick={cancelWolffnMode}
                  className="w-full py-4 text-sm font-black text-slate-500"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmWolffnMode}
                  className="w-full border-t border-white/70 bg-slate-950 py-5 text-sm font-black text-white"
                >
                  Enter Wolffn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}