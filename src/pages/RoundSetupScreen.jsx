import {
  useMemo,
  useState,
} from "react"

import {
  useNavigate,
} from "react-router-dom"

import {
  AnimatePresence,
  motion,
} from "framer-motion"

import {
  ArrowRight,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react"

import {
  useAuth,
} from "../context/AuthContext"

import {
  GAME_MODES,
  useGame,
} from "../context/GameContext"

const MIN_STAKE = 0.1
const MAX_STAKE = 100

const STAKE_PRESETS = [
  0.1,
  0.2,
  0.5,
  1,
  2,
  5,
  10,
  20,
  50,
]

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

function roundStake(value) {
  return Math.round(toNumber(value, MIN_STAKE) * 100) / 100
}

function formatStake(value) {
  const amount =
    roundStake(value)

  const hasCents =
    Math.abs(amount % 1) > 0

  if (hasCents) {
    return `${amount.toFixed(2).replace(".", ",")}€`
  }

  return `${amount.toFixed(0)}€`
}

function getCourseName(course) {
  return course?.name || "Erster Golfclub Westpfalz"
}

function getCoursePar(course) {
  return course?.par || 72
}

function clampStake(value) {
  const number =
    roundStake(value)

  if (!Number.isFinite(number)) {
    return MIN_STAKE
  }

  return roundStake(
    Math.min(
      Math.max(number, MIN_STAKE),
      MAX_STAKE
    )
  )
}

function getPreviousStakePreset(currentStake) {
  const current =
    roundStake(currentStake)

  const previousPreset =
    [...STAKE_PRESETS]
      .reverse()
      .find((preset) => preset < current)

  return previousPreset || MIN_STAKE
}

function getNextStakePreset(currentStake) {
  const current =
    roundStake(currentStake)

  const nextPreset =
    STAKE_PRESETS.find((preset) => preset > current)

  return nextPreset || MAX_STAKE
}

function buildInitialPlayers(userName) {
  const cleanedUserName = userName?.trim()

  if (!cleanedUserName) {
    return [
      "Lucas",
      "Ben",
    ]
  }

  const defaultOpponent =
    normalizeName(cleanedUserName) === "ben"
      ? "Lucas"
      : "Ben"

  return [
    cleanedUserName,
    defaultOpponent,
  ]
}

function getGameModeMeta(gameMode) {
  if (gameMode === GAME_MODES.PROFESSIONAL) {
    return {
      label: "Skinz Professional",
      shortLabel: "Pro",
      description: "Birdies und Eagles verändern die Skin-Anzahl.",
      accent: "orange",
    }
  }

  if (gameMode === GAME_MODES.WOLFFN) {
    return {
      label: "Wolffn",
      shortLabel: "Wolffn",
      description: "4 Spieler. Teams, Bestball und echte Golf-Champs.",
      accent: "slate",
    }
  }

  return {
    label: "Classic Skinz",
    shortLabel: "Standard",
    description: "Jeder eindeutige Lochgewinn zählt 1 Skin.",
    accent: "emerald",
  }
}

export default function RoundSetupScreen() {
  const navigate = useNavigate()

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

  const [
    players,
    setPlayers,
  ] = useState(() =>
    buildInitialPlayers(user?.name)
  )

  const [
    newPlayer,
    setNewPlayer,
  ] = useState("")

  const [
    stake,
    setStake,
  ] = useState(2)

  const [
    selectedGameMode,
    setSelectedGameMode,
  ] = useState(GAME_MODES.CLASSIC)

  const [
    showWolffnModal,
    setShowWolffnModal,
  ] = useState(false)

  const uniquePlayers =
    useMemo(() => {
      const playerMap = new Map()

      players.forEach((player) => {
        const trimmedName =
          String(player || "").trim()

        if (!trimmedName) {
          return
        }

        const key =
          normalizeName(trimmedName)

        if (!playerMap.has(key)) {
          playerMap.set(
            key,
            trimmedName
          )
        }
      })

      return Array.from(
        playerMap.values()
      )
    }, [
      players,
    ])

  const cleanedNewPlayer =
    newPlayer.trim()

  const newPlayerAlreadyExists =
    uniquePlayers.some(
      (player) =>
        normalizeName(player) ===
        normalizeName(cleanedNewPlayer)
    )

  const canAddPlayer =
    cleanedNewPlayer.length > 0 &&
    !newPlayerAlreadyExists

  const isProfessionalMode =
    selectedGameMode === GAME_MODES.PROFESSIONAL

  const isWolffnMode =
    selectedGameMode === GAME_MODES.WOLFFN

  const gameModeMeta =
    getGameModeMeta(selectedGameMode)

  const wolffnPlayerCountValid =
    uniquePlayers.length === 4

  const canStart =
    isWolffnMode
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

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      cleanedNewPlayer,
    ])

    setNewPlayer("")
  }

  function removePlayer(name) {
    setPlayers((currentPlayers) =>
      currentPlayers.filter(
        (player) =>
          normalizeName(player) !==
          normalizeName(name)
      )
    )
  }

  function decreaseStake() {
    setStake((currentStake) =>
      clampStake(
        getPreviousStakePreset(currentStake)
      )
    )
  }

  function increaseStake() {
    setStake((currentStake) =>
      clampStake(
        getNextStakePreset(currentStake)
      )
    )
  }

  function selectStakePreset(nextStake) {
    setStake(
      clampStake(nextStake)
    )
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
      const confirmed =
        window.confirm(
          "Du bist noch auf der Runde. Neue Runde starten und aktuelle Runde überschreiben?"
        )

      if (!confirmed) {
        return
      }
    }

    const didStart =
      startMatch(
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
    <div className="min-h-screen bg-[#f5f5f7] pb-[calc(9rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
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
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
        >
          <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
            Match Setup
          </div>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Neue Runde
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-400">
            Wähle Course, Flight, Skinz und deinen Game Mode.
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
              duration: 0.3,
              ease: "easeOut",
            }}
            className="mt-8 rounded-[30px] border border-amber-100 bg-white/90 p-5 shadow-sm backdrop-blur-xl"
          >
            <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-500">
              Auf der Runde
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Runde läuft bereits
            </div>

            <div className="mt-2 text-sm font-bold leading-relaxed text-slate-400">
              Wenn du eine neue Runde startest, wird die aktuelle Runde überschrieben.
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
            duration: 0.3,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[34px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl"
        >
          <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Match ID
          </div>

          <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            {activeMatchId}
          </div>

          <div className="mt-2 text-sm font-bold text-slate-400">
            Diese ID wird für deine neue Runde verwendet.
          </div>
        </motion.div>

        {/* Course / Skin Hero */}
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
            duration: 0.3,
            ease: "easeOut",
          }}
          className="mt-6 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
        >
          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin size={16} />

                  <div className="text-xs font-black uppercase tracking-[0.3em]">
                    Course
                  </div>
                </div>

                <div className="mt-4 max-w-[250px] text-4xl font-black leading-none tracking-tight sm:max-w-none">
                  {getCourseName(currentCourse)}
                </div>
              </div>

              <div
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-white ${
                  isWolffnMode
                    ? "bg-slate-700"
                    : isProfessionalMode
                    ? "bg-orange-500"
                    : "bg-emerald-500"
                }`}
              >
                {gameModeMeta.shortLabel}
              </div>
            </div>

            <div className="mt-10 flex items-end justify-between gap-5">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                  €/Skin
                </div>

                <div className="mt-3 text-7xl font-black tracking-tight text-emerald-400">
                  {formatStake(stake)}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-500">
                  Einsatz pro gewonnenem oder verlorenem Skin
                </div>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={decreaseStake}
                  disabled={stake <= MIN_STAKE}
                  aria-label="Einsatz verringern"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl transition disabled:opacity-30"
                >
                  <Minus
                    size={22}
                    strokeWidth={3}
                  />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={increaseStake}
                  disabled={stake >= MAX_STAKE}
                  aria-label="Einsatz erhöhen"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition disabled:opacity-40"
                >
                  <Plus
                    size={22}
                    strokeWidth={3}
                  />
                </motion.button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {STAKE_PRESETS.map((preset) => {
                const isSelected =
                  roundStake(stake) === roundStake(preset)

                return (
                  <motion.button
                    key={preset}
                    type="button"
                    whileTap={{
                      scale: 0.94,
                    }}
                    onClick={() => selectStakePreset(preset)}
                    className={`rounded-[18px] px-3 py-3 text-sm font-black transition ${
                      isSelected
                        ? "bg-emerald-500 text-white shadow-lg"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {formatStake(preset)}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Game Mode */}
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
            delay: 0.065,
            duration: 0.3,
            ease: "easeOut",
          }}
          className="mt-6 rounded-[38px] bg-white/90 p-6 shadow-sm backdrop-blur-xl"
        >
          <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Game Mode
          </div>

          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Spielmodus
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => selectGameMode(GAME_MODES.CLASSIC)}
              className={`w-full rounded-[28px] border p-5 text-left transition ${
                selectedGameMode === GAME_MODES.CLASSIC
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black tracking-tight text-slate-950">
                    Classic Skinz
                  </div>

                  <div className="mt-1 text-sm font-bold text-slate-400">
                    Jeder eindeutige Lochgewinn zählt 1 Skin.
                  </div>
                </div>

                <div
                  className={`h-5 w-5 rounded-full border ${
                    selectedGameMode === GAME_MODES.CLASSIC
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-200 bg-white"
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectGameMode(GAME_MODES.PROFESSIONAL)}
              className={`w-full rounded-[28px] border p-5 text-left transition ${
                selectedGameMode === GAME_MODES.PROFESSIONAL
                  ? "border-orange-200 bg-orange-50"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={18}
                      className="text-orange-500"
                    />

                    <div className="text-2xl font-black tracking-tight text-slate-950">
                      Skinz Professional
                    </div>
                  </div>

                  <div className="mt-1 text-sm font-bold text-slate-400">
                    Birdie zählt 2 Skinz, Eagle oder besser zählt 3 Skinz.
                  </div>
                </div>

                <div
                  className={`h-5 w-5 rounded-full border ${
                    selectedGameMode === GAME_MODES.PROFESSIONAL
                      ? "border-orange-500 bg-orange-500"
                      : "border-slate-200 bg-white"
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectGameMode(GAME_MODES.WOLFFN)}
              className={`w-full rounded-[28px] border p-5 text-left transition ${
                selectedGameMode === GAME_MODES.WOLFFN
                  ? "border-slate-300 bg-slate-950 text-white"
                  : "border-slate-100 bg-white text-slate-950"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="text-2xl"
                      aria-hidden="true"
                    >
                      🐺
                    </div>

                    <div className="text-2xl font-black tracking-tight">
                      Wolffn
                    </div>
                  </div>

                  <div
                    className={`mt-1 text-sm font-bold ${
                      selectedGameMode === GAME_MODES.WOLFFN
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    4 Spieler. Teams, Bestball und echter Champ-Modus.
                  </div>
                </div>

                <div
                  className={`h-5 w-5 rounded-full border ${
                    selectedGameMode === GAME_MODES.WOLFFN
                      ? "border-white bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                />
              </div>
            </button>
          </div>

          {isProfessionalMode && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Par+
                </div>

                <div className="mt-2 text-4xl font-black text-slate-950">
                  1
                </div>

                <div className="mt-1 text-xs font-bold text-slate-400">
                  Skin
                </div>
              </div>

              <div className="rounded-[24px] border border-red-100 bg-white p-4 text-center shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-red-400">
                  Birdie
                </div>

                <div className="mt-2 text-4xl font-black text-red-500">
                  2
                </div>

                <div className="mt-1 text-xs font-bold text-slate-400">
                  Skinz
                </div>
              </div>

              <div className="rounded-[24px] border border-orange-100 bg-orange-50 p-4 text-center shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-orange-500">
                  Eagle+
                </div>

                <div className="mt-2 text-4xl font-black text-orange-500">
                  3
                </div>

                <div className="mt-1 text-xs font-bold text-orange-400">
                  Skinz
                </div>
              </div>
            </div>
          )}

          {isWolffnMode && (
            <div className="mt-5 rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-bold leading-relaxed text-slate-300 shadow-sm">
              Wolffn braucht exakt 4 Spieler. Der erste Spieler am Loch entscheidet: Partner, Ablehnung oder allein gegen drei.
            </div>
          )}
        </motion.div>

        {/* Course Selection */}
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
            duration: 0.3,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[40px] bg-white/90 p-6 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Course
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Course wählen
              </div>
            </div>

            <div
              className="text-3xl"
              aria-hidden="true"
            >
              ⛳
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {courses.length === 0 && (
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Keine Courses verfügbar.
              </div>
            )}

            {courses.map((course) => {
              const isActive =
                selectedCourseId === course.id

              return (
                <motion.button
                  key={course.id}
                  type="button"
                  whileTap={{
                    scale: 0.985,
                  }}
                  onClick={() =>
                    setSelectedCourseId(course.id)
                  }
                  aria-pressed={isActive}
                  className={[
                    "w-full rounded-[30px] border px-5 py-5 text-left shadow-sm transition-all",
                    isActive
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-100 bg-white hover:border-slate-200",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-2xl font-black leading-tight tracking-tight text-slate-950">
                        {getCourseName(course)}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-4xl font-black text-slate-950">
                        {getCoursePar(course)}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Par
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-4 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                      Selected
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Flight */}
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
            duration: 0.3,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[40px] bg-white/90 p-6 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-400">
                <Users size={18} />

                <div className="text-xs font-black uppercase tracking-[0.25em]">
                  Flight
                </div>
              </div>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Mitspieler
              </h2>
            </div>

            <div
              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest shadow-sm ${
                isWolffnMode && !wolffnPlayerCountValid
                  ? "border-red-100 bg-red-50 text-red-500"
                  : "border-slate-100 bg-white text-slate-500"
              }`}
            >
              {uniquePlayers.length} aktiv
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <input
              id="new-player"
              value={newPlayer}
              onChange={(event) =>
                setNewPlayer(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addPlayer()
                }
              }}
              placeholder="Mitspieler"
              autoComplete="given-name"
              enterKeyHint="done"
              aria-label="Mitspieler hinzufügen"
              className="h-16 min-w-0 flex-1 rounded-[26px] border border-slate-100 bg-white px-5 text-lg font-black text-slate-950 shadow-sm outline-none placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />

            <motion.button
              type="button"
              whileTap={{
                scale: canAddPlayer ? 0.92 : 1,
              }}
              onClick={addPlayer}
              disabled={!cleanedNewPlayer}
              aria-label="Mitspieler hinzufügen"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[26px] bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus
                size={28}
                strokeWidth={3}
              />
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
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch kein Flight zusammengestellt.
              </div>
            )}

            {uniquePlayers.map((player) => {
              const isCurrentUser =
                normalizeName(player) ===
                normalizeName(user?.name)

              return (
                <div
                  key={player}
                  className="flex items-center justify-between rounded-[30px] border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={[
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black uppercase shadow-sm",
                        isCurrentUser
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-950 text-white",
                      ].join(" ")}
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
                          : "Im Flight"}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{
                      scale: 0.9,
                    }}
                    onClick={() =>
                      removePlayer(player)
                    }
                    aria-label={`${player} entfernen`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50"
                  >
                    <X
                      size={20}
                      strokeWidth={3}
                    />
                  </motion.button>
                </div>
              )
            })}
          </div>
        </motion.div>

        {!canStart && (
          <div className="mt-5 rounded-[28px] border border-red-100 bg-white p-5 text-center text-sm font-bold text-red-500 shadow-sm">
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
          className={`mt-8 flex w-full items-center justify-between rounded-[34px] px-6 py-6 text-xl font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isWolffnMode
              ? "bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
              : isProfessionalMode
              ? "bg-orange-500 shadow-[0_18px_45px_rgba(249,115,22,0.28)]"
              : "bg-emerald-500 shadow-[0_18px_45px_rgba(16,185,129,0.3)]"
          }`}
        >
          <span>
            {hasActiveMatch
              ? "Neue Runde starten"
              : isWolffnMode
              ? "Wolffn starten"
              : isProfessionalMode
              ? "Runde mit Skinz Professional starten"
              : "Runde starten"}
          </span>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <ArrowRight
              size={24}
              strokeWidth={3}
            />
          </div>
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
              className="w-full max-w-sm overflow-hidden rounded-[40px] bg-white text-center shadow-2xl"
            >
              <div className="p-8">
                <div
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-950 text-5xl shadow-[0_18px_45px_rgba(15,23,42,0.24)]"
                  aria-hidden="true"
                >
                  🐺
                </div>

                <div className="mt-6 text-4xl font-black tracking-tight text-slate-950">
                  Are you sure?
                </div>

                <div className="mt-3 text-sm font-bold leading-relaxed text-slate-400">
                  Wolffn is made for real golf champs.
                </div>
              </div>

              <div className="border-t border-slate-100">
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
                  className="w-full border-t border-slate-100 bg-slate-950 py-5 text-sm font-black text-white"
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
