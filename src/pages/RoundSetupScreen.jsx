import { useEffect, useMemo, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Minus, Plus } from "lucide-react"

import AppBackground from "../components/AppBackground"
import GameModeBadge from "../components/GameModeBadge"
import { useAuth } from "../context/AuthContext"
import { GAME_MODES, useGame } from "../context/GameContext"
import { getGameModeTheme } from "../utils/gameModeTheme"

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

function getCourseLocation(course) {
  return String(course?.location || "").trim()
}

function getCoursePar(course) {
  return toNumber(course?.par, 72)
}

function getCourseHoleCount(course) {
  return Array.isArray(course?.pars) && course.pars.length > 0 ? course.pars.length : 18
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

function normalizeAvailablePlayer(player) {
  if (!player || typeof player !== "object") return null

  const userId = String(player.id || player.userId || "").trim()
  const name = String(
    player.displayName || player.name || ""
  ).trim()

  if (!userId || !name) return null

  return {
    userId,
    name,
    handicapIndex:
      player.handicapIndex === null ||
      player.handicapIndex === undefined ||
      player.handicapIndex === ""
        ? null
        : toNumber(player.handicapIndex, null),
    homeClubId: String(player.homeClubId || "").trim() || null,
    homeClubName: String(player.homeClubName || "").trim() || null,
    isCurrentUser: Boolean(player.isCurrentUser),
  }
}

function getPlayerKey(player) {
  const userId = String(player?.userId || player?.id || "").trim()

  if (userId) {
    return `user:${userId.toLowerCase()}`
  }

  return `name:${normalizeName(player?.name || player?.displayName)}`
}

function formatHandicapIndex(value) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const handicapIndex = Number(value)

  if (!Number.isFinite(handicapIndex)) {
    return null
  }

  return handicapIndex.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function getGameModeDescription(gameMode) {
  if (gameMode === GAME_MODES.PROFESSIONAL) {
    return "Birdie zählt 2 Skinz, Eagle oder besser zählt 3 Skinz."
  }

  if (gameMode === GAME_MODES.WOLFFN) {
    return "4 Spieler. Teams, Bestball und echter Champ-Modus."
  }

  return "Jeder eindeutige Lochgewinn zählt 1 Skin."
}

function getStartButtonLabel({ hasActiveMatch, isProfessionalMode, isWolffnMode }) {
  if (hasActiveMatch) {
    return "Neue Runde starten"
  }

  if (isWolffnMode) {
    return "🐺 Wolffn starten"
  }

  if (isProfessionalMode) {
    return "Pro Runde starten"
  }

  return "Runde starten"
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

  const safeCourses = useMemo(() => {
    return Array.isArray(courses) ? courses.filter(Boolean) : []
  }, [courses])

  const [availablePlayers, setAvailablePlayers] = useState([])
  const [players, setPlayers] = useState([])
  const [playerSearch, setPlayerSearch] = useState("")
  const [playersLoading, setPlayersLoading] = useState(true)
  const [playersError, setPlayersError] = useState("")
  const [stake, setStake] = useState(2)
  const [selectedGameMode, setSelectedGameMode] = useState(GAME_MODES.CLASSIC)
  const [oozleEnabled, setOozleEnabled] = useState(false)
  const [oozleValue, setOozleValue] = useState(1)
  const [showWolffnModal, setShowWolffnModal] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadPlayers() {
      setPlayersLoading(true)
      setPlayersError("")

      try {
        const response = await fetch("/api/players", {
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        })

        let data = {}

        try {
          data = await response.json()
        } catch {
          data = {}
        }

        if (!response.ok) {
          throw new Error(
            typeof data.error === "string" && data.error.trim()
              ? data.error
              : "Spieler konnten nicht geladen werden."
          )
        }

        if (isCancelled) return

        const loadedPlayers = Array.isArray(data.players)
          ? data.players.map(normalizeAvailablePlayer).filter(Boolean)
          : []

        const currentPlayer =
          loadedPlayers.find((player) => player.isCurrentUser) ||
          loadedPlayers.find(
            (player) =>
              String(player.userId) === String(user?.id || "")
          ) ||
          null

        setAvailablePlayers(loadedPlayers)
        setPlayers(currentPlayer ? [currentPlayer] : [])
      } catch (error) {
        if (isCancelled) return

        console.error("Player list failed.", error)
        setAvailablePlayers([])
        setPlayers([])
        setPlayersError(
          error instanceof Error && error.message
            ? error.message
            : "Spieler konnten nicht geladen werden."
        )
      } finally {
        if (!isCancelled) {
          setPlayersLoading(false)
        }
      }
    }

    loadPlayers()

    return () => {
      isCancelled = true
    }
  }, [user?.id])

  const selectedCourse = currentCourse || safeCourses[0] || null
  const selectedCourseLocation = getCourseLocation(selectedCourse)
  const selectedCourseHoleCount = getCourseHoleCount(selectedCourse)

  const uniquePlayers = useMemo(() => {
    const playerMap = new Map()

    players.forEach((player) => {
      const normalizedPlayer = normalizeAvailablePlayer(player)

      if (!normalizedPlayer) return

      const key = getPlayerKey(normalizedPlayer)

      if (!playerMap.has(key)) {
        playerMap.set(key, normalizedPlayer)
      }
    })

    return Array.from(playerMap.values())
  }, [players])

  const selectedPlayerKeys = useMemo(
    () => new Set(uniquePlayers.map((player) => getPlayerKey(player))),
    [uniquePlayers]
  )

  const filteredAvailablePlayers = useMemo(() => {
    const searchTerm = normalizeName(playerSearch)

    return availablePlayers.filter((player) => {
      if (selectedPlayerKeys.has(getPlayerKey(player))) {
        return false
      }

      if (!searchTerm) {
        return true
      }

      const searchableText = normalizeName(
        [
          player.name,
          player.homeClubName,
          formatHandicapIndex(player.handicapIndex),
        ]
          .filter(Boolean)
          .join(" ")
      )

      return searchableText.includes(searchTerm)
    })
  }, [availablePlayers, playerSearch, selectedPlayerKeys])

  const isProfessionalMode = selectedGameMode === GAME_MODES.PROFESSIONAL
  const isWolffnMode = selectedGameMode === GAME_MODES.WOLFFN

  const modeTheme = getGameModeTheme({
    gameMode: selectedGameMode,
    isWolffn: isWolffnMode,
    isProfessional: isProfessionalMode,
  })

  const gameModeDescription = getGameModeDescription(selectedGameMode)
  const wolffnPlayerCountValid = uniquePlayers.length === 4

  const canStart =
    !playersLoading &&
    !playersError &&
    (isWolffnMode ? wolffnPlayerCountValid : uniquePlayers.length >= 2)

  function addPlayer(player) {
    const normalizedPlayer = normalizeAvailablePlayer(player)

    if (!normalizedPlayer) return

    const playerKey = getPlayerKey(normalizedPlayer)

    setPlayers((currentPlayers) => {
      const alreadySelected = currentPlayers.some(
        (currentPlayer) => getPlayerKey(currentPlayer) === playerKey
      )

      if (alreadySelected) {
        return currentPlayers
      }

      return [...currentPlayers, normalizedPlayer]
    })

    setPlayerSearch("")
  }

  function removePlayer(player) {
    if (player?.isCurrentUser) return

    const playerKey = getPlayerKey(player)

    setPlayers((currentPlayers) =>
      currentPlayers.filter(
        (currentPlayer) => getPlayerKey(currentPlayer) !== playerKey
      )
    )
  }

  function decreaseStake() {
    setStake((currentStake) => clampStake(getPreviousStakePreset(currentStake)))
  }

  function increaseStake() {
    setStake((currentStake) => clampStake(getNextStakePreset(currentStake)))
  }

  function decreaseOozleValue() {
    setOozleValue((currentValue) =>
      clampStake(getPreviousStakePreset(currentValue))
    )
  }

  function increaseOozleValue() {
    setOozleValue((currentValue) =>
      clampStake(getNextStakePreset(currentValue))
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
    setOozleEnabled(false)
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

    const selectedOozleConfig = {
      enabled: !isWolffnMode && oozleEnabled,
      value: clampStake(oozleValue),
      foozleEnabled: true,
      carryoverEnabled: true,
    }

    const didStart = startMatch(
      uniquePlayers,
      stake,
      selectedCourseId,
      selectedGameMode,
      undefined,
      selectedOozleConfig
    )

    if (didStart) {
      navigate("/live")
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#e8ebe5] pb-[calc(13rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pt-8"
        >
          <div
            className={`text-[12px] font-black uppercase tracking-[0.28em] ${modeTheme.text}`}
          >
            Match Setup
          </div>

          <h1 className="mt-3 text-[clamp(3.2rem,16vw,3.85rem)] font-black leading-none tracking-[-0.07em] text-slate-950">
            Neue Runde
          </h1>

          <p className="mt-4 max-w-sm text-base font-semibold leading-relaxed tracking-[-0.02em] text-slate-600">
            Course, Flight, Einsatz und Spielmodus festlegen.
          </p>
        </motion.div>

        {hasActiveMatch && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03, duration: 0.35, ease: "easeOut" }}
            className="mt-8 rounded-[32px] border border-amber-200/70 bg-white/[0.52] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">
              Aktive Runde
            </div>

            <div className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
              Runde läuft bereits
            </div>

            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Wenn du eine neue Runde startest, wird die aktuelle Runde überschrieben.
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.35, ease: "easeOut" }}
          className="mt-8 overflow-hidden rounded-[38px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
        >
          <div className="relative p-7 sm:p-8">
            <div
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t ${modeTheme.glow}`}
            />

            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[12px] font-black uppercase tracking-[0.22em] ${modeTheme.textDark}`}
                  >
                    Course
                  </div>

                  <div className="mt-4 max-w-full break-words text-[clamp(2.15rem,11vw,2.55rem)] font-black leading-none tracking-[-0.055em]">
                    {getCourseName(selectedCourse)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCourseLocation && (
                      <div className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                        {selectedCourseLocation}
                      </div>
                    )}

                    <div className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                      {selectedCourseHoleCount} Holes
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <GameModeBadge gameMode={selectedGameMode} isDark />
                </div>
              </div>

              <div className="mt-10 flex items-end justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">
                    €/Skin
                  </div>

                  <div
                    className={`mt-3 min-w-0 break-words text-[clamp(3.3rem,17vw,4.6rem)] font-black leading-none tracking-[-0.075em] tabular-nums ${modeTheme.textDark}`}
                  >
                    {formatStake(stake)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={decreaseStake}
                    disabled={roundStake(stake) <= MIN_STAKE}
                    aria-label="Einsatz verringern"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-2xl font-black text-white backdrop-blur-xl transition disabled:opacity-30"
                  >
                    <Minus size={22} strokeWidth={3} aria-hidden="true" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={increaseStake}
                    disabled={roundStake(stake) >= MAX_STAKE}
                    aria-label="Einsatz erhöhen"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white text-2xl font-black text-slate-950 shadow-sm transition disabled:opacity-40"
                  >
                    <Plus size={22} strokeWidth={3} aria-hidden="true" />
                  </motion.button>
                </div>
              </div>

              <div className="mt-8 flex items-start justify-between gap-4 border-t border-white/10 pt-5">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Match
                  </div>

                  <div className="mt-1 break-words text-sm font-black text-slate-300">
                    {activeMatchId || "-"}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Step
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-300">
                    {formatStake(getPreviousStakePreset(stake))} / {formatStake(getNextStakePreset(stake))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Game Mode
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Spielmodus
              </div>
            </div>

            <GameModeBadge gameMode={selectedGameMode} />
          </div>

          <div className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
            {gameModeDescription}
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
              🐺 Wolffn braucht exakt 4 Spieler. Der erste Spieler am Loch entscheidet: Partner, Ablehnung oder allein gegen drei.
            </div>
          )}
        </motion.div>

        {!isWolffnMode && (
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
            className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-3xl font-black tracking-[-0.045em] text-slate-950">
                  Oozle
                </div>
                <div className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
                  Nächster Abschlag auf dem Grün: mit maximal zwei Putts gewinnen,
                  bei drei oder mehr Putts als Foozle zahlen.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={oozleEnabled}
                onClick={() => setOozleEnabled((currentValue) => !currentValue)}
                className={`relative h-9 w-16 shrink-0 rounded-full border transition-colors ${
                  oozleEnabled
                    ? `${modeTheme.activeBorder} ${modeTheme.button}`
                    : "border-slate-200 bg-slate-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    oozleEnabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />
                <span className="sr-only">
                  Oozle {oozleEnabled ? "deaktivieren" : "aktivieren"}
                </span>
              </button>
            </div>

            {oozleEnabled && (
              <div className="mt-6 overflow-hidden rounded-[28px] border border-white/70 bg-white/[0.50] p-5 shadow-sm backdrop-blur-xl">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                      Einsatz pro Oozle
                    </div>
                    <div className={`mt-2 text-[3.35rem] font-black leading-none tracking-[-0.065em] tabular-nums ${modeTheme.text}`}>
                      {formatStake(oozleValue)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={decreaseOozleValue}
                      disabled={roundStake(oozleValue) <= MIN_STAKE}
                      aria-label="Oozle-Einsatz verringern"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-black text-slate-950 shadow-sm transition disabled:opacity-30"
                    >
                      <Minus size={22} strokeWidth={3} aria-hidden="true" />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={increaseOozleValue}
                      disabled={roundStake(oozleValue) >= MAX_STAKE}
                      aria-label="Oozle-Einsatz erhöhen"
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl font-black text-white shadow-sm transition disabled:opacity-30 ${modeTheme.button}`}
                    >
                      <Plus size={22} strokeWidth={3} aria-hidden="true" />
                    </motion.button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Foozle
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      3+ Putts
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Carryover
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      Nächstes Par 3
                    </div>
                  </div>
                </div>


              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Course
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Platz wählen
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Selected
              </div>

              <div className="mt-1 text-xl font-black text-slate-950">
                Par {getCoursePar(selectedCourse)}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/70 bg-white/[0.42] px-5 py-4 text-sm font-semibold leading-relaxed text-slate-500 backdrop-blur-xl">
            Gespielte Matches speichern immer einen eigenen Course-Snapshot. Spätere Course-Änderungen verändern keine alten Scorecards.
          </div>

          <div className="mt-6 space-y-3">
            {safeCourses.length === 0 && (
              <div className="rounded-[26px] border border-white/70 bg-white/[0.42] p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                Keine Courses verfügbar.
              </div>
            )}

            {safeCourses.map((course) => {
              const isActive = selectedCourseId === course.id
              const courseLocation = getCourseLocation(course)
              const courseHoleCount = getCourseHoleCount(course)

              return (
                <motion.button
                  key={course.id}
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedCourseId(course.id)}
                  aria-pressed={isActive}
                  className={`w-full rounded-[28px] border px-5 py-5 text-left transition ${
                    isActive
                      ? `${modeTheme.activeBorder} ${modeTheme.activeSoftBg}`
                      : "border-white/70 bg-white/[0.42] backdrop-blur-xl"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-2xl font-black leading-tight tracking-[-0.035em] text-slate-950">
                        {getCourseName(course)}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <div
                          className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                            isActive
                              ? `${modeTheme.activeBorder} ${modeTheme.activeSoftBg} ${modeTheme.softText}`
                              : "bg-white/70 text-slate-400"
                          }`}
                        >
                          {isActive ? "Selected" : "Available"}
                        </div>

                        {courseLocation && (
                          <div className="rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {courseLocation}
                          </div>
                        )}

                        <div className="rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {courseHoleCount} Holes
                        </div>
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
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Flight
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Mitspieler
              </div>
            </div>

            <div
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                isWolffnMode && !wolffnPlayerCountValid
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-white/70 bg-white/[0.46] text-slate-600"
              }`}
            >
              {uniquePlayers.length} aktiv
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="player-search"
              className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500"
            >
              Spieler suchen
            </label>

            <div className="relative mt-3">
              <input
                id="player-search"
                type="search"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Name oder Heimatclub"
                autoComplete="off"
                disabled={playersLoading || Boolean(playersError)}
                aria-label="Registrierte Spieler suchen"
                className={`h-16 w-full rounded-[26px] border border-white/70 bg-white/[0.62] px-5 text-lg font-black text-slate-950 shadow-sm outline-none backdrop-blur-xl placeholder:text-slate-300 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${modeTheme.ring}`}
              />
            </div>
          </div>

          {playersLoading && (
            <div className="mt-4 rounded-[24px] border border-white/70 bg-white/[0.42] px-5 py-4 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
              Spieler werden geladen...
            </div>
          )}

          {!playersLoading && playersError && (
            <div className="mt-4 rounded-[24px] border border-red-100 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-500">
              {playersError}
            </div>
          )}

          {!playersLoading && !playersError && (
            <div className="mt-4 space-y-3">
              {filteredAvailablePlayers.length === 0 && (
                <div className="rounded-[24px] border border-white/70 bg-white/[0.42] px-5 py-4 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                  {playerSearch.trim()
                    ? "Kein passender aktiver Spieler gefunden."
                    : "Alle verfügbaren Spieler sind bereits im Flight."}
                </div>
              )}

              {filteredAvailablePlayers.map((player) => {
                const formattedHandicap = formatHandicapIndex(
                  player.handicapIndex
                )

                return (
                  <motion.button
                    key={getPlayerKey(player)}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addPlayer(player)}
                    className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-white/70 bg-white/[0.58] p-4 text-left shadow-sm backdrop-blur-xl transition hover:bg-white/[0.72]"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-base font-black uppercase text-white shadow-sm">
                        {player.name.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="break-words text-lg font-black leading-tight text-slate-950">
                          {player.name}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-500">
                          {formattedHandicap && (
                            <span>HCP {formattedHandicap}</span>
                          )}

                          {formattedHandicap && player.homeClubName && (
                            <span aria-hidden="true">·</span>
                          )}

                          {player.homeClubName && (
                            <span className="break-words">
                              {player.homeClubName}
                            </span>
                          )}

                          {!formattedHandicap && !player.homeClubName && (
                            <span>Aktiver Spieler</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${modeTheme.button}`}
                      aria-hidden="true"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </span>
                  </motion.button>
                )
              })}
            </div>
          )}

          {isWolffnMode && !wolffnPlayerCountValid && (
            <div className="mt-4 rounded-[22px] border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-500">
              Wolffn braucht exakt 4 Spieler.
            </div>
          )}

          <div className="mt-6">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Aktueller Flight
            </div>

            <div className="mt-3 space-y-3">
              {uniquePlayers.length === 0 && !playersLoading && (
                <div className="rounded-[26px] border border-white/70 bg-white/[0.42] p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                  Noch kein Flight zusammengestellt.
                </div>
              )}

              {uniquePlayers.map((player) => {
                const isCurrentUser =
                  player.isCurrentUser ||
                  String(player.userId || "") === String(user?.id || "")
                const formattedHandicap = formatHandicapIndex(
                  player.handicapIndex
                )

                return (
                  <div
                    key={getPlayerKey(player)}
                    className="flex items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/[0.42] p-4 shadow-sm backdrop-blur-xl"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black uppercase shadow-sm ${
                          isCurrentUser
                            ? modeTheme.avatar
                            : "bg-slate-950 text-white"
                        }`}
                      >
                        {player.name.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="break-words text-2xl font-black leading-tight tracking-[-0.035em] text-slate-950">
                          {player.name}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-500">
                          <span>{isCurrentUser ? "Du" : "Im Flight"}</span>

                          {formattedHandicap && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>HCP {formattedHandicap}</span>
                            </>
                          )}

                          {player.homeClubName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="break-words">
                                {player.homeClubName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCurrentUser ? (
                      <div className="flex h-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/60 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Fix
                      </div>
                    ) : (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removePlayer(player)}
                        aria-label={`${player.name} entfernen`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white/70 text-xl font-black text-red-500 shadow-sm transition hover:bg-red-50"
                      >
                        ×
                      </motion.button>
                    )}
                  </div>
                )
              })}
            </div>
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
          whileTap={{ scale: canStart ? 0.98 : 1 }}
          disabled={!canStart}
          onClick={handleStartMatch}
          className={`mt-8 flex w-full items-center justify-between gap-4 rounded-[34px] px-6 py-6 text-xl font-black text-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] transition disabled:cursor-not-allowed disabled:opacity-40 ${modeTheme.button} ${modeTheme.buttonHover}`}
        >
          <span className="min-w-0 break-words text-left">
            {getStartButtonLabel({
              hasActiveMatch,
              isProfessionalMode,
              isWolffnMode,
            })}
          </span>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl">
            →
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showWolffnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
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
