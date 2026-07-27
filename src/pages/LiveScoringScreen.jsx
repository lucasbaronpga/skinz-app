import { useEffect, useRef, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Check, ChevronRight, Crown, Sparkles, X } from "lucide-react"

import AppBackground from "../components/AppBackground"
import GameModeBadge from "../components/GameModeBadge"
import { getOozleSettlementRows, useGame } from "../context/GameContext"
import { getGameModeTheme } from "../utils/gameModeTheme"

const HOLE_COUNT = 18

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase()
}

function formatEuroAmount(value) {
  const amount = roundMoney(Math.abs(value))
  const hasCents = Math.abs(amount % 1) > 0

  if (hasCents) return amount.toFixed(2).replace(".", ",")
  return amount.toFixed(0)
}

function formatMoney(value) {
  const amount = roundMoney(value)

  if (amount > 0) return `+${formatEuroAmount(amount)}€`
  if (amount < 0) return `-${formatEuroAmount(amount)}€`
  return "0€"
}

function formatPlainMoney(value) {
  return `${formatEuroAmount(value)}€`
}

function formatCelebrationSpecialLabel(value) {
  return String(value || "").replaceAll("Skins", "Skinz")
}

function getMoneyColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) return "text-amber-500"
  if (amount < 0) return "text-red-500"
  return "text-slate-950"
}

function getDarkMoneyColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) return "text-amber-300"
  if (amount < 0) return "text-red-300"
  return "text-white"
}

function getPlayerWonSkinz(player) {
  if (!player) return 0
  return Math.max(toNumber(player?.skins, 0), 0)
}

function getSettlementRows({ player, players, stake }) {
  if (!player || !Array.isArray(players)) return []

  const playerSkinz = getPlayerWonSkinz(player)
  const safeStake = toNumber(stake, 0)

  return players
    .filter((opponent) => normalizeName(opponent?.name) !== normalizeName(player?.name))
    .map((opponent) => {
      const opponentSkinz = getPlayerWonSkinz(opponent)
      const skinzDifference = playerSkinz - opponentSkinz
      const amount = roundMoney(skinzDifference * safeStake)

      return {
        opponentName: opponent?.name || "Player",
        opponentSkinz,
        skinzDifference,
        amount,
      }
    })
}

function formatSettlementAction(row) {
  if (row.amount > 0) return `bekommt von ${row.opponentName}`
  if (row.amount < 0) return `zahlt an ${row.opponentName}`
  return `ausgeglichen mit ${row.opponentName}`
}

function getPlayerOozleSettlementRows(players, player) {
  if (!player) return []
  if (Array.isArray(player?.oozleSettlementRows) && player.oozleSettlementRows.length > 0) {
    return player.oozleSettlementRows
  }
  return getOozleSettlementRows(players, player.name)
}

function getOozleAmountAgainstOpponent(players, player, opponentName) {
  const row = getPlayerOozleSettlementRows(players, player).find(
    (item) => normalizeName(item?.opponentName) === normalizeName(opponentName)
  )
  return roundMoney(row?.amount)
}

function getFinalSettlementPayments(players, stake) {
  if (!Array.isArray(players) || players.length < 2) return []

  const safeStake = toNumber(stake, 0)
  const payments = []

  for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
    const player = players[playerIndex]

    for (let opponentIndex = playerIndex + 1; opponentIndex < players.length; opponentIndex += 1) {
      const opponent = players[opponentIndex]
      const skinzAmount = roundMoney(
        (getPlayerWonSkinz(player) - getPlayerWonSkinz(opponent)) * safeStake
      )
      const oozleAmount = getOozleAmountAgainstOpponent(players, player, opponent?.name)
      const combinedAmount = roundMoney(skinzAmount + oozleAmount)

      if (combinedAmount > 0) {
        payments.push({
          from: opponent?.name || "Player",
          to: player?.name || "Player",
          amount: combinedAmount,
        })
      } else if (combinedAmount < 0) {
        payments.push({
          from: player?.name || "Player",
          to: opponent?.name || "Player",
          amount: Math.abs(combinedAmount),
        })
      }
    }
  }

  return payments
}

function formatToPar(value) {
  const amount = toNumber(value, 0)

  if (amount === 0) return "E"
  if (amount > 0) return `+${amount}`
  return amount
}

function getToParColor(value) {
  const amount = toNumber(value, 0)

  if (amount < 0) return "text-emerald-500"
  if (amount > 0) return "text-red-500"
  return "text-slate-950"
}

function getScoreTileStyle(label) {
  if (label === "Albatross") return "bg-amber-300 text-black shadow-[0_18px_42px_rgba(251,191,36,0.34)]"
  if (label === "Eagle") return "bg-orange-500 text-white shadow-[0_18px_42px_rgba(249,115,22,0.34)]"
  if (label === "Birdie") return "bg-red-500 text-white shadow-[0_18px_42px_rgba(239,68,68,0.34)]"
  if (label === "Bogey") return "bg-blue-500 text-white shadow-[0_18px_42px_rgba(59,130,246,0.32)]"
  if (label === "Double Bogey") return "bg-blue-900 text-white shadow-[0_18px_42px_rgba(30,58,138,0.34)]"
  if (label === "Triple+") return "bg-purple-600 text-white shadow-[0_18px_42px_rgba(147,51,234,0.32)]"
  return "bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.32)]"
}

function getResultBadgeStyle(label) {
  if (label === "Albatross") return "bg-amber-300 text-black"
  if (label === "Eagle") return "bg-orange-500 text-white"
  if (label === "Birdie") return "bg-red-500 text-white"
  if (label === "Bogey") return "bg-blue-500 text-white"
  if (label === "Double Bogey") return "bg-blue-900 text-white"
  if (label === "Triple+") return "bg-purple-600 text-white"
  return "bg-white/[0.68] text-slate-400"
}

function getSpecialBadgeStyle(label) {
  const safeLabel = String(label || "")

  if (safeLabel.includes("Birdie")) return "bg-red-500 text-white"
  if (safeLabel.includes("Eagle")) return "bg-orange-500 text-white"
  if (safeLabel.includes("Albatross")) return "bg-amber-300 text-black"
  return "bg-orange-500 text-white"
}

function getCourseName(course) {
  return course?.name || "Erster Golfclub Westpfalz"
}

function getResultLabelFromScore(score, par) {
  const safePar = toNumber(par, 4)
  const scoreToPar = toNumber(score, safePar) - safePar

  if (scoreToPar <= -3) return "Albatross"
  if (scoreToPar === -2) return "Eagle"
  if (scoreToPar === -1) return "Birdie"
  if (scoreToPar === 0) return "Par"
  if (scoreToPar === 1) return "Bogey"
  if (scoreToPar === 2) return "Double Bogey"
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

  const foundScore = possibleScores.find((value) => Number.isFinite(Number(value)))
  return foundScore === undefined ? null : toNumber(foundScore, null)
}

function getHistoryResultLabel(item) {
  if (item?.result) return item.result
  if (item?.golfResult?.label) return item.golfResult.label
  if (item?.winningResult) return item.winningResult
  if (item?.winnerResult) return item.winnerResult

  const historyScore = getHistoryScore(item)
  if (historyScore === null) return null

  return getResultLabelFromScore(historyScore, item?.par || 4)
}

function getHistoryResultSummary(item) {
  const resultLabel = getHistoryResultLabel(item)

  if (item?.hasTie) return resultLabel ? `Mit ${resultLabel} geteilt` : "Loch geteilt"
  return resultLabel ? `Mit ${resultLabel} gewonnen` : "Loch gewonnen"
}

function getSkinsLabel(value) {
  const amount = toNumber(value, 0)
  return amount === 1 ? "1 Skin" : `${amount} Skinz`
}

function getHistorySpecialLabel(item) {
  if (!item?.specialScoringEnabled) return null
  if (item.specialScoringLabel) return item.specialScoringLabel
  if (item.bonusResult) return item.bonusResult
  return null
}

function formatHoleListLabel(holes) {
  if (!Array.isArray(holes) || holes.length === 0) return null
  return holes.map((holeNumber) => String(holeNumber)).join(" + ")
}

function buildHistoryDisplayItems(history) {
  const openCarryoverHoles = []
  if (!Array.isArray(history)) return []

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

  if (playerNames.length !== 4) return playerNames

  const offset = (Math.max(toNumber(hole, 1), 1) - 1) % playerNames.length
  return [...playerNames.slice(offset), ...playerNames.slice(0, offset)]
}

function getWolffnTeams({ teeOrder, decisionPlayer, askedPlayer, wolffnDecision }) {
  if (!Array.isArray(teeOrder) || teeOrder.length !== 4 || !decisionPlayer) return null

  if (wolffnDecision === "alone") {
    return {
      format: "1v3",
      label: "Wolffn",
      wolffnPlayer: decisionPlayer,
      teamA: [decisionPlayer],
      teamB: teeOrder.filter((playerName) => playerName !== decisionPlayer),
    }
  }

  if (!askedPlayer) return null

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
    <span className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/70 bg-white/[0.46] px-3 py-1 text-center text-[10px] font-black uppercase leading-none tracking-[0.2em] text-slate-600 backdrop-blur-xl">
      {children}
    </span>
  )
}

function ScoreInputTile({ disabled, golfResultLabel, onSwipe, onKeyDown, playerName, playerScore }) {
  return (
    <motion.div
      role="button"
      tabIndex={disabled ? -1 : 0}
      drag={disabled ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.16}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onDragEnd={(event, info) => onSwipe(info)}
      onKeyDown={onKeyDown}
      aria-label={`Score von ${playerName} per Wisch ändern. Nach oben erhöht, nach unten verringert.`}
      aria-disabled={disabled}
      className={`grid h-[6.55rem] w-[6.55rem] shrink-0 touch-none select-none place-items-center rounded-[32px] text-center outline-none transition focus-visible:ring-4 focus-visible:ring-slate-200 ${
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${getScoreTileStyle(golfResultLabel)}`}
    >
      <span className="flex h-full w-full -translate-y-[0.035em] items-center justify-center tabular-nums text-[4.8rem] font-black leading-none tracking-[-0.015em]">
        {playerScore}
      </span>
    </motion.div>
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
    oozleConfig,
    oozleCarryover,
    stake,
    updateScore,
    finishHole,
    finishHoleLoading,
    finishHoleError,
    getGolfResult,
  } = useGame()

  const safePlayers = Array.isArray(players) ? players : []
  const safeHistory = Array.isArray(history) ? history : []

  const [showAbortModal, setShowAbortModal] = useState(false)
  const [showSavedFeedback, setShowSavedFeedback] = useState(false)
  const [selectedSettlementPlayer, setSelectedSettlementPlayer] = useState(null)
  const [oozleSetup, setOozleSetup] = useState({
    hole: null,
    playerName: null,
    putts: null,
    noGreen: false,
  })
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
      toNumber(b.skins, 0) - toNumber(a.skins, 0) ||
      toNumber(a.totalToPar, 0) - toNumber(b.totalToPar, 0)
  )

  const champion = sortedPlayers[0] || null
  const championWonSkinz = getPlayerWonSkinz(champion)
  const showOozleSettlement = Boolean(oozleConfig?.enabled) || safePlayers.some((player) => Math.abs(toNumber(player?.oozleWinnings, 0)) > 0)
  const historyDisplayItems = buildHistoryDisplayItems(safeHistory)
  const safeHole = Math.min(Math.max(toNumber(hole, 1), 1), HOLE_COUNT)
  const selectedSettlementRows = getSettlementRows({
    player: selectedSettlementPlayer,
    players: safePlayers,
    stake,
  })
  const finalSettlementPayments = getFinalSettlementPayments(safePlayers, stake)
  const selectedOozleSettlementRows = getPlayerOozleSettlementRows(
    safePlayers,
    selectedSettlementPlayer
  )

  const wolffnSetupIsCurrent = wolffnSetup.hole === safeHole && wolffnSetup.gameMode === gameMode
  const wolffnAskedPlayer = wolffnSetupIsCurrent ? wolffnSetup.askedPlayer : null
  const wolffnDecision = wolffnSetupIsCurrent ? wolffnSetup.decision : null
  const wolffnTeeOrder = getWolffnTeeOrder(safePlayers, safeHole)
  const wolffnDecisionPlayer = wolffnTeeOrder[0] || null
  const wolffnAvailablePartners = wolffnTeeOrder.filter((playerName) => playerName !== wolffnDecisionPlayer)
  const wolffnTeams = getWolffnTeams({
    teeOrder: wolffnTeeOrder,
    decisionPlayer: wolffnDecisionPlayer,
    askedPlayer: wolffnAskedPlayer,
    wolffnDecision,
  })
  const wolffnSetupComplete = !isWolffnMode || Boolean(wolffnTeams)
  const oozleEnabled = Boolean(oozleConfig?.enabled) && !isWolffnMode
  const oozleRequired = oozleEnabled && currentPar === 3 && !matchFinished
  const oozleSetupIsCurrent = oozleSetup.hole === safeHole
  const oozlePlayerName = oozleSetupIsCurrent ? oozleSetup.playerName : null
  const oozlePutts = oozleSetupIsCurrent ? oozleSetup.putts : null
  const oozleNoGreen = oozleSetupIsCurrent ? oozleSetup.noGreen : false
  const oozleSetupComplete =
    !oozleRequired ||
    oozleNoGreen ||
    (Boolean(oozlePlayerName) && [1, 2, 3].includes(oozlePutts))
  const holeSetupComplete = wolffnSetupComplete && oozleSetupComplete
  const oozleUnitsAtStake = Math.max(toNumber(oozleCarryover, 0), 1)
  const oozleAmountPerOpponent = roundMoney(
    oozleUnitsAtStake * toNumber(oozleConfig?.value, 0)
  )

  useEffect(() => {
    if (!hasActiveMatch || matchFinished) return undefined

    const timeoutId = window.setTimeout(() => {
      scoreEntryRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      })
    }, 120)

    return () => window.clearTimeout(timeoutId)
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

  function handleSelectOozlePlayer(playerName) {
    setOozleSetup({
      hole: safeHole,
      playerName,
      putts: null,
      noGreen: false,
    })
  }

  function handleSelectOozlePutts(putts) {
    if (!oozlePlayerName) return
    setOozleSetup({
      hole: safeHole,
      playerName: oozlePlayerName,
      putts,
      noGreen: false,
    })
  }

  function handleOozleNoGreen() {
    setOozleSetup({
      hole: safeHole,
      playerName: null,
      putts: null,
      noGreen: true,
    })
  }

  function handleAskPartner(playerName) {
    setWolffnSetup({
      hole: safeHole,
      gameMode,
      askedPlayer: playerName,
      decision: null,
    })
  }

  function handleScoreSwipe({ playerIndex, playerScore, offsetY, velocityY }) {
    if (matchFinished) return

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
    if (matchFinished) return

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

  async function handleFinishHole() {
    if (!holeSetupComplete || finishHoleLoading) return

    let didFinish
    if (isWolffnMode) {
      didFinish = await finishHole(wolffnTeams)
    } else if (oozleRequired) {
      const oozleInput = oozleNoGreen
        ? { outcome: "carryover" }
        : {
            outcome: oozlePutts >= 3 ? "foozle" : "oozle",
            playerName: oozlePlayerName,
            putts: oozlePutts,
          }

      didFinish = await finishHole(null, oozleInput)
    } else {
      didFinish = await finishHole()
    }

    if (didFinish) {
      setShowSavedFeedback(true)
      window.setTimeout(() => setShowSavedFeedback(false), 650)
    }
  }

  if (!hasActiveMatch && !matchFinished) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] px-6 text-slate-950">
        <AppBackground />

        <div className="relative w-full max-w-sm overflow-hidden rounded-[40px] border border-white/20 bg-[#071819] p-8 text-center text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]">
          <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t ${modeTheme.glow}`} />

          <div className="relative">
            <div className={`text-[12px] font-black uppercase tracking-[0.24em] ${modeTheme.textDark}`}>
              Live Scoring
            </div>

            <div className="mt-5 text-5xl font-black tracking-[-0.06em]">Keine Runde</div>

            <div className="mt-4 text-sm font-semibold leading-relaxed text-slate-400">
              Starte zuerst eine neue Runde, damit Scores geändert und Löcher abgeschlossen werden können.
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
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pt-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill>{matchFinished ? "Beendet" : "Live"}</StatusPill>
                  <GameModeBadge gameMode={gameMode} isWolffn={isWolffnMode} isProfessional={isProfessionalMode} />
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
                  whileTap={{ scale: 0.9 }}
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
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.3, ease: "easeOut" }}
              className="mt-5 overflow-hidden rounded-[32px] border border-white/20 bg-[#071819] text-white shadow-[0_22px_55px_rgba(7,24,25,0.30)]"
            >
              <div className="relative p-5">
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-500/28 via-slate-500/8 to-transparent" />

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

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm" aria-hidden="true">
                      🐺
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {wolffnTeeOrder.map((playerName, index) => (
                      <div
                        key={`${playerName}-${index}`}
                        className={`rounded-[18px] px-2 py-2.5 text-center ${index === 0 ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}
                      >
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-70">{index + 1}</div>
                        <div className="mt-1 truncate text-xs font-black">{playerName}</div>
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
                          className={`rounded-[20px] px-3 py-3 text-xs font-black transition ${isSelected ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}
                        >
                          {playerName}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setWolffnSetup({ hole: safeHole, gameMode, askedPlayer: null, decision: "alone" })}
                    className={`mt-2 w-full rounded-[20px] px-4 py-3 text-xs font-black transition ${wolffnDecision === "alone" ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}
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
                          onClick={() => setWolffnSetup({ hole: safeHole, gameMode, askedPlayer: wolffnAskedPlayer, decision: "accepted" })}
                          className={`rounded-[18px] px-4 py-3 text-xs font-black transition ${wolffnDecision === "accepted" ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}
                        >
                          Ja
                        </button>

                        <button
                          type="button"
                          onClick={() => setWolffnSetup({ hole: safeHole, gameMode, askedPlayer: wolffnAskedPlayer, decision: "declined" })}
                          className={`rounded-[18px] px-4 py-3 text-xs font-black transition ${wolffnDecision === "declined" ? "bg-red-500 text-white" : "bg-white/10 text-white"}`}
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
                          <div className="truncate text-base font-black tracking-[-0.035em]">{joinTeamNames(wolffnTeams.teamA)}</div>
                          <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{wolffnTeams.label}</div>
                        </div>

                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">vs</div>

                        <div className="min-w-0 text-right">
                          <div className="truncate text-base font-black tracking-[-0.035em]">{joinTeamNames(wolffnTeams.teamB)}</div>
                          <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Gegner</div>
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

          {oozleRequired && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.3, ease: "easeOut" }}
              className="mt-5 overflow-hidden rounded-[32px] border border-amber-200/70 bg-white/[0.56] shadow-[0_22px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">
                      Par-3 Side Bet
                    </div>
                    <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                      Oozle
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                      Wer liegt nach dem Abschlag auf dem Grün am nächsten zur Fahne?
                    </div>
                  </div>
                  <div className="shrink-0 rounded-[22px] bg-slate-950 px-4 py-3 text-right text-white shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/50">
                      Wert je Gegner
                    </div>
                    <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-amber-300">
                      {formatPlainMoney(oozleAmountPerOpponent)}
                    </div>
                  </div>
                </div>

                {oozleCarryover > 0 && (
                  <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-700">
                    Carryover x{oozleUnitsAtStake} · {formatPlainMoney(oozleAmountPerOpponent)} je Gegner
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {safePlayers.map((player) => {
                    const isSelected = oozlePlayerName === player.name && !oozleNoGreen
                    return (
                      <button
                        key={`oozle-${player.name}`}
                        type="button"
                        onClick={() => handleSelectOozlePlayer(player.name)}
                        className={`flex min-h-20 flex-col items-center justify-center rounded-[22px] border px-4 py-4 text-center transition ${
                          isSelected
                            ? "border-amber-400 bg-amber-300 text-slate-950 shadow-sm"
                            : "border-white/70 bg-white/70 text-slate-950"
                        }`}
                      >
                        <div className="truncate text-base font-black">{player.name}</div>
                        <div className={`mt-1 text-[9px] font-black uppercase tracking-widest ${isSelected ? "text-slate-700" : "text-slate-400"}`}>
                          Nächster Ball
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleOozleNoGreen}
                  className={`mt-2 w-full rounded-[22px] border px-4 py-4 text-sm font-black transition ${
                    oozleNoGreen
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-white/70 bg-white/70 text-slate-600"
                  }`}
                >
                  Niemand auf dem Grün
                </button>

                {oozlePlayerName && !oozleNoGreen && (
                  <div className="mt-5 rounded-[24px] border border-white/70 bg-white/70 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Wie viele Putts benötigt {oozlePlayerName}?
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { value: 1, label: "1 Putt" },
                        { value: 2, label: "2 Putts" },
                        { value: 3, label: "3+ Putts" },
                      ].map((option) => {
                        const isSelected = oozlePutts === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelectOozlePutts(option.value)}
                            className={`flex min-h-11 items-center justify-center rounded-[18px] px-3 py-3 text-center text-xs font-black leading-none transition ${
                              isSelected
                                ? option.value >= 3
                                  ? "bg-red-500 text-white"
                                  : "bg-amber-300 text-slate-950"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {oozleSetupComplete && (
                  <div className={`mt-4 flex min-h-11 items-center justify-center rounded-[20px] px-4 py-3 text-center text-xs font-black uppercase leading-none tracking-widest ${
                    oozleNoGreen
                      ? "bg-slate-100 text-slate-600"
                      : oozlePutts >= 3
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-100 text-amber-700"
                  }`}>
                    {oozleNoGreen
                      ? "Carryover zum nächsten Par 3"
                      : oozlePutts >= 3
                        ? `Foozle · ${oozlePlayerName} zahlt`
                        : `Oozle · ${oozlePlayerName} gewinnt`}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={scoreEntryRef} className="mt-5 space-y-4 scroll-mt-5">
            {safePlayers.map((player, index) => {
              const playerScore = toNumber(player.score, currentPar)
              const isWinning = playerScore === lowestScore
              const golfResult = getGolfResult(playerScore, currentPar)

              return (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025, duration: 0.22, ease: "easeOut" }}
                  className={`rounded-[32px] border px-6 py-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition ${
                    isWinning ? `${modeTheme.activeBorder} ${modeTheme.activeSoftBg}` : "border-white/70 bg-white/[0.46]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[2.15rem] font-black leading-none tracking-[-0.07em] text-slate-950">
                        {player.name}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className={`inline-flex min-h-7 items-center justify-center rounded-full px-3 py-1 text-center text-[10px] font-black uppercase leading-none tracking-[0.18em] shadow-sm ${getResultBadgeStyle(golfResult.label)}`}>
                          {golfResult.label}
                        </div>
                      </div>
                    </div>

                    <ScoreInputTile
                      disabled={matchFinished}
                      golfResultLabel={golfResult.label}
                      playerName={player.name}
                      playerScore={playerScore}
                      onSwipe={(info) => handleScoreSwipe({ playerIndex: index, playerScore, offsetY: info.offset.y, velocityY: info.velocity.y })}
                      onKeyDown={(event) => handleScoreKeyDown(event, index, playerScore)}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.32, ease: "easeOut" }}
            className="mt-7 rounded-[32px] border border-white/70 bg-white/[0.48] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.09)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">Scorecard</div>
              <GameModeBadge gameMode={gameMode} isWolffn={isWolffnMode} isProfessional={isProfessionalMode} className="px-3" />
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

              {historyDisplayItems.slice().reverse().map((item, index) => {
                const historySpecialLabel = getHistorySpecialLabel(item)
                const historyResultSummary = getHistoryResultSummary(item)
                const wonHolesLabel = formatHoleListLabel(item.displayWonHoles)

                return (
                  <div
                    key={`${item.hole}-${item.winner || "carryover"}-${index}`}
                    className="rounded-[24px] border border-white/70 bg-white/[0.42] px-4 py-3 shadow-sm backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black tracking-[-0.035em] text-slate-950">Loch {item.hole}</div>

                          {historySpecialLabel && (
                            <div className={`inline-flex min-h-7 items-center justify-center gap-1 rounded-full px-2 py-1 text-center text-[8px] font-black uppercase leading-none tracking-widest shadow-sm ${getSpecialBadgeStyle(historySpecialLabel)}`}>
                              <Sparkles size={9} />
                              {historySpecialLabel}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Par {item.par}</div>

                        <div className="mt-2 inline-flex min-h-7 items-center justify-center rounded-full bg-white/[0.62] px-2.5 py-1 text-center text-[9px] font-black uppercase leading-none tracking-[0.16em] text-slate-500 shadow-sm">
                          {historyResultSummary}
                        </div>

                        {item?.oozle?.enabled && (
                          <div className={`mt-2 inline-flex min-h-7 w-fit max-w-full items-center justify-center rounded-full px-3 py-1 text-center text-[9px] font-black uppercase leading-none tracking-widest shadow-sm ${
                            item.oozle.outcome === "oozle"
                              ? "bg-amber-300 text-slate-950"
                              : item.oozle.outcome === "foozle"
                                ? "bg-red-500 text-white"
                                : "bg-slate-950 text-white"
                          }`}>
                            {item.oozle.outcome === "oozle"
                              ? `Oozle · ${item.oozle.playerName}`
                              : item.oozle.outcome === "foozle"
                                ? `Foozle · ${item.oozle.playerName}`
                                : item.oozle.expired
                                  ? "Oozle Carryover verfallen"
                                  : "Oozle Carryover"}
                          </div>
                        )}
                        {!item.hasTie && wonHolesLabel && (
                          <div className="mt-2">
                            <div className="inline-flex min-h-7 w-fit max-w-full items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-center text-[9px] font-black uppercase leading-none tracking-widest text-white shadow-sm">
                              Holes: {wonHolesLabel}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-black tracking-[-0.035em] text-slate-950">
                          {item.hasTie ? "Carryover" : item.winner}
                        </div>

                        <div className={`mt-1 text-[9px] font-black uppercase tracking-widest ${item.hasTie ? "text-slate-950" : "text-amber-500"}`}>
                          {getSkinsLabel(item.skins || 0)} · {formatPlainMoney(item.pot || 0)}
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
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAbortModal(true)}
              className="mt-5 w-full rounded-[28px] border border-red-100 bg-white/[0.46] py-4 text-sm font-black text-red-500 shadow-sm backdrop-blur-xl"
            >
              Match abbrechen
            </motion.button>
          )}
        </div>
      </div>

      {!matchFinished && finishHoleError && (
        <div className="fixed bottom-[calc(7.7rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-5">
          <div className="w-full max-w-md rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600 shadow-lg">
            {finishHoleError}
          </div>
        </div>
      )}
      {!matchFinished && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-[calc(1.35rem+env(safe-area-inset-bottom))]">
          <div className="relative w-full max-w-md">
            <AnimatePresence>
              {showSavedFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: -18 }}
                  exit={{ opacity: 0, scale: 0.7, y: -34 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className={`absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)] ${modeTheme.button}`}
                >
                  <Check size={30} strokeWidth={3.4} />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              whileTap={{ scale: holeSetupComplete && !finishHoleLoading ? 0.98 : 1 }}
              disabled={!holeSetupComplete || finishHoleLoading}
              onClick={handleFinishHole}
              className={`flex w-full items-center justify-between rounded-[32px] px-6 py-5 text-xl font-black text-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] transition disabled:cursor-not-allowed disabled:opacity-45 ${modeTheme.button} ${modeTheme.buttonHover}`}
            >
              <span>
                {!wolffnSetupComplete
                  ? "Wolffn Setup wählen"
                  : !oozleSetupComplete
                    ? "Oozle vervollständigen"
                    : finishHoleLoading
                      ? "Loch wird gespeichert..."
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[42px] border border-white/20 bg-[#071819] p-10 text-center text-white shadow-2xl"
            >
              <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t ${modeTheme.glow}`} />

              <div className="relative">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-black leading-none ${celebration.color}`}>
                    {celebration.result}
                  </div>

                  {celebration.specialScoringApplied && celebration.specialScoringLabel && (
                    <div className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black uppercase tracking-widest ${getSpecialBadgeStyle(celebration.specialScoringLabel)}`}>
                      <Sparkles size={13} />
                      {formatCelebrationSpecialLabel(celebration.specialScoringLabel)}
                    </div>
                  )}
                </div>

                <div className="mt-6 text-6xl font-black tracking-[-0.06em]">{celebration.player}</div>

                <div className="mt-4 text-lg font-bold text-slate-400">
                  holt {celebration.skins || 1} {(celebration.skins || 1) === 1 ? "Skin" : "Skinz"}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-md overflow-hidden rounded-[44px] border border-white/70 bg-white/[0.82] p-8 text-center shadow-2xl backdrop-blur-2xl"
            >
              <div className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/70 bg-white/[0.52] px-4 py-2 text-center text-[13px] font-black uppercase leading-none tracking-[0.12em] text-slate-600 shadow-sm backdrop-blur-xl">
                Match complete
              </div>

              <h2 className="mt-6 text-5xl font-black tracking-[-0.06em] text-slate-950">
                {champion?.name || "Winner"}
              </h2>

              <div className="mt-4 inline-flex min-h-9 max-w-full items-center justify-center rounded-full border border-white/70 bg-white/[0.46] px-4 py-2 text-center text-xs font-black uppercase leading-none tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
                <span className="truncate">{getCourseName(currentCourse)}</span>
              </div>

              <div className={`mt-7 text-5xl font-black tracking-[-0.06em] ${getMoneyColor(champion?.winnings)}`}>
                {formatMoney(champion?.winnings)}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="grid min-h-28 grid-rows-[1.25rem_2.5rem] place-items-center content-center rounded-[24px] border border-white/70 bg-white/[0.48] px-2 py-4 text-center shadow-sm backdrop-blur-xl">
                  <div className="flex h-5 items-center justify-center text-sm font-bold leading-none text-slate-500">Skinz</div>
                  <div className="flex h-10 items-center justify-center whitespace-nowrap text-[2rem] font-black leading-none tracking-[-0.045em] text-slate-950 tabular-nums">{championWonSkinz}</div>
                </div>
                <div className="grid min-h-28 grid-rows-[1.25rem_2.5rem] place-items-center content-center rounded-[24px] border border-white/70 bg-white/[0.48] px-2 py-4 text-center shadow-sm backdrop-blur-xl">
                  <div className="flex h-5 items-center justify-center text-sm font-bold leading-none text-slate-500">Gesamt</div>
                  <div className={`flex h-10 items-center justify-center whitespace-nowrap text-[1.85rem] font-black leading-none tracking-[-0.045em] tabular-nums ${getMoneyColor(champion?.winnings)}`}>{formatMoney(champion?.winnings)}</div>
                </div>
                <div className="grid min-h-28 grid-rows-[1.25rem_2.5rem] place-items-center content-center rounded-[24px] border border-white/70 bg-white/[0.48] px-2 py-4 text-center shadow-sm backdrop-blur-xl">
                  <div className="flex h-5 items-center justify-center text-sm font-bold leading-none text-slate-500">To Par</div>
                  <div className={`flex h-10 items-center justify-center whitespace-nowrap text-[2rem] font-black leading-none tracking-[-0.045em] tabular-nums ${getToParColor(champion?.totalToPar)}`}>{formatToPar(champion?.totalToPar)}</div>
                </div>
              </div>

              <div className="mt-8 rounded-[32px] border border-white/70 bg-white/[0.42] p-4 text-left shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Final Scores</div>
                    <div className="mt-1 text-2xl font-black tracking-[-0.045em] text-slate-950">Leaderboard</div>
                  </div>
                  <div className="text-3xl" aria-hidden="true">🏆</div>
                </div>

                <div className="mt-4 space-y-3">
                  {sortedPlayers.map((player, index) => {
                    const isChampion = player.name === champion?.name
                    const playerWonSkinz = getPlayerWonSkinz(player)

                    return (
                      <button
                        key={player.name}
                        type="button"
                        onClick={() => setSelectedSettlementPlayer(player)}
                        className={`w-full rounded-[26px] border p-4 text-left shadow-sm transition active:scale-[0.99] ${isChampion ? `${modeTheme.activeBorder} ${modeTheme.activeSoftBg}` : "border-white/70 bg-white/[0.54]"}`}
                      >
                        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center self-start rounded-full text-sm font-black leading-none ${index === 0 ? "bg-amber-300 text-black" : index === 1 ? "border border-slate-200 bg-white text-slate-900" : index === 2 ? "bg-orange-400 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <div className="min-w-0 break-words text-xl font-black leading-tight text-slate-950">{player.name}</div>
                              {isChampion && <div className="inline-flex min-h-7 shrink-0 items-center justify-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-center text-[10px] font-black uppercase leading-none tracking-widest text-black"><Crown size={10} />Winner</div>}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="flex min-h-16 flex-col items-center justify-center rounded-[18px] bg-white/70 px-1.5 py-2 text-center"><div className="text-[8px] font-black uppercase leading-none tracking-widest text-slate-400">Skinz</div><div className="mt-2 text-lg font-black leading-none text-slate-950 tabular-nums">{playerWonSkinz}</div></div>
                              <div className="flex min-h-16 flex-col items-center justify-center rounded-[18px] bg-white/70 px-1.5 py-2 text-center"><div className="text-[8px] font-black uppercase leading-none tracking-widest text-slate-400">Gesamt</div><div className={`mt-2 whitespace-nowrap text-lg font-black leading-none tabular-nums ${getMoneyColor(player.winnings)}`}>{formatMoney(player.winnings)}</div></div>
                              <div className="flex min-h-16 flex-col items-center justify-center rounded-[18px] bg-white/70 px-1.5 py-2 text-center"><div className="text-[8px] font-black uppercase leading-none tracking-widest text-slate-400">To Par</div><div className={`mt-2 text-lg font-black leading-none tabular-nums ${getToParColor(player.totalToPar)}`}>{formatToPar(player.totalToPar)}</div></div>
                            </div>
                            <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
                              <div className="flex min-h-8 items-center justify-between gap-3 rounded-[14px] bg-white/55 px-3 py-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Skinz-Abrechnung</span><span className={`shrink-0 text-sm font-black tabular-nums ${getMoneyColor(player.skinzWinnings)}`}>{formatMoney(player.skinzWinnings)}</span></div>
                              {showOozleSettlement && <div className="flex min-h-8 items-center justify-between gap-3 rounded-[14px] bg-amber-50/80 px-3 py-2"><span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Oozle-Abrechnung</span><span className={`shrink-0 text-sm font-black tabular-nums ${getMoneyColor(player.oozleWinnings)}`}>{formatMoney(player.oozleWinnings)}</span></div>}
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Abrechnung anzeigen<ChevronRight size={13} strokeWidth={3} /></div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-[32px] border border-white/70 bg-white/[0.42] p-4 shadow-sm backdrop-blur-xl">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Endabrechnung</div>
                <div className="mx-auto mt-2 max-w-xs text-center text-sm font-bold leading-relaxed text-slate-500">
                  Skinz und Oozle sind im Gesamtbetrag bereits verrechnet.
                </div>

                <div className="mt-4 space-y-2">
                  {finalSettlementPayments.length > 0 ? (
                    finalSettlementPayments.map((payment, index) => (
                      <div
                        key={`${payment.from}-${payment.to}-${index}`}
                        className="rounded-[24px] border border-white/70 bg-white/[0.72] px-4 py-4 text-center shadow-sm"
                      >
                        <div className="break-words text-sm font-black leading-relaxed text-slate-950 sm:text-base">
                          {payment.from} zahlt {payment.to}
                        </div>
                        <div className="mt-1 text-2xl font-black tracking-tight text-slate-950 tabular-nums">
                          {formatPlainMoney(payment.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/80 px-4 py-4 text-center text-sm font-black text-emerald-700 shadow-sm">
                      Keine Zahlungen erforderlich.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResetGame}
                  className={`w-full rounded-[30px] py-5 text-lg font-black text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)] ${modeTheme.button} ${modeTheme.buttonHover}`}
                >
                  Neue Runde starten
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
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
        {selectedSettlementPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10 backdrop-blur-xl sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlement-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 44, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 34, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-md overflow-hidden rounded-[38px] border border-white/70 bg-white/[0.88] p-5 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Abrechnung</div>
                  <h3 id="settlement-title" className="mt-1 truncate text-4xl font-black tracking-[-0.06em] text-slate-950">
                    {selectedSettlementPlayer.name}
                  </h3>
                  <div className="mt-2 text-sm font-black uppercase tracking-widest text-slate-500">
                    {getPlayerWonSkinz(selectedSettlementPlayer)} Skinz
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSettlementPlayer(null)}
                  aria-label="Abrechnung schließen"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-5 text-left">
                <div className="px-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Skinz-Abrechnung
                </div>
                <div className="mt-2 rounded-[28px] border border-white/70 bg-white/[0.48] p-3 shadow-sm backdrop-blur-xl">
                  <div className="space-y-2">
                    {selectedSettlementRows.map((row) => (
                      <div
                        key={`skinz-${selectedSettlementPlayer.name}-${row.opponentName}`}
                        className="rounded-[22px] border border-white/70 bg-white/[0.62] px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-950">{formatSettlementAction(row)}</div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Diff. {row.skinzDifference > 0 ? "+" : ""}{row.skinzDifference} Skinz
                            </div>
                          </div>
                          <div className={`shrink-0 text-xl font-black ${getMoneyColor(row.amount)}`}>
                            {formatMoney(row.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {showOozleSettlement && (
                <div className="mt-4 text-left">
                  <div className="px-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">
                    Oozle-Abrechnung
                  </div>
                  <div className="mt-2 rounded-[28px] border border-amber-200/70 bg-amber-50/70 p-3 shadow-sm backdrop-blur-xl">
                    <div className="space-y-2">
                      {selectedOozleSettlementRows.map((row) => (
                        <div
                          key={`oozle-${selectedSettlementPlayer.name}-${row.opponentName}`}
                          className="rounded-[22px] border border-amber-100 bg-white/80 px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-950">{formatSettlementAction(row)}</div>
                              <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-600/70">
                                Oozle / Foozle
                              </div>
                            </div>
                            <div className={`shrink-0 text-xl font-black ${getMoneyColor(row.amount)}`}>
                              {formatMoney(row.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 rounded-[28px] border border-white/70 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Gesamt</div>
                    <div className="mt-1 text-sm font-bold text-white/70">{toNumber(selectedSettlementPlayer.winnings, 0) < 0 ? "Gesamtschuld" : "Gesamtgewinn"}</div>
                  </div>

                  <div className={`text-4xl font-black tracking-[-0.06em] ${getDarkMoneyColor(selectedSettlementPlayer.winnings)}`}>
                    {formatMoney(selectedSettlementPlayer.winnings)}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbortModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="abort-match-title"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-[40px] border border-white/70 bg-white/[0.78] shadow-2xl backdrop-blur-2xl"
            >
              <div className="p-7 text-center">
                <div id="abort-match-title" className="text-3xl font-black tracking-[-0.045em] text-slate-950">
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