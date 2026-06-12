import { useEffect, useRef, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"

import { useNavigate } from "react-router-dom"

import {
  Check,
  ChevronRight,
  Crown,
  Sparkles,
  X,
} from "lucide-react"

import AppBackground from "../components/AppBackground"
import GameModeBadge from "../components/GameModeBadge"

import { useGame } from "../context/GameContext"

import { getGameModeTheme } from "../utils/gameModeTheme"

const HOLE_COUNT = 18

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function formatEuroAmount(value) {
  const amount = roundMoney(Math.abs(value))
  const hasCents = Math.abs(amount % 1) > 0

  if (hasCents) {
    return amount.toFixed(2).replace(".", ",")
  }

  return amount.toFixed(0)
}

function formatMoney(value) {
  const amount = roundMoney(value)

  if (amount > 0) {
    return `+${formatEuroAmount(amount)}€`
  }

  if (amount < 0) {
    return `-${formatEuroAmount(amount)}€`
  }

  return "0€"
}

function formatPlainMoney(value) {
  const amount = roundMoney(value)

  return `${formatEuroAmount(amount)}€`
}

function getMoneyColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function formatSkinSaldo(value) {
  return Math.abs(toNumber(value, 0))
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

function getScoreTileStyle(label) {
  if (label === "Albatross") {
    return "bg-amber-300 text-black shadow-[0_18px_42px_rgba(251,191,36,0.34)]"
  }

  if (label === "Eagle") {
    return "bg-orange-500 text-white shadow-[0_18px_42px_rgba(249,115,22,0.34)]"
  }

  if (label === "Birdie") {
    return "bg-red-500 text-white shadow-[0_18px_42px_rgba(239,68,68,0.34)]"
  }

  if (label === "Bogey") {
    return "bg-blue-500 text-white shadow-[0_18px_42px_rgba(59,130,246,0.32)]"
  }

  if (label === "Double Bogey") {
    return "bg-blue-900 text-white shadow-[0_18px_42px_rgba(30,58,138,0.34)]"
  }

  if (label === "Triple+") {
    return "bg-purple-600 text-white shadow-[0_18px_42px_rgba(147,51,234,0.32)]"
  }

  return "bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.32)]"
}

function getResultBadgeStyle(label) {
  if (label === "Albatross") {
    return "bg-amber-300 text-black"
  }

  if (label === "Eagle") {
    return "bg-orange-500 text-white"
  }

  if (label === "Birdie") {
    return "bg-red-500 text-white"
  }

  if (label === "Bogey") {
    return "bg-blue-500 text-white"
  }

  if (label === "Double Bogey") {
    return "bg-blue-900 text-white"
  }

  if (label === "Triple+") {
    return "bg-purple-600 text-white"
  }

  return "bg-white/[0.68] text-slate-400"
}

function getToParBadgeStyle(value) {
  const amount = toNumber(value, 0)

  if (amount < 0) {
    return "bg-red-500 text-white"
  }

  if (amount > 0) {
    if (amount === 1) {
      return "bg-blue-500 text-white"
    }

    if (amount === 2) {
      return "bg-blue-900 text-white"
    }

    return "bg-purple-600 text-white"
  }

  return "bg-white/[0.68] text-slate-950"
}

function getCourseName(course) {
  return course?.name || "Erster Golfclub Westpfalz"
}

function getCourseLocation(course) {
  return course?.location || "Westpfalz"
}

function getCoursePar(course) {
  return course?.par || 72
}

function getCourseMeta(course) {
  return `${getCourseLocation(course)} · Par ${getCoursePar(course)}`
}

function getSpecialLabelForScore(score, par, specialScoringEnabled) {
  if (!specialScoringEnabled) {
    return null
  }

  const toPar = toNumber(score, par) - toNumber(par, 0)

  if (toPar <= -2) {
    return "Eagle 3 Skinz"
  }

  if (toPar === -1) {
    return "Birdie 2 Skinz"
  }

  return null
}

function getResultLabelFromScore(score, par) {
  const safePar = toNumber(par, 4)
  const scoreToPar = toNumber(score, safePar) - safePar

  if (scoreToPar <= -3) {
    return "Albatross"
  }

  if (scoreToPar === -2) {
    return "Eagle"
  }

  if (scoreToPar === -1) {
    return "Birdie"
  }

  if (scoreToPar === 0) {
    return "Par"
  }

  if (scoreToPar === 1) {
    return "Bogey"
  }

  if (scoreToPar === 2) {
    return "Double Bogey"
  }

  return "Triple+"
}

function getHistoryScore(item) {
  const possibleScores = [
    item?.winningScore,
    item?.winnerScore,
    item?.lowestScore,
    item?.bestScore,
    item?.score,
  ]

  const foundScore = possibleScores.find((value) =>
    Number.isFinite(Number(value))
  )

  return foundScore === undefined ? null : toNumber(foundScore, null)
}

function getHistoryResultLabel(item) {
  if (item?.result) {
    return item.result
  }

  if (item?.golfResult?.label) {
    return item.golfResult.label
  }

  if (item?.winningResult) {
    return item.winningResult
  }

  if (item?.winnerResult) {
    return item.winnerResult
  }

  const historyScore = getHistoryScore(item)

  if (historyScore === null) {
    return null
  }

  return getResultLabelFromScore(historyScore, item?.par || 4)
}

function getHistoryResultSummary(item) {
  const resultLabel = getHistoryResultLabel(item)

  if (item?.hasTie) {
    if (resultLabel) {
      return `Mit ${resultLabel} geteilt`
    }

    return "Loch geteilt"
  }

  if (resultLabel) {
    return `Mit ${resultLabel} gewonnen`
  }

  return "Loch gewonnen"
}

function getSkinsLabel(value) {
  const amount = toNumber(value, 0)

  return amount === 1 ? "1 Skin" : `${amount} Skins`
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

function formatHoleListLabel(holes) {
  if (!Array.isArray(holes) || holes.length === 0) {
    return null
  }

  return holes.map((holeNumber) => String(holeNumber)).join(" + ")
}

function buildHistoryDisplayItems(history) {
  const openCarryoverHoles = []

  if (!Array.isArray(history)) {
    return []
  }

  return history.map((item) => {
    if (item?.hasTie) {
      openCarryoverHoles.push(item.hole)

      return {
        ...item,
        displayWonHoles: [],
      }
    }

    const displayWonHoles = [...openCarryoverHoles, item.hole]

    openCarryoverHoles.length = 0

    return {
      ...item,
      displayWonHoles,
    }
  })
}

function getWolffnTeeOrder(players, hole) {
  const playerNames = players.map((player) => player.name)

  if (playerNames.length !== 4) {
    return playerNames
  }

  const offset = (Math.max(toNumber(hole, 1), 1) - 1) % playerNames.length

  return [...playerNames.slice(offset), ...playerNames.slice(0, offset)]
}

function getWolffnTeams({
  teeOrder,
  decisionPlayer,
  askedPlayer,
  wolffnDecision,
}) {
  if (!Array.isArray(teeOrder) || teeOrder.length !== 4 || !decisionPlayer) {
    return null
  }

  if (wolffnDecision === "alone") {
    return {
      format: "1v3",
      label: "Wolffn",
      wolffnPlayer: decisionPlayer,
      teamA: [decisionPlayer],
      teamB: teeOrder.filter((playerName) => playerName !== decisionPlayer),
    }
  }

  if (!askedPlayer) {
    return null
  }

  if (wolffnDecision === "accepted") {
    const teamA = [decisionPlayer, askedPlayer]
    const teamB = teeOrder.filter((playerName) => !teamA.includes(playerName))

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
      teamA: [askedPlayer],
      teamB: teeOrder.filter((playerName) => playerName !== askedPlayer),
    }
  }

  return null
}

function joinTeamNames(team) {
  return Array.isArray(team) ? team.join(" + ") : "-"
}

function StatusPill({ children }) {
  return (
    <span className="inline-flex rounded-full border border-white/70 bg-white/[0.46] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 backdrop-blur-xl">
      {children}
    </span>
  )
}

export default function LiveScoringScreen() {
  const navigate = useNavigate()

  const scoreEntryRef = useRef(null)

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

    gameMode,
    isWolffnMode,

    specialScoringEnabled,

    updateScore,
    finishHole,

    getGolfResult,
  } = useGame()

  const safePlayers = Array.isArray(players) ? players : []
  const safeHistory = Array.isArray(history) ? history : []

  const [showAbortModal, setShowAbortModal] = useState(false)
  const [showSavedFeedback, setShowSavedFeedback] = useState(false)

  const [wolffnSetup, setWolffnSetup] = useState({
    hole: null,
    gameMode: null,
    askedPlayer: null,
    decision: null,
  })

  const isProfessionalMode = !isWolffnMode && specialScoringEnabled

  const modeTheme = getGameModeTheme({
    gameMode,
    isWolffn: isWolffnMode,
    isProfessional: isProfessionalMode,
  })

  const sortedPlayers = [...safePlayers].sort(
    (a, b) =>
      toNumber(b.winnings, 0) - toNumber(a.winnings, 0) ||
      toNumber(a.totalToPar, 0) - toNumber(b.totalToPar, 0)
  )

  const champion = sortedPlayers[0] || null

  const historyDisplayItems = buildHistoryDisplayItems(safeHistory)

  const safeHole = Math.min(Math.max(toNumber(hole, 1), 1), HOLE_COUNT)

  const wolffnSetupIsCurrent =
    wolffnSetup.hole === safeHole && wolffnSetup.gameMode === gameMode

  const wolffnAskedPlayer = wolffnSetupIsCurrent
    ? wolffnSetup.askedPlayer
    : null

  const wolffnDecision = wolffnSetupIsCurrent ? wolffnSetup.decision : null

  const wolffnTeeOrder = getWolffnTeeOrder(safePlayers, safeHole)

  const wolffnDecisionPlayer = wolffnTeeOrder[0] || null

  const wolffnAvailablePartners = wolffnTeeOrder.filter(
    (playerName) => playerName !== wolffnDecisionPlayer
  )

  const wolffnTeams = getWolffnTeams({
    teeOrder: wolffnTeeOrder,
    decisionPlayer: wolffnDecisionPlayer,
    askedPlayer: wolffnAskedPlayer,
    wolffnDecision,
  })

  const wolffnSetupComplete = !isWolffnMode || Boolean(wolffnTeams)

  useEffect(() => {
    if (!hasActiveMatch || matchFinished) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      scoreEntryRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      })
    }, 120)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [hasActiveMatch, matchFinished, safeHole])

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

  function handleScoreSwipe({
    playerIndex,
    playerScore,
    offsetY,
    velocityY,
  }) {
    if (matchFinished) {
      return
    }

    const shouldIncrease = offsetY < -28 || velocityY < -420
    const shouldDecrease = offsetY > 28 || velocityY > 420

    if (shouldIncrease) {
      updateScore(playerIndex, playerScore + 1)
      return
    }

    if (shouldDecrease) {
      updateScore(playerIndex, Math.max(1, playerScore - 1))
    }
  }

  function handleScoreKeyDown(event, playerIndex, playerScore) {
    if (matchFinished) {
      return
    }

    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault()
      updateScore(playerIndex, playerScore + 1)
      return
    }

    if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault()
      updateScore(playerIndex, Math.max(1, playerScore - 1))
    }
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
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] px-6 text-slate-950">
        <AppBackground />

        <div className="relative w-full max-w-sm overflow-hidden rounded-[40px] border border-white/20 bg-[#071819] p-8 text-center text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]">
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t ${modeTheme.glow}`}
          />

          <div className="relative">
            <div
              className={`text-[12px] font-black uppercase tracking-[0.24em] ${modeTheme.textDark}`}
            >
              Live Scoring
            </div>

            <div className="mt-5 text-5xl font-black tracking-[-0.06em]">
              Keine Runde
            </div>

            <div className="mt-4 text-sm font-semibold leading-relaxed text-slate-400">
              Starte zuerst eine neue Runde, damit Scores geändert und Löcher
              abgeschlossen werden können.
            </div>

            <button
              type="button"
              onClick={() => navigate("/round")}
              className="mt-8 w-full rounded-[28px] border border-white/90 bg-white py-5 text-lg font-black text-slate-950 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.95)]"
            >
              Runde starten
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-3 w-full rounded-[28px] border border-white/15 bg-white/10 py-5 text-lg font-black text-slate-300 backdrop-blur-xl"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#e8ebe5] pb-[calc(9.5rem+env(safe-area-inset-bottom))] text-slate-950">
      <AppBackground />

      <div className="relative px-5 pt-9">
        <div className="mx-auto max-w-md">
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
            className="pt-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill>{matchFinished ? "Beendet" : "Live"}</StatusPill>

                  <GameModeBadge
                    gameMode={gameMode}
                    isWolffn={isWolffnMode}
                    isProfessional={isProfessionalMode}
                  />
                </div>

                <h1 className="mt-4 text-[4rem] font-black leading-none tracking-[-0.075em] text-slate-950">
                  Loch {safeHole}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="text-[1.45rem] font-black leading-none tracking-[-0.055em] text-slate-600">
                    Par {currentPar}
                  </div>

                  <div className={`h-1 w-1 rounded-full ${modeTheme.dot}`} />

                  <div className="min-w-0 truncate text-sm font-bold text-slate-500">
                    {getCourseName(currentCourse)}
                  </div>
                </div>
              </div>

              {!matchFinished && (
                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={handleCloseLive}
                  aria-label="Live-Ansicht schließen"
                  className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.24)]"
                >
                  <X size={21} />
                </motion.button>
              )}
            </div>
          </motion.div>

          {isWolffnMode && !matchFinished && (
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
                delay: 0.06,
                duration: 0.3,
                ease: "easeOut",
              }}
              className="mt-5 overflow-hidden rounded-[32px] border border-white/20 bg-[#071819] text-white shadow-[0_22px_55px_rgba(7,24,25,0.30)]"
            >
              <div className="relative p-5">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-500/28 via-slate-500/8 to-transparent"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                        Wolffn Setup
                      </div>

                      <div className="mt-2 truncate text-3xl font-black tracking-[-0.05em]">
                        {wolffnDecisionPlayer || "-"} entscheidet
                      </div>
                    </div>

                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm"
                      aria-hidden="true"
                    >
                      🐺
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {wolffnTeeOrder.map((playerName, index) => (
                      <div
                        key={`${playerName}-${index}`}
                        className={`rounded-[18px] px-2 py-2.5 text-center ${
                          index === 0
                            ? "bg-white text-slate-950"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-70">
                          {index + 1}
                        </div>

                        <div className="mt-1 truncate text-xs font-black">
                          {playerName}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {wolffnAvailablePartners.map((playerName) => {
                      const isSelected = wolffnAskedPlayer === playerName

                      return (
                        <button
                          key={playerName}
                          type="button"
                          onClick={() => handleAskPartner(playerName)}
                          className={`rounded-[20px] px-3 py-3 text-xs font-black transition ${
                            isSelected
                              ? "bg-white text-slate-950"
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
                    className={`mt-2 w-full rounded-[20px] px-4 py-3 text-xs font-black transition ${
                      wolffnDecision === "alone"
                        ? "bg-white text-slate-950"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    Alleine spielen
                  </button>

                  {wolffnAskedPlayer && (
                    <div className="mt-4 rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur-xl">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Hat {wolffnAskedPlayer} angenommen?
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
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
                          className={`rounded-[18px] px-4 py-3 text-xs font-black transition ${
                            wolffnDecision === "accepted"
                              ? "bg-emerald-500 text-white"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          Ja
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
                          className={`rounded-[18px] px-4 py-3 text-xs font-black transition ${
                            wolffnDecision === "declined"
                              ? "bg-red-500 text-white"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          Nein
                        </button>
                      </div>
                    </div>
                  )}

                  {wolffnTeams && (
                    <div className="mt-4 rounded-[24px] border border-white/70 bg-white p-4 text-slate-950 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black tracking-[-0.035em]">
                            {joinTeamNames(wolffnTeams.teamA)}
                          </div>

                          <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {wolffnTeams.label}
                          </div>
                        </div>

                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          vs
                        </div>

                        <div className="min-w-0 text-right">
                          <div className="truncate text-base font-black tracking-[-0.035em]">
                            {joinTeamNames(wolffnTeams.teamB)}
                          </div>

                          <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Gegner
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!wolffnSetupComplete && (
                    <div className="mt-4 rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">
                      Partner-Antwort wählen oder alleine spielen.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={scoreEntryRef} className="mt-5 space-y-4 scroll-mt-5">
            {safePlayers.map((player, index) => {
              const playerScore = toNumber(player.score, currentPar)
              const isWinning = playerScore === lowestScore
              const golfResult = getGolfResult(playerScore, currentPar)
              const currentToPar = playerScore - currentPar
              const playerSpecialLabel = getSpecialLabelForScore(
                playerScore,
                currentPar,
                specialScoringEnabled
              )

              return (
                <motion.div
                  key={player.name}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.025,
                    duration: 0.22,
                    ease: "easeOut",
                  }}
                  className={`rounded-[32px] border px-6 py-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition ${
                    isWinning
                      ? `${modeTheme.activeBorder} ${modeTheme.activeSoftBg}`
                      : "border-white/70 bg-white/[0.46]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[2.15rem] font-black leading-none tracking-[-0.07em] text-slate-950">
                        {player.name}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm ${getResultBadgeStyle(
                            golfResult.label
                          )}`}
                        >
                          {golfResult.label}
                        </div>

                        <div
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm ${getToParBadgeStyle(
                            currentToPar
                          )}`}
                        >
                          {formatToPar(currentToPar)}
                        </div>

                        {isWinning &&
                          specialScoringEnabled &&
                          playerSpecialLabel && (
                            <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                              <Sparkles size={10} />
                              {playerSpecialLabel}
                            </div>
                          )}
                      </div>
                    </div>

                    <motion.div
                      role="button"
                      tabIndex={matchFinished ? -1 : 0}
                      drag={matchFinished ? false : "y"}
                      dragConstraints={{
                        top: 0,
                        bottom: 0,
                      }}
                      dragElastic={0.16}
                      whileTap={{
                        scale: matchFinished ? 1 : 0.96,
                      }}
                      onDragEnd={(event, info) => {
                        handleScoreSwipe({
                          playerIndex: index,
                          playerScore,
                          offsetY: info.offset.y,
                          velocityY: info.velocity.y,
                        })
                      }}
                      onKeyDown={(event) => {
                        handleScoreKeyDown(event, index, playerScore)
                      }}
                      aria-label={`Score von ${player.name} per Wisch ändern. Nach oben erhöht, nach unten verringert.`}
                      aria-disabled={matchFinished}
                      className={`grid h-[6.55rem] w-[6.55rem] shrink-0 touch-none select-none place-items-center rounded-[32px] text-center outline-none transition focus-visible:ring-4 focus-visible:ring-slate-200 ${
                        matchFinished
                          ? "cursor-default"
                          : "cursor-grab active:cursor-grabbing"
                      } ${getScoreTileStyle(golfResult.label)}`}
                    >
                      <span className="flex h-full w-full items-center justify-center tabular-nums text-[4.8rem] font-black leading-none tracking-[-0.015em]">
                        {playerScore}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>

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
              delay: 0.1,
              duration: 0.32,
              ease: "easeOut",
            }}
            className="mt-7 rounded-[32px] border border-white/70 bg-white/[0.48] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.09)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
                  Scorecard
                </div>
              </div>

              <GameModeBadge
                gameMode={gameMode}
                isWolffn={isWolffnMode}
                isProfessional={isProfessionalMode}
                className="px-3"
              />
            </div>

            <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {safeHistory.length}/{HOLE_COUNT}
            </div>

            <div className="mt-5 space-y-2.5">
              {safeHistory.length === 0 && (
                <div className="rounded-[24px] border border-white/70 bg-white/[0.40] p-4 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                  Noch kein Score auf der Karte.
                </div>
              )}

              {historyDisplayItems
                .slice()
                .reverse()
                .map((item, index) => {
                  const historySpecialLabel = getHistorySpecialLabel(item)
                  const historyResultSummary = getHistoryResultSummary(item)
                  const wonHolesLabel = formatHoleListLabel(
                    item.displayWonHoles
                  )

                  return (
                    <div
                      key={`${item.hole}-${item.winner || "carryover"}-${index}`}
                      className="rounded-[24px] border border-white/70 bg-white/[0.42] px-4 py-3 shadow-sm backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-black tracking-[-0.035em] text-slate-950">
                              Loch {item.hole}
                            </div>

                            {historySpecialLabel && (
                              <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                                <Sparkles size={9} />
                                {historySpecialLabel}
                              </div>
                            )}
                          </div>

                          <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Par {item.par}
                          </div>

                          <div className="mt-2 rounded-full bg-white/[0.62] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                            {historyResultSummary}
                          </div>

                          {!item.hasTie && wonHolesLabel && (
                            <div className="mt-2">
                              <div className="inline-flex w-fit max-w-full rounded-full bg-slate-950 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                                Holes: {wonHolesLabel}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-lg font-black tracking-[-0.035em] text-slate-950">
                            {item.hasTie ? "Carryover" : item.winner}
                          </div>

                          <div
                            className={`mt-1 text-[9px] font-black uppercase tracking-widest ${
                              item.hasTie
                                ? "text-slate-950"
                                : "text-amber-500"
                            }`}
                          >
                            {getSkinsLabel(item.skins || 0)} ·{" "}
                            {formatPlainMoney(item.pot || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </motion.div>

          {!matchFinished && (
            <motion.button
              type="button"
              whileTap={{
                scale: 0.98,
              }}
              onClick={() => setShowAbortModal(true)}
              className="mt-5 w-full rounded-[28px] border border-red-100 bg-white/[0.46] py-4 text-sm font-black text-red-500 shadow-sm backdrop-blur-xl"
            >
              Match abbrechen
            </motion.button>
          )}
        </div>
      </div>

      {!matchFinished && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-[calc(1.35rem+env(safe-area-inset-bottom))]">
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
                  className={`absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)] ${modeTheme.button}`}
                >
                  <Check size={30} strokeWidth={3.4} />
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
              className={`flex w-full items-center justify-between rounded-[32px] px-6 py-5 text-xl font-black text-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] transition disabled:cursor-not-allowed disabled:opacity-45 ${modeTheme.button} ${modeTheme.buttonHover}`}
            >
              <span>
                {!wolffnSetupComplete
                  ? "Wolffn Setup wählen"
                  : "Loch abschließen"}
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <ChevronRight size={23} />
              </span>
            </motion.button>
          </div>
        </div>
      )}

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
              className="relative w-full max-w-sm overflow-hidden rounded-[42px] border border-white/20 bg-[#071819] p-10 text-center text-white shadow-2xl"
            >
              <div
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t ${modeTheme.glow}`}
              />

              <div className="relative">
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

                <div className="mt-6 text-6xl font-black tracking-[-0.06em]">
                  {celebration.player}
                </div>

                <div className="mt-4 text-lg font-bold text-slate-400">
                  holt {celebration.skins || 1}{" "}
                  {(celebration.skins || 1) === 1 ? "Skin" : "Skins"}
                </div>

                <div className="mt-6 text-7xl font-black tracking-[-0.07em] text-amber-300">
                  {formatMoney(celebration.pot)}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="mx-auto w-full max-w-md overflow-hidden rounded-[44px] border border-white/70 bg-white/[0.82] p-8 text-center shadow-2xl backdrop-blur-2xl"
            >
              <motion.div
                animate={{
                  rotate: [0, -4, 4, 0],
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

              <div
                className={`mt-6 text-[12px] font-black uppercase tracking-[0.28em] ${modeTheme.text}`}
              >
                Am 19. Loch
              </div>

              <h2 className="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">
                {champion?.name || "Winner"}
              </h2>

              <div className="mt-3 inline-flex max-w-full rounded-full border border-white/70 bg-white/[0.46] px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
                <span className="truncate">{getCourseName(currentCourse)}</span>
              </div>

              <div className="mt-2 text-sm font-bold text-slate-500">
                {getCourseMeta(currentCourse)}
              </div>

              <div
                className={`mt-5 text-5xl font-black tracking-[-0.06em] ${getMoneyColor(
                  champion?.winnings
                )}`}
              >
                {formatMoney(champion?.winnings)}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="rounded-[24px] border border-white/70 bg-white/[0.48] p-4 shadow-sm backdrop-blur-xl">
                  <div className="text-sm font-bold text-slate-500">Skinz</div>

                  <div
                    className={`mt-2 whitespace-nowrap text-[2rem] font-black leading-none tracking-[-0.045em] ${getSkinColor(
                      champion?.skins
                    )}`}
                  >
                    {formatSkinSaldo(champion?.skins)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/[0.48] p-4 shadow-sm backdrop-blur-xl">
                  <div className="text-sm font-bold text-slate-500">
                    Earnings
                  </div>

                  <div
                    className={`mt-2 whitespace-nowrap text-[1.85rem] font-black leading-none tracking-[-0.045em] ${getMoneyColor(
                      champion?.winnings
                    )}`}
                  >
                    {formatMoney(champion?.winnings)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/[0.48] p-4 shadow-sm backdrop-blur-xl">
                  <div className="text-sm font-bold text-slate-500">
                    To Par
                  </div>

                  <div
                    className={`mt-2 whitespace-nowrap text-[2rem] font-black leading-none tracking-[-0.045em] ${getToParColor(
                      champion?.totalToPar
                    )}`}
                  >
                    {formatToPar(champion?.totalToPar)}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[32px] border border-white/70 bg-white/[0.42] p-4 text-left shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                      Final Scores
                    </div>

                    <div className="mt-1 text-2xl font-black tracking-[-0.045em] text-slate-950">
                      Leaderboard
                    </div>
                  </div>

                  <div className="text-3xl" aria-hidden="true">
                    🏆
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {sortedPlayers.map((player, index) => {
                    const isChampion = player.name === champion?.name

                    return (
                      <div
                        key={player.name}
                        className={`flex items-center justify-between rounded-[24px] border px-4 py-4 shadow-sm ${
                          isChampion
                            ? `${modeTheme.activeBorder} ${modeTheme.activeSoftBg}`
                            : "border-white/70 bg-white/[0.54]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              index === 0
                                ? "bg-amber-300 text-black"
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
                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                  <Crown size={10} />
                                  Winner
                                </div>
                              )}
                            </div>

                            <div
                              className={`mt-1 text-xs font-black uppercase tracking-widest ${getSkinColor(
                                player.skins
                              )}`}
                            >
                              {formatSkinSaldo(player.skins)} Skinz
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div
                            className={`text-2xl font-black ${getMoneyColor(
                              player.winnings
                            )}`}
                          >
                            {formatMoney(player.winnings)}
                          </div>

                          <div
                            className={`mt-1 text-xs font-black uppercase tracking-widest ${getToParColor(
                              player.totalToPar
                            )}`}
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
                  className={`w-full rounded-[30px] py-5 text-lg font-black text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)] ${modeTheme.button} ${modeTheme.buttonHover}`}
                >
                  Neue Runde starten
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={handleGoHome}
                  className="w-full rounded-[30px] border border-white/70 bg-white/[0.58] py-5 text-lg font-black text-slate-500 shadow-sm backdrop-blur-xl"
                >
                  Home
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="w-full max-w-sm overflow-hidden rounded-[40px] border border-white/70 bg-white/[0.78] shadow-2xl backdrop-blur-2xl"
            >
              <div className="p-7 text-center">
                <div
                  id="abort-match-title"
                  className="text-3xl font-black tracking-[-0.045em] text-slate-950"
                >
                  Match abbrechen?
                </div>

                <div className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
                  Dieses Match wird gelöscht und nicht gespeichert.
                </div>
              </div>

              <div className="border-t border-white/70">
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
                  className="w-full border-t border-white/70 py-5 text-sm font-black text-red-500"
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