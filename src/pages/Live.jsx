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
  Check,
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
    return "text-yellow-500"
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

function getWolffnTeeOrder(players, hole) {
  const playerNames =
    players.map((player) => player.name)

  if (playerNames.length !== 4) {
    return playerNames
  }

  const offset =
    (Math.max(toNumber(hole, 1), 1) - 1) %
    playerNames.length

  return [
    ...playerNames.slice(offset),
    ...playerNames.slice(0, offset),
  ]
}

function getWolffnTeams({
  teeOrder,
  decisionPlayer,
  askedPlayer,
  wolffnDecision,
}) {
  if (
    !Array.isArray(teeOrder) ||
    teeOrder.length !== 4 ||
    !decisionPlayer
  ) {
    return null
  }

  if (wolffnDecision === "alone") {
    return {
      format: "1v3",
      label: "Wolffn",
      wolffnPlayer: decisionPlayer,
      teamA: [
        decisionPlayer,
      ],
      teamB:
        teeOrder.filter(
          (playerName) =>
            playerName !== decisionPlayer
        ),
    }
  }

  if (!askedPlayer) {
    return null
  }

  if (wolffnDecision === "accepted") {
    const teamA = [
      decisionPlayer,
      askedPlayer,
    ]

    const teamB =
      teeOrder.filter(
        (playerName) =>
          !teamA.includes(playerName)
      )

    return {
      format: "2v2",
      label: "2v2",
      wolffnPlayer: null,
      teamA,
      teamB,
    }
  }

  if (wolffnDecision === "declined") {
    return {
      format: "1v3",
      label: "Wolffn",
      wolffnPlayer: askedPlayer,
      teamA: [
        askedPlayer,
      ],
      teamB:
        teeOrder.filter(
          (playerName) =>
            playerName !== askedPlayer
        ),
    }
  }

  return null
}

function joinTeamNames(team) {
  return Array.isArray(team)
    ? team.join(" + ")
    : "-"
}

export default function Live() {
  const navigate = useNavigate()

  const {
    hole,

    currentPar,
    currentCourse,

    players,
    history,
    celebration,

    matchFinished,
    resetGame,
    hasActiveMatch,

    lowestScore,
    hasTie,

    gameMode,
    isWolffnMode,

    specialScoringEnabled,

    updateScore,
    finishHole,

    getGolfResult,
  } = useGame()

  const [
    showAbortModal,
    setShowAbortModal,
  ] = useState(false)

  const [
    showSavedFeedback,
    setShowSavedFeedback,
  ] = useState(false)

  const [
    wolffnSetup,
    setWolffnSetup,
  ] = useState({
    hole: null,
    gameMode: null,
    askedPlayer: null,
    decision: null,
  })

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

  const wolffnSetupIsCurrent =
    wolffnSetup.hole === safeHole &&
    wolffnSetup.gameMode === gameMode

  const wolffnAskedPlayer =
    wolffnSetupIsCurrent
      ? wolffnSetup.askedPlayer
      : null

  const wolffnDecision =
    wolffnSetupIsCurrent
      ? wolffnSetup.decision
      : null

  const wolffnTeeOrder =
    getWolffnTeeOrder(
      players,
      safeHole
    )

  const wolffnDecisionPlayer =
    wolffnTeeOrder[0] || null

  const wolffnAvailablePartners =
    wolffnTeeOrder.filter(
      (playerName) =>
        playerName !== wolffnDecisionPlayer
    )

  const wolffnTeams =
    getWolffnTeams({
      teeOrder: wolffnTeeOrder,
      decisionPlayer: wolffnDecisionPlayer,
      askedPlayer: wolffnAskedPlayer,
      wolffnDecision,
    })

  const wolffnSetupComplete =
    !isWolffnMode ||
    Boolean(wolffnTeams)

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

  function handleAskPartner(playerName) {
    setWolffnSetup({
      hole: safeHole,
      gameMode,
      askedPlayer: playerName,
      decision: null,
    })
  }

  function handleFinishHole() {
    if (!wolffnSetupComplete) {
      return
    }

    setShowSavedFeedback(true)

    if (isWolffnMode) {
      finishHole(wolffnTeams)
    } else {
      finishHole()
    }

    window.setTimeout(() => {
      setShowSavedFeedback(false)
    }, 650)
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
                On the Course
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <div className="inline-flex max-w-full rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
                  <span className="truncate">
                    {getCourseName(currentCourse)}
                  </span>
                </div>

                {isWolffnMode && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                    <span aria-hidden="true">
                      🐺
                    </span>
                    Wolffn
                  </div>
                )}

                {!isWolffnMode && specialScoringEnabled && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                    <Sparkles size={12} />
                    Skinz Professional
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
        </div>
      </motion.div>

      {/* Wolffn Setup */}
      {isWolffnMode && !matchFinished && (
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
            className="overflow-hidden rounded-[38px] bg-slate-950 text-white shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                    Wolffn Setup
                  </div>

                  <div className="mt-3 text-4xl font-black tracking-tight">
                    {wolffnDecisionPlayer || "-"} decides
                  </div>
                </div>

                <div
                  className="text-4xl"
                  aria-hidden="true"
                >
                  🐺
                </div>
              </div>

              <div className="mt-6 rounded-[28px] bg-white/10 p-4">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Tee Order
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {wolffnTeeOrder.map((playerName, index) => (
                    <div
                      key={`${playerName}-${index}`}
                      className={`rounded-[20px] px-3 py-3 text-center ${
                        index === 0
                          ? "bg-yellow-400 text-black"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <div className="text-xs font-black uppercase tracking-widest opacity-70">
                        {index + 1}
                      </div>

                      <div className="mt-1 truncate text-sm font-black">
                        {playerName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Ask Partner
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {wolffnAvailablePartners.map((playerName) => {
                    const isSelected =
                      wolffnAskedPlayer === playerName

                    return (
                      <button
                        key={playerName}
                        type="button"
                        onClick={() => handleAskPartner(playerName)}
                        className={`rounded-[22px] px-3 py-4 text-sm font-black transition ${
                          isSelected
                            ? "bg-yellow-400 text-black"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {playerName}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWolffnSetup({
                      hole: safeHole,
                      gameMode,
                      askedPlayer: null,
                      decision: "alone",
                    })
                  }}
                  className={`mt-3 w-full rounded-[24px] px-4 py-4 text-sm font-black transition ${
                    wolffnDecision === "alone"
                      ? "bg-yellow-400 text-black"
                      : "bg-white/10 text-white"
                  }`}
                >
                  Play Alone
                </button>
              </div>

              {wolffnAskedPlayer && (
                <div className="mt-6 rounded-[28px] bg-white/10 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                    Did {wolffnAskedPlayer} accept?
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setWolffnSetup({
                          hole: safeHole,
                          gameMode,
                          askedPlayer: wolffnAskedPlayer,
                          decision: "accepted",
                        })
                      }
                      className={`rounded-[22px] px-4 py-4 text-sm font-black transition ${
                        wolffnDecision === "accepted"
                          ? "bg-emerald-500 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      Accepted
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setWolffnSetup({
                          hole: safeHole,
                          gameMode,
                          askedPlayer: wolffnAskedPlayer,
                          decision: "declined",
                        })
                      }
                      className={`rounded-[22px] px-4 py-4 text-sm font-black transition ${
                        wolffnDecision === "declined"
                          ? "bg-red-500 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      Declined
                    </button>
                  </div>
                </div>
              )}

              {wolffnTeams && (
                <div className="mt-6 rounded-[28px] bg-white p-5 text-slate-950 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Teams
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xl font-black">
                        {joinTeamNames(wolffnTeams.teamA)}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        {wolffnTeams.label}
                      </div>
                    </div>

                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      vs
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="text-xl font-black">
                        {joinTeamNames(wolffnTeams.teamB)}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Opponents
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!wolffnSetupComplete && (
                <div className="mt-5 rounded-[24px] bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                  Choose partner response or play alone before closing the hole.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

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

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Earnings
                    </div>

                    <div
                      className={`mt-1 text-3xl font-black ${getMoneyColor(player.winnings)}`}
                    >
                      {formatMoney(player.winnings)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Skinz
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
              <div className="text-3xl font-black tracking-tight text-slate-950">
                Scorekarte
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

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-yellow-500">
                        {getSkinsLabel(item.skins || 0)} · {item.pot || 0}€
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

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

      {!matchFinished && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="relative w-full max-w-md">
            <AnimatePresence>
              {showSavedFeedback && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.6,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: -18,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.7,
                    y: -34,
                  }}
                  transition={{
                    duration: 0.24,
                    ease: "easeOut",
                  }}
                  className={`absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)] ${
                    isWolffnMode
                      ? "bg-slate-950"
                      : specialScoringEnabled
                      ? "bg-orange-500"
                      : "bg-emerald-500"
                  }`}
                >
                  <Check
                    size={30}
                    strokeWidth={3.4}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              whileTap={{
                scale: wolffnSetupComplete ? 0.98 : 1,
              }}
              disabled={!wolffnSetupComplete}
              onClick={handleFinishHole}
              className={`flex w-full items-center justify-between rounded-[32px] px-6 py-5 text-xl font-black text-white disabled:opacity-45 ${
                isWolffnMode
                  ? "bg-slate-950 shadow-[0_20px_50px_rgba(15,23,42,0.35)]"
                  : specialScoringEnabled
                  ? "bg-orange-500 shadow-[0_20px_50px_rgba(249,115,22,0.35)]"
                  : "bg-emerald-500 shadow-[0_20px_50px_rgba(16,185,129,0.35)]"
              }`}
            >
              <span>
                {!wolffnSetupComplete
                  ? "Wolffn Setup wählen"
                  : "Loch abschließen"}
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

              <div className="mt-6 text-7xl font-black tracking-tight text-yellow-500">
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
                    Skinz
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black ${getSkinColor(champion?.skins)}`}
                  >
                    {formatSkinSaldo(champion?.skins)}
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-400">
                    Earnings
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
                              {formatSkinSaldo(player.skins)} Skinz
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