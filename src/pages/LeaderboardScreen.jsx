import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Flame,
  MapPin,
  Sparkles,
  Trophy,
} from "lucide-react"

import AppBackground from "../components/AppBackground"
import { GAME_MODES, useGame } from "../context/GameContext"

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

function getMoneyColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-300"
  }

  if (amount < 0) {
    return "text-red-400"
  }

  return "text-white"
}

function getLeaderMoneyTextSize(value) {
  const formattedValue = formatMoney(value)

  if (formattedValue.length >= 10) {
    return "text-[2.45rem]"
  }

  if (formattedValue.length >= 8) {
    return "text-[2.85rem]"
  }

  if (formattedValue.length >= 6) {
    return "text-[3.25rem]"
  }

  return "text-6xl"
}

function formatSkinSaldo(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return `+${amount}`
  }

  if (amount < 0) {
    return `${amount}`
  }

  return "0"
}

function getSkinColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-500"
}

function getRankStyle(index) {
  if (index === 0) {
    return "bg-amber-400 text-black"
  }

  if (index === 1) {
    return "bg-slate-300 text-slate-950"
  }

  if (index === 2) {
    return "bg-[#cd7f32] text-white"
  }

  return "border border-white/70 bg-white/70 text-slate-700"
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function isHotPlayer(player) {
  return (
    toNumber(player?.wins, 0) >= 3 ||
    toNumber(player?.totalWinnings, 0) >= 20
  )
}

function getWinRate(player) {
  const wins = toNumber(player?.wins, 0)
  const roundsPlayed = toNumber(player?.roundsPlayed, 0)

  if (!roundsPlayed) {
    return 0
  }

  return Math.round((wins / roundsPlayed) * 100)
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
}

function getRoundPlayer(round, playerName) {
  return (
    getRoundPlayers(round).find(
      (player) => normalizeName(player?.name) === normalizeName(playerName)
    ) || null
  )
}

function getRoundCourseName(round) {
  return round?.course?.name || "Erster Golfclub Westpfalz"
}

function getRoundDate(round) {
  return round?.date || "Unbekannt"
}

function getRoundId(round) {
  return round?.id || "SKZ-0000"
}

function getRoundSortValue(round) {
  const createdAt = toNumber(round?.createdAt, 0)

  if (createdAt > 0) {
    return createdAt
  }

  const parsedDate = Date.parse(round?.date || "")

  if (Number.isFinite(parsedDate)) {
    return parsedDate
  }

  return 0
}

function getRecentMatches(completedRounds, playerName) {
  return completedRounds
    .filter((round) => getRoundPlayer(round, playerName))
    .sort((a, b) => getRoundSortValue(b) - getRoundSortValue(a))
    .slice(0, 3)
}

function getPlayerTotalScore(player) {
  if (Array.isArray(player?.holes) && player.holes.length > 0) {
    return player.holes.reduce(
      (total, playedHole) => total + toNumber(playedHole?.score, 0),
      0
    )
  }

  return toNumber(player?.total, 0)
}

function roundAverageScore(value) {
  const number = toNumber(value, 0)
  const base = Math.floor(number)
  const decimal = number - base

  if (decimal < 0.5) {
    return base
  }

  return base + 1
}

function getAverageScore(completedRounds, playerName) {
  const playerRounds = completedRounds
    .map((round) => getRoundPlayer(round, playerName))
    .filter(Boolean)

  if (playerRounds.length === 0) {
    return 0
  }

  const totalScore = playerRounds.reduce(
    (total, player) => total + getPlayerTotalScore(player),
    0
  )

  return roundAverageScore(totalScore / playerRounds.length)
}

function itemIsWolffn(item) {
  return Boolean(
    item?.gameMode === GAME_MODES.WOLFFN ||
      item?.gameModeLabel === "Wolffn" ||
      item?.wolffnSetup ||
      item?.wolffnFormat ||
      item?.wolffnPlayer ||
      Array.isArray(item?.wolffnTeamA) ||
      Array.isArray(item?.wolffnTeamB)
  )
}

function roundIsWolffn(round) {
  if (!round) {
    return false
  }

  if (
    round?.gameMode === GAME_MODES.WOLFFN ||
    round?.gameModeLabel === "Wolffn"
  ) {
    return true
  }

  const historyHasWolffn =
    Array.isArray(round?.history) &&
    round.history.some((playedHole) => itemIsWolffn(playedHole))

  if (historyHasWolffn) {
    return true
  }

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some((playedHole) => itemIsWolffn(playedHole))
  )
}

function roundHasSpecialScoring(round) {
  if (!round) {
    return false
  }

  if (roundIsWolffn(round)) {
    return false
  }

  if (
    round?.gameMode === GAME_MODES.PROFESSIONAL ||
    round?.gameModeLabel === "Skinz Professional" ||
    round?.specialScoringEnabled ||
    round?.bonusSkinsEnabled ||
    round?.eagleBonusEnabled
  ) {
    return true
  }

  const historyHasSpecialScoring =
    Array.isArray(round?.history) &&
    round.history.some(
      (playedHole) =>
        !itemIsWolffn(playedHole) &&
        (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied)
    )

  if (historyHasSpecialScoring) {
    return true
  }

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          !itemIsWolffn(playedHole) &&
          (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.gameModeLabel === "Skinz Professional" ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied)
      )
  )
}

function playerHasSpecialScoringInRound(player) {
  return (
    Array.isArray(player?.holes) &&
    player.holes.some(
      (playedHole) =>
        !itemIsWolffn(playedHole) &&
        (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied)
    )
  )
}

function getRoundGameMode(round) {
  if (roundIsWolffn(round)) {
    return GAME_MODES.WOLFFN
  }

  if (roundHasSpecialScoring(round)) {
    return GAME_MODES.PROFESSIONAL
  }

  if (round?.gameMode === GAME_MODES.PROFESSIONAL) {
    return GAME_MODES.PROFESSIONAL
  }

  if (round?.gameMode === GAME_MODES.WOLFFN) {
    return GAME_MODES.WOLFFN
  }

  return GAME_MODES.CLASSIC
}

function getRoundGameModeBadgeMeta(round) {
  const gameMode = getRoundGameMode(round)

  if (gameMode === GAME_MODES.WOLFFN) {
    return {
      label: "Wolffn",
      icon: "🐺",
      className: "bg-slate-950 text-white",
    }
  }

  if (gameMode === GAME_MODES.PROFESSIONAL) {
    return {
      label: "Pro",
      icon: null,
      className: "bg-orange-500 text-white",
    }
  }

  return {
    label: "Classic",
    icon: null,
    className: "bg-emerald-500 text-white",
  }
}

export default function LeaderboardScreen() {
  const navigate = useNavigate()
  const { playerStats, completedRounds } = useGame()

  const safePlayerStats = Array.isArray(playerStats) ? playerStats : []
  const safeCompletedRounds = Array.isArray(completedRounds)
    ? completedRounds
    : []

  const [expandedPlayer, setExpandedPlayer] = useState(null)

  const rankedPlayers = safePlayerStats.filter(
    (player) => toNumber(player?.roundsPlayed, 0) > 0
  )

  const sortedPlayers = [...rankedPlayers].sort(
    (a, b) =>
      toNumber(b.totalWinnings, 0) - toNumber(a.totalWinnings, 0) ||
      toNumber(b.wins, 0) - toNumber(a.wins, 0) ||
      toNumber(a.avgToPar, 0) - toNumber(b.avgToPar, 0)
  )

  const seasonLeader = sortedPlayers[0] || null

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate("/")
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(9rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-5">
        <div className="flex items-center justify-between">
          <motion.button
            type="button"
            whileTap={{
              scale: 0.92,
            }}
            onClick={handleBack}
            aria-label="Zurück"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/[0.48] shadow-[0_14px_38px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <ArrowLeft size={22} />
          </motion.button>

          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-700">
              Season
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Leaderboard
            </div>
          </div>
        </div>

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
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8"
        >
          <h1 className="text-6xl font-black tracking-[-0.055em] text-slate-950">
            Leaderboard
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-500">
            Season Rankings, Winnings & Performance of all Players.
          </p>
        </motion.div>

        {sortedPlayers.length === 0 && (
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
              duration: 0.35,
              ease: "easeOut",
            }}
            className="mt-16 rounded-[40px] border border-white/70 bg-white/[0.48] p-10 text-center shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="text-7xl" aria-hidden="true">
              🏌️
            </div>

            <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Noch kein Leaderboard
            </div>

            <div className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
              Spiele deine erste Runde, um Rankings und Scorecards zu sehen.
            </div>

            <button
              type="button"
              onClick={() => navigate("/round")}
              className="mt-8 w-full rounded-[28px] bg-[#071819] py-5 text-lg font-black text-white shadow-[0_18px_48px_rgba(7,24,25,0.28)] transition active:scale-[0.985]"
            >
              Runde starten
            </button>
          </motion.div>
        )}

        {seasonLeader && (
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
              delay: 0.05,
              duration: 0.35,
              ease: "easeOut",
            }}
            className="mt-8 overflow-hidden rounded-[42px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
          >
            <div className="relative p-8">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-emerald-400/28 via-emerald-500/8 to-transparent"
              />

              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-200/85">
                      Season Leader
                    </div>

                    <div className="mt-4 flex items-start gap-3">
                      <div className="min-w-0 break-words text-5xl font-black leading-[0.92] tracking-[-0.06em]">
                        {seasonLeader.name}
                      </div>

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg">
                        <Trophy size={26} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex items-end justify-between gap-5">
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Winnings
                    </div>

                    <div
                      className={`mt-2 max-w-full overflow-hidden whitespace-nowrap font-black leading-none tracking-[-0.06em] tabular-nums ${getLeaderMoneyTextSize(
                        seasonLeader.totalWinnings
                      )} ${getMoneyColorDark(seasonLeader.totalWinnings)}`}
                    >
                      {formatMoney(seasonLeader.totalWinnings)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Wins
                    </div>

                    <div className="mt-2 text-5xl font-black text-amber-300">
                      {toNumber(seasonLeader.wins, 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {sortedPlayers.length > 0 && (
          <div className="mt-8">
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Global Ranking
                </div>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Players
                </h2>
              </div>

              <div className="pb-1 text-right text-sm font-black uppercase tracking-widest text-slate-500">
                Winnings
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {sortedPlayers.map((player, index) => {
                const isExpanded = expandedPlayer === player.name
                const recentMatches = getRecentMatches(
                  safeCompletedRounds,
                  player.name
                )
                const averageScore = getAverageScore(
                  safeCompletedRounds,
                  player.name
                )

                return (
                  <motion.div
                    key={player.name}
                    layout
                    initial={{
                      opacity: 0,
                      y: 24,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.04,
                      ease: "easeOut",
                    }}
                  >
                    <motion.button
                      type="button"
                      whileTap={{
                        scale: 0.985,
                      }}
                      onClick={() =>
                        setExpandedPlayer(isExpanded ? null : player.name)
                      }
                      aria-expanded={isExpanded}
                      className="w-full rounded-[36px] border border-white/70 bg-white/[0.48] p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black shadow-sm ${getRankStyle(
                            index
                          )}`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="min-w-0 break-words text-[1.72rem] font-black leading-[0.96] tracking-[-0.045em] text-slate-950">
                                  {player.name}
                                </div>

                                {index === 0 && (
                                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                    <Crown size={10} />
                                    #1
                                  </div>
                                )}

                                {isHotPlayer(player) && index !== 0 && (
                                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                                    <Flame size={10} />
                                    Hot
                                  </div>
                                )}
                              </div>
                            </div>

                            <motion.div
                              className="shrink-0 pt-1"
                              animate={{
                                rotate: isExpanded ? 180 : 0,
                              }}
                              transition={{
                                duration: 0.2,
                                ease: "easeOut",
                              }}
                            >
                              <ChevronDown
                                size={24}
                                className="text-slate-400"
                              />
                            </motion.div>
                          </div>

                          <div className="mt-5 flex items-end justify-between gap-4">
                            <div className="min-w-0">
                              <div
                                className={`text-4xl font-black tracking-[-0.045em] ${getMoneyColor(
                                  player.totalWinnings
                                )}`}
                              >
                                {formatMoney(player.totalWinnings)}
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Total
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-4xl font-black tracking-[-0.045em] text-amber-500">
                                {toNumber(player.wins, 0)}
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Wins
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-[22px] border border-white/70 bg-white/[0.50] p-3 text-center shadow-sm backdrop-blur-xl">
                          <div className="text-2xl font-black text-slate-950">
                            {toNumber(player.roundsPlayed, 0)}
                          </div>

                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Rounds
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-white/70 bg-white/[0.50] p-3 text-center shadow-sm backdrop-blur-xl">
                          <div className="text-2xl font-black text-slate-950">
                            {averageScore}
                          </div>

                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Avg Score
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-white/70 bg-white/[0.50] p-3 text-center shadow-sm backdrop-blur-xl">
                          <div className="text-2xl font-black text-slate-950">
                            {getWinRate(player)}%
                          </div>

                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Win
                          </div>
                        </div>
                      </div>
                    </motion.button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            height: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                          }}
                          transition={{
                            duration: 0.24,
                            ease: "easeOut",
                          }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-[34px] border border-white/70 bg-white/[0.48] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                                  Scorecards
                                </div>

                                <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                                  Recent Rounds
                                </div>
                              </div>

                              <div className="text-sm font-black text-slate-500">
                                {recentMatches.length}
                              </div>
                            </div>

                            <div className="mt-5 space-y-3">
                              {recentMatches.length === 0 && (
                                <div className="rounded-[24px] border border-white/70 bg-white/[0.50] p-5 text-center text-sm font-bold text-slate-500 shadow-sm backdrop-blur-xl">
                                  Noch keine Runden gespielt.
                                </div>
                              )}

                              {recentMatches.map((round) => {
                                const roundPlayer = getRoundPlayer(
                                  round,
                                  player.name
                                )
                                const roundId = getRoundId(round)
                                const courseName = getRoundCourseName(round)
                                const isWolffnRound = roundIsWolffn(round)
                                const roundHasSpecialMode =
                                  roundHasSpecialScoring(round)
                                const playerHasSpecialMode =
                                  !isWolffnRound &&
                                  playerHasSpecialScoringInRound(roundPlayer)
                                const gameModeBadge =
                                  getRoundGameModeBadgeMeta(round)

                                return (
                                  <div
                                    key={`${player.name}-${roundId}`}
                                    className="rounded-[24px] border border-white/70 bg-white/[0.50] p-5 shadow-sm backdrop-blur-xl"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="text-lg font-black text-slate-950">
                                            {getRoundDate(round)}
                                          </div>

                                          <div className="rounded-full border border-white/70 bg-white/[0.55] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
                                            {roundId}
                                          </div>

                                          <div
                                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm ${gameModeBadge.className}`}
                                          >
                                            {gameModeBadge.icon && (
                                              <span aria-hidden="true">
                                                {gameModeBadge.icon}
                                              </span>
                                            )}

                                            {gameModeBadge.label}
                                          </div>

                                          {!isWolffnRound &&
                                            roundHasSpecialMode && (
                                              <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                                                <Sparkles size={10} />
                                                Bonus
                                              </div>
                                            )}
                                        </div>

                                        <div className="mt-3 flex items-start gap-2 text-slate-400">
                                          <MapPin
                                            size={14}
                                            className="mt-1 shrink-0"
                                          />

                                          <div className="min-w-0 text-sm font-black leading-snug text-slate-500">
                                            {courseName}
                                          </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                          <div
                                            className={`text-xs font-black uppercase tracking-widest ${getSkinColor(
                                              roundPlayer?.skins
                                            )}`}
                                          >
                                            {formatSkinSaldo(
                                              roundPlayer?.skins
                                            )} Skinz
                                          </div>

                                          {playerHasSpecialMode && (
                                            <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                                              <Sparkles size={10} />
                                              Dein Bonus
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <div
                                          className={`text-3xl font-black ${getMoneyColor(
                                            roundPlayer?.winnings
                                          )}`}
                                        >
                                          {formatMoney(roundPlayer?.winnings)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}