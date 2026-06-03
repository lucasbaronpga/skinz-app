import {
  useState,
} from "react"

import {
  motion,
  AnimatePresence,
} from "framer-motion"

import {
  useNavigate,
} from "react-router-dom"

import {
  X,
  Flame,
  Crown,
  ChevronRight,
  Sparkles,
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

const HOLE_COUNT = 18

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

function formatMoney(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return `+${amount}€`
  }

  if (amount < 0) {
    return `${amount}€`
  }

  return "0€"
}

function getMoneyColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-emerald-600"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function formatSkinSaldo(value) {
  return Math.abs(
    toNumber(value, 0)
  )
}

function getSkinColor(value) {
  const amount = toNumber(value, 0)

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function formatToPar(value) {
  const amount = toNumber(value, 0)

  if (amount === 0) {
    return "E"
  }

  if (amount > 0) {
    return `+${amount}`
  }

  return amount
}

function getToParColor(value) {
  const amount = toNumber(value, 0)

  if (amount < 0) {
    return "text-emerald-500"
  }

  if (amount > 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getScoreStyle(label) {
  if (label === "Albatross") {
    return "bg-yellow-400 border-yellow-400 text-black"
  }

  if (label === "Eagle") {
    return "bg-orange-500 border-orange-500 text-white"
  }

  if (label === "Birdie") {
    return "bg-red-500 border-red-500 text-white"
  }

  if (label === "Bogey") {
    return "bg-blue-500 border-blue-500 text-white"
  }

  if (label === "Double Bogey") {
    return "bg-blue-900 border-blue-900 text-white"
  }

  if (label === "Triple+") {
    return "bg-purple-600 border-purple-600 text-white"
  }

  return "bg-white border-slate-200 text-slate-950"
}

function getHotStreak(player) {
  const recentHoles =
    Array.isArray(player?.holes)
      ? player.holes.slice(-3)
      : []

  const hotRounds =
    recentHoles.filter((playedHole) => {
      const label =
        playedHole.result?.label

      return (
        label === "Birdie" ||
        label === "Eagle" ||
        label === "Albatross"
      )
    })

  return hotRounds.length >= 2
}

function getCourseName(course) {
  return (
    course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getCourseLocation(course) {
  return (
    course?.location ||
    "Westpfalz"
  )
}

function getCoursePar(course) {
  return (
    course?.par ||
    72
  )
}

function getCourseMeta(course) {
  return `${getCourseLocation(course)} · Par ${getCoursePar(course)}`
}

function getSpecialLabelForScore(score, par, specialScoringEnabled) {
  if (!specialScoringEnabled) {
    return null
  }

  const toPar =
    toNumber(score, par) -
    toNumber(par, 0)

  if (toPar <= -2) {
    return "Eagle 3 Skins"
  }

  if (toPar === -1) {
    return "Birdie 2 Skins"
  }

  return null
}

function getSkinsLabel(value) {
  const amount =
    toNumber(value, 0)

  return amount === 1
    ? "1 Skin"
    : `${amount} Skins`
}

function getHistorySpecialLabel(item) {
  if (!item?.specialScoringEnabled) {
    return null
  }

  if (item.specialScoringLabel) {
    return item.specialScoringLabel
  }

  if (item.bonusResult) {
    return item.bonusResult
  }

  return null
}

export default function Live() {
  const navigate = useNavigate()

  const {
    hole,

    carryover,
    currentPot,
    currentPar,
    currentCourse,
    currentBaseSkins,
    currentBonusSkins,
    currentSkinsAtStake,

    players,
    history,
    celebration,

    matchFinished,
    resetGame,
    hasActiveMatch,

    lowestScore,
    winners,
    hasTie,

    specialScoringEnabled,

    updateScore,
    finishHole,

    getGolfResult,
  } = useGame()

  const [
    showAbortModal,
    setShowAbortModal,
  ] = useState(false)

  const sortedPlayers =
    [...players].sort(
      (a, b) =>
        toNumber(b.winnings, 0) -
          toNumber(a.winnings, 0) ||
        toNumber(a.totalToPar, 0) -
          toNumber(b.totalToPar, 0)
    )

  const champion =
    sortedPlayers[0] || null

  const safeHole =
    Math.min(
      Math.max(toNumber(hole, 1), 1),
      HOLE_COUNT
    )

  const progress =
    matchFinished
      ? 100
      : Math.min(
          100,
          (safeHole / HOLE_COUNT) * 100
        )

  const liveSpecialLabel =
    winners[0]
      ? getSpecialLabelForScore(
          winners[0].score,
          currentPar,
          specialScoringEnabled
        )
      : null

  const visibleBaseSkins =
    currentBaseSkins || 1

  const visibleBonusSkins =
    currentBonusSkins || 0

  const visibleCarryover =
    carryover || 0

  const visibleSkinsAtStake =
    currentSkinsAtStake || 1

  function handleCloseLive() {
    navigate("/")
  }

  function handleAbortMatch() {
    resetGame()
    setShowAbortModal(false)
    navigate("/")
  }

  function handleResetGame() {
    resetGame()
    navigate("/round")
  }

  function handleGoHome() {
    navigate("/")
  }

  if (!hasActiveMatch && !matchFinished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-5 text-slate-950">
        <div className="w-full max-w-sm rounded-[40px] bg-white/90 p-8 text-center shadow-sm backdrop-blur-xl">
          <div
            className="text-5xl"
            aria-hidden="true"
          >
            ⛳
          </div>

          <div className="mt-6 text-3xl font-black tracking-tight">
            Keine aktive Runde
          </div>

          <div className="mt-3 text-sm font-bold leading-relaxed text-slate-400">
            Starte zuerst eine neue Runde, damit Scores geändert und Löcher abgeschlossen werden können.
          </div>

          <button
            type="button"
            onClick={() => navigate("/round")}
            className="mt-8 w-full rounded-[28px] bg-emerald-500 py-5 text-lg font-black text-white shadow-lg"
          >
            Runde starten
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-[28px] border border-slate-100 bg-white py-5 text-lg font-black text-slate-500 shadow-sm"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-[calc(12rem+env(safe-area-inset-bottom))] text-slate-950">
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
        className="px-6 pt-10"
      >
        <div className="mx-auto max-w-md">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
                Auf der Runde
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <div className="inline-flex max-w-full rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
                  <span className="truncate">
                    {getCourseName(currentCourse)}
                  </span>
                </div>

                {specialScoringEnabled && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                    <Sparkles size={12} />
                    Sonderform
                  </div>
                )}
              </div>

              <div className="mt-4 text-6xl font-black tracking-tight text-slate-950">
                Loch {safeHole}
              </div>

              <div className="mt-2 text-lg font-bold text-slate-400">
                Par {currentPar}
              </div>
            </div>

            {!matchFinished && (
              <motion.button
                type="button"
                whileTap={{
                  scale: 0.92,
                }}
                onClick={handleCloseLive}
                aria-label="Live-Ansicht schließen"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm"
              >
                <X size={22} />
              </motion.button>
            )}
          </div>

          {/* Progress */}
          <div className="mt-8 rounded-full border border-slate-100 bg-white p-2 shadow-sm">
            <div className="h-3 overflow-hidden rounded-full bg-[#f5f5f7]">
              <motion.div
                initial={{
                  width: 0,
                }}
                animate={{
                  width: `${progress}%`,
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeOut",
                }}
                className={`h-full rounded-full ${
                  specialScoringEnabled
                    ? "bg-orange-500"
                    : "bg-emerald-500"
                }`}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              Rundenfortschritt
            </div>

            <div className="text-xs font-black text-slate-400">
              {safeHole}/{HOLE_COUNT}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pot Hero */}
      <div className="mx-auto mt-8 max-w-md px-5">
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
          className={`overflow-hidden rounded-[42px] p-8 shadow-2xl ${
            hasTie || specialScoringEnabled
              ? "bg-orange-500 text-white"
              : "bg-slate-950 text-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`text-xs font-black uppercase tracking-[0.3em] ${
                  hasTie || specialScoringEnabled
                    ? "text-orange-100"
                    : "text-slate-500"
                }`}
              >
                {hasTie
                  ? "Carryover"
                  : specialScoringEnabled
                  ? "Sonderform Pot"
                  : "Skins-Pot"}
              </div>

              <motion.div
                key={currentPot}
                initial={{
                  scale: 0.92,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                className="mt-5 text-7xl font-black tracking-tight"
              >
                {currentPot}€
              </motion.div>
            </div>

            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl ${
                hasTie || specialScoringEnabled
                  ? "bg-white/20"
                  : "bg-emerald-500"
              }`}
              aria-hidden="true"
            >
              {hasTie
                ? "🔥"
                : specialScoringEnabled
                ? "✨"
                : "💰"}
            </div>
          </div>

          <div
            className={`mt-6 text-lg font-bold ${
              hasTie || specialScoringEnabled
                ? "text-orange-100"
                : "text-slate-400"
            }`}
          >
            {hasTie
              ? `Carryover auf Loch ${safeHole}`
              : `${winners[0]?.name || "-"} führt am Loch`}
          </div>

          {specialScoringEnabled && liveSpecialLabel && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-500 shadow-sm">
              <Sparkles size={13} />
              {liveSpecialLabel}
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-xl">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Base
              </div>

              <div className="mt-1 text-3xl font-black">
                {visibleBaseSkins}
              </div>

              <div className="mt-1 text-xs font-bold opacity-70">
                Skins
              </div>
            </div>

            <div className="rounded-[22px] bg-white/10 p-4 text-center backdrop-blur-xl">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Carry
              </div>

              <div className="mt-1 text-3xl font-black">
                {visibleCarryover}
              </div>

              <div className="mt-1 text-xs font-bold opacity-70">
                Skins
              </div>
            </div>

            <div className="rounded-[22px] bg-white/10 p-4 text-right backdrop-blur-xl">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                At Stake
              </div>

              <div className="mt-1 text-3xl font-black">
                {visibleSkinsAtStake}
              </div>

              <div className="mt-1 text-xs font-bold opacity-70">
                Skins
              </div>
            </div>
          </div>

          {specialScoringEnabled && visibleBonusSkins > 0 && !hasTie && (
            <div className="mt-4 rounded-[22px] bg-white/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-white">
              Bonus: +{visibleBonusSkins} Skin{visibleBonusSkins === 1 ? "" : "s"} durch Sonderform
            </div>
          )}
        </motion.div>
      </div>

      {/* Players */}
      <div className="mx-auto mt-8 max-w-md space-y-5 px-5">
        {players.map((player, index) => {
          const playerScore =
            toNumber(player.score, currentPar)

          const isWinning =
            playerScore === lowestScore

          const golfResult =
            getGolfResult(
              playerScore,
              currentPar
            )

          const currentToPar =
            playerScore - currentPar

          const playerSpecialLabel =
            getSpecialLabelForScore(
              playerScore,
              currentPar,
              specialScoringEnabled
            )

          return (
            <motion.div
              key={player.name}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.05,
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <div
                className={`overflow-hidden rounded-[38px] border p-6 shadow-sm transition-all duration-300 ${
                  isWinning
                    ? "border-emerald-100 bg-white shadow-[0_18px_50px_rgba(16,185,129,0.14)]"
                    : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-5">
                  {/* Player Info */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-4xl font-black tracking-tight text-slate-950">
                        {player.name}
                      </div>

                      {isWinning && !hasTie && (
                        <div className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                          Leader
                        </div>
                      )}

                      {isWinning &&
                        specialScoringEnabled &&
                        playerSpecialLabel && (
                          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <Sparkles size={10} />
                            {playerSpecialLabel}
                          </div>
                        )}

                      {getHotStreak(player) && (
                        <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                          <Flame size={10} />
                          Hot
                        </div>
                      )}
                    </div>

                    <div
                      className={`mt-5 inline-flex rounded-2xl px-4 py-3 text-xs font-black shadow-sm ${golfResult.color}`}
                    >
                      {golfResult.label}
                    </div>

                    <div
                      className={`mt-5 text-6xl font-black tracking-tight ${getToParColor(currentToPar)}`}
                    >
                      {formatToPar(currentToPar)}
                    </div>

                    <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                      Hole Score
                    </div>
                  </div>

                  {/* Score Controls */}
                  <div className="flex flex-col items-center gap-4">
                    <motion.button
                      type="button"
                      whileTap={{
                        scale: 0.9,
                      }}
                      disabled={matchFinished}
                      onClick={() =>
                        updateScore(
                          index,
                          playerScore + 1
                        )
                      }
                      aria-label={`Score von ${player.name} erhöhen`}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-3xl font-black text-slate-500 shadow-sm disabled:opacity-40"
                    >
                      +
                    </motion.button>

                    <motion.div
                      key={playerScore}
                      initial={{
                        scale: 0.82,
                        opacity: 0,
                      }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                      }}
                      className={`flex h-28 w-28 items-center justify-center rounded-[34px] border-2 text-6xl font-black shadow-sm ${getScoreStyle(golfResult.label)}`}
                    >
                      {playerScore}
                    </motion.div>

                    <motion.button
                      type="button"
                      whileTap={{
                        scale: 0.9,
                      }}
                      disabled={
                        matchFinished ||
                        playerScore <= 1
                      }
                      onClick={() =>
                        updateScore(
                          index,
                          Math.max(
                            1,
                            playerScore - 1
                          )
                        )
                      }
                      aria-label={`Score von ${player.name} verringern`}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-3xl font-black text-slate-500 shadow-sm disabled:opacity-40"
                    >
                      −
                    </motion.button>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Winnings
                    </div>

                    <div
                      className={`mt-1 text-3xl font-black ${getMoneyColor(player.winnings)}`}
                    >
                      {formatMoney(player.winnings)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Skin-Saldo
                    </div>

                    <div
                      className={`mt-1 text-3xl font-black ${getSkinColor(player.skins)}`}
                    >
                      {formatSkinSaldo(player.skins)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Scorecard */}
      <div className="mx-auto mt-10 max-w-md px-5">
        <div className="rounded-[38px] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Scorekarte
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Lochverlauf
              </div>
            </div>

            <div
              className="text-4xl"
              aria-hidden="true"
            >
              ⛳
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {history.length === 0 && (
              <div className="rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch kein Score auf der Karte.
              </div>
            )}

            {history
              .slice()
              .reverse()
              .map((item) => {
                const historySpecialLabel =
                  getHistorySpecialLabel(item)

                return (
                  <div
                    key={`${item.hole}-${item.winner}`}
                    className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 py-4 shadow-sm"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-950">
                          Loch {item.hole}
                        </div>

                        {historySpecialLabel && (
                          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <Sparkles size={10} />
                            {historySpecialLabel}
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Par {item.par}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Base {getSkinsLabel(item.baseSkins || 1)}
                        </div>

                        {toNumber(item.carryoverSkins, 0) > 0 && (
                          <div className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                            Carry {getSkinsLabel(item.carryoverSkins)}
                          </div>
                        )}

                        {toNumber(item.carryoverAdded, 0) > 0 && item.hasTie && (
                          <div className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                            Add {getSkinsLabel(item.carryoverAdded)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-slate-950">
                        {item.hasTie
                          ? "Carryover"
                          : item.winner}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-emerald-600">
                        {getSkinsLabel(item.skins || 0)} · {item.pot || 0}€
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Abort Button */}
      {!matchFinished && (
        <div className="mx-auto mt-6 max-w-md px-5">
          <motion.button
            type="button"
            whileTap={{
              scale: 0.98,
            }}
            onClick={() => setShowAbortModal(true)}
            className="w-full rounded-[28px] border border-red-100 bg-white py-4 text-sm font-black text-red-500 shadow-sm"
          >
            Match abbrechen
          </motion.button>
        </div>
      )}

      {/* Finish Button */}
      {!matchFinished && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="w-full max-w-md">
            <motion.button
              type="button"
              whileTap={{
                scale: 0.98,
              }}
              onClick={finishHole}
              className={`flex w-full items-center justify-between rounded-[32px] px-6 py-5 text-xl font-black text-white ${
                specialScoringEnabled
                  ? "bg-orange-500 shadow-[0_20px_50px_rgba(249,115,22,0.35)]"
                  : "bg-emerald-500 shadow-[0_20px_50px_rgba(16,185,129,0.35)]"
              }`}
            >
              <span>
                Loch abschließen
              </span>

              <ChevronRight size={24} />
            </motion.button>
          </div>
        </div>
      )}

      {/* Celebration */}
      <AnimatePresence>
        {celebration && (
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                scale: 0.85,
                opacity: 0,
                y: 40,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className="w-full max-w-sm rounded-[42px] bg-white p-10 text-center shadow-2xl"
            >
              <div
                className={`inline-flex rounded-2xl px-5 py-3 text-sm font-black ${celebration.color}`}
              >
                {celebration.result}
              </div>

              {celebration.specialScoringApplied &&
                celebration.specialScoringLabel && (
                  <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                    <Sparkles size={13} />
                    {celebration.specialScoringLabel}
                  </div>
                )}

              <div className="mt-6 text-6xl font-black tracking-tight text-slate-950">
                {celebration.player}
              </div>

              <div className="mt-4 text-lg font-bold text-slate-400">
                holt {celebration.skins || 1}{" "}
                {(celebration.skins || 1) === 1
                  ? "Skin"
                  : "Skins"}
              </div>

              <div className="mt-6 text-7xl font-black tracking-tight text-emerald-600">
                {formatMoney(celebration.pot)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Finished */}
      <AnimatePresence>
        {matchFinished && (
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
            className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                scale: 0.88,
                opacity: 0,
                y: 40,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              className="mx-auto w-full max-w-md rounded-[44px] bg-white p-8 text-center shadow-2xl"
            >
              <motion.div
                animate={{
                  rotate: [
                    0,
                    -4,
                    4,
                    0,
                  ],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                }}
                className="text-7xl"
                aria-hidden="true"
              >
                🏆
              </motion.div>

              <div className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
                Am 19. Loch
              </div>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-slate-950">
                {champion?.name || "Winner"}
              </h2>

              <div className="mt-3 inline-flex max-w-full rounded-full border border-slate-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
                <span className="truncate">
                  {getCourseName(currentCourse)}
                </span>
              </div>

              <div className="mt-2 text-sm font-bold text-slate-400">
                {getCourseMeta(currentCourse)}
              </div>

              <div
                className={`mt-5 text-5xl font-black ${getMoneyColor(champion?.winnings)}`}
              >
                {formatMoney(champion?.winnings)}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-400">
                    Skin-Saldo
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black ${getSkinColor(champion?.skins)}`}
                  >
                    {formatSkinSaldo(champion?.skins)}
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-400">
                    Winnings
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black ${getMoneyColor(champion?.winnings)}`}
                  >
                    {formatMoney(champion?.winnings)}
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-400">
                    To Par
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black ${getToParColor(champion?.totalToPar)}`}
                  >
                    {formatToPar(champion?.totalToPar)}
                  </div>
                </div>
              </div>

              {/* Final Ranking */}
              <div className="mt-8 rounded-[32px] bg-[#f5f5f7] p-4 text-left">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                      Final Scores
                    </div>

                    <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                      Leaderboard
                    </div>
                  </div>

                  <div
                    className="text-3xl"
                    aria-hidden="true"
                  >
                    🏆
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {sortedPlayers.map((player, index) => {
                    const isChampion =
                      player.name === champion?.name

                    return (
                      <div
                        key={player.name}
                        className={`flex items-center justify-between rounded-[24px] border px-4 py-4 shadow-sm ${
                          isChampion
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-slate-100 bg-white"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              index === 0
                                ? "bg-yellow-400 text-black"
                                : index === 1
                                ? "border border-slate-200 bg-white text-slate-900"
                                : index === 2
                                ? "bg-orange-400 text-white"
                                : "border border-slate-200 bg-white text-slate-900"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-lg font-black text-slate-950">
                                {player.name}
                              </div>

                              {isChampion && (
                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                  <Crown size={10} />
                                  Winner
                                </div>
                              )}
                            </div>

                            <div
                              className={`mt-1 text-xs font-black uppercase tracking-widest ${getSkinColor(player.skins)}`}
                            >
                              {formatSkinSaldo(player.skins)} Skin-Saldo
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div
                            className={`text-2xl font-black ${getMoneyColor(player.winnings)}`}
                          >
                            {formatMoney(player.winnings)}
                          </div>

                          <div
                            className={`mt-1 text-xs font-black uppercase tracking-widest ${getToParColor(player.totalToPar)}`}
                          >
                            {formatToPar(player.totalToPar)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 space-y-3">
                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={handleResetGame}
                  className="w-full rounded-[30px] bg-slate-950 py-5 text-lg font-black text-white shadow-lg"
                >
                  Neue Runde starten
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={handleGoHome}
                  className="w-full rounded-[30px] border border-slate-100 bg-white py-5 text-lg font-black text-slate-500 shadow-sm"
                >
                  Home
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Abort Modal */}
      <AnimatePresence>
        {showAbortModal && (
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="abort-match-title"
          >
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 40,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              className="w-full max-w-sm overflow-hidden rounded-[34px] bg-white shadow-2xl"
            >
              <div className="p-6 text-center">
                <div
                  id="abort-match-title"
                  className="text-lg font-black text-slate-950"
                >
                  Match abbrechen?
                </div>

                <div className="mt-2 text-sm font-bold text-slate-400">
                  Dieses Match wird gelöscht und nicht gespeichert.
                </div>
              </div>

              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAbortModal(false)}
                  className="w-full py-4 text-sm font-black text-slate-500"
                >
                  Abbrechen
                </button>

                <button
                  type="button"
                  onClick={handleAbortMatch}
                  className="w-full border-t border-slate-100 py-4 text-sm font-black text-red-500"
                >
                  Match löschen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}