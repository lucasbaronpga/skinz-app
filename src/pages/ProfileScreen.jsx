import { motion } from "framer-motion"
import {
  Crown,
  DollarSign,
  Flag,
  LogOut,
  MapPin,
  Trophy,
  User,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"
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

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
}

function getRoundPlayer(round, playerName) {
  return (
    getRoundPlayers(round).find(
      (player) => normalizeName(player.name) === normalizeName(playerName)
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

function getInitials(name) {
  const cleanedName = String(name || "S").trim()

  if (!cleanedName) {
    return "S"
  }

  const parts = cleanedName.split(" ").filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }

  return cleanedName.charAt(0).toUpperCase()
}

function getPlayerHoles(player) {
  return Array.isArray(player?.holes) ? player.holes : []
}

function getPlayerTotalScore(player) {
  const holes = getPlayerHoles(player)

  if (holes.length > 0) {
    return holes.reduce((total, hole) => total + toNumber(hole?.score, 0), 0)
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

function getAverageScore(rounds, playerName) {
  const playerRounds = rounds
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

function roundHasProfessionalScoring(round) {
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

  const historyHasProfessionalScoring =
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

  if (historyHasProfessionalScoring) {
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

function getRoundGameMode(round) {
  if (roundIsWolffn(round)) {
    return GAME_MODES.WOLFFN
  }

  if (roundHasProfessionalScoring(round)) {
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

function getRoundGameModeMeta(round) {
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

function getHeroMoneyTextSize(value) {
  const formattedValue = formatMoney(value)

  if (formattedValue.length >= 10) {
    return "text-[0.82rem]"
  }

  if (formattedValue.length >= 8) {
    return "text-[0.95rem]"
  }

  if (formattedValue.length >= 6) {
    return "text-[1.08rem]"
  }

  return "text-[1.42rem]"
}

function getPerformanceMoneyTextSize(value) {
  const formattedValue = formatMoney(value)

  if (formattedValue.length >= 10) {
    return "text-[1.35rem]"
  }

  if (formattedValue.length >= 8) {
    return "text-[1.55rem]"
  }

  if (formattedValue.length >= 6) {
    return "text-[1.85rem]"
  }

  return "text-[2.35rem]"
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { playerStats, completedRounds } = useGame()

  const userName = user?.name || "Player"

  const safePlayerStats = Array.isArray(playerStats) ? playerStats : []
  const safeCompletedRounds = Array.isArray(completedRounds)
    ? completedRounds
    : []

  const player =
    safePlayerStats.find(
      (currentPlayer) =>
        normalizeName(currentPlayer.name) === normalizeName(userName)
    ) || null

  const userRounds = safeCompletedRounds.filter((round) =>
    getRoundPlayers(round).some(
      (roundPlayer) => normalizeName(roundPlayer.name) === normalizeName(userName)
    )
  )

  const recentMatches = [...userRounds]
    .sort((a, b) => getRoundSortValue(b) - getRoundSortValue(a))
    .slice(0, 3)

  const roundsPlayed = toNumber(player?.roundsPlayed, userRounds.length)
  const totalWins = toNumber(player?.wins, 0)
  const totalWinnings = toNumber(player?.totalWinnings, 0)
  const averageScore = getAverageScore(userRounds, userName)

  function handleLogout() {
    logout()

    navigate("/login", {
      replace: true,
    })
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-5">
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
            Skinz
          </div>

          <h1 className="mt-3 text-[4rem] font-black leading-none tracking-[-0.075em] text-slate-950">
            Profile
          </h1>
        </motion.div>

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
            delay: 0.05,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 overflow-hidden rounded-[42px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
        >
          <div className="relative p-7">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white text-4xl font-black text-[#071819] shadow-[0_20px_55px_rgba(255,255,255,0.16)]">
                  {getInitials(userName)}
                </div>

                <div className="rounded-full border border-white/15 bg-white/[0.10] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/70 backdrop-blur-xl">
                  Player
                </div>
              </div>

              <div className="mt-6 min-w-0">
                <div className="break-words text-5xl font-black leading-[0.92] tracking-tight">
                  {userName}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-white/45">
                  <User size={15} />
                  Active Skinz profile
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="min-w-0 rounded-[26px] bg-white/[0.10] px-2 py-4 text-center backdrop-blur-xl">
                  <div className="text-xs font-black uppercase tracking-widest text-white/40">
                    Wins
                  </div>

                  <div className="mt-2 text-3xl font-black text-amber-300">
                    {totalWins}
                  </div>
                </div>

                <div className="min-w-0 rounded-[26px] bg-white/[0.10] px-2 py-4 text-center backdrop-blur-xl">
                  <div className="text-xs font-black uppercase tracking-widest text-white/40">
                    Rounds
                  </div>

                  <div className="mt-2 text-3xl font-black text-white">
                    {roundsPlayed}
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-[26px] bg-white/[0.10] px-2 py-4 text-center backdrop-blur-xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                    Earnings
                  </div>

                  <div
                    className={`mt-3 max-w-full overflow-hidden whitespace-nowrap text-center font-black leading-none tracking-tight tabular-nums ${getHeroMoneyTextSize(
                      totalWinnings
                    )} ${getMoneyColorDark(totalWinnings)}`}
                  >
                    {formatMoney(totalWinnings)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

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
            delay: 0.08,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[38px] border border-white/70 bg-white/[0.48] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                Stats
              </div>

              <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Performance
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
              <Trophy size={19} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-[28px] border border-white/70 bg-white/[0.80] p-5 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Flag size={18} />

                <div className="text-sm font-black">Rounds</div>
              </div>

              <div className="mt-4 text-5xl font-black text-slate-950">
                {roundsPlayed}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/[0.80] p-5 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Crown size={18} />

                <div className="text-sm font-black">Wins</div>
              </div>

              <div className="mt-4 text-5xl font-black text-amber-500">
                {totalWins}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/[0.80] p-5 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Flag size={18} />

                <div className="text-sm font-black">Avg Score</div>
              </div>

              <div className="mt-4 text-5xl font-black text-slate-950">
                {averageScore}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/[0.80] p-4 text-center shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <DollarSign size={18} />

                <div className="text-sm font-black">Earnings</div>
              </div>

              <div
                className={`mt-5 max-w-full overflow-hidden whitespace-nowrap text-center font-black leading-none tracking-tight tabular-nums ${getPerformanceMoneyTextSize(
                  totalWinnings
                )} ${getMoneyColor(totalWinnings)}`}
              >
                {formatMoney(totalWinnings)}
              </div>
            </div>
          </div>
        </motion.div>

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
            delay: 0.12,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[38px] border border-white/70 bg-white/[0.48] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                Scorecards
              </div>

              <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Recent Rounds
              </div>
            </div>

            <div className="rounded-full border border-white/70 bg-white/[0.80] px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
              Latest
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentMatches.length === 0 && (
              <div className="rounded-[28px] border border-white/70 bg-white/[0.80] p-6 text-center shadow-sm backdrop-blur-xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Flag size={20} />
                </div>

                <div className="mt-4 text-lg font-black text-slate-950">
                  No rounds yet
                </div>

                <div className="mt-1 text-sm font-bold text-slate-400">
                  Deine letzten Scorecards erscheinen hier.
                </div>
              </div>
            )}

            {recentMatches.map((round) => {
              const roundPlayer = getRoundPlayer(round, userName)
              const roundId = getRoundId(round)
              const courseName = getRoundCourseName(round)
              const isWinner =
                normalizeName(round.winner) === normalizeName(userName)
              const gameModeMeta = getRoundGameModeMeta(round)

              return (
                <motion.button
                  key={roundId}
                  type="button"
                  whileTap={{
                    scale: 0.985,
                  }}
                  onClick={() => navigate(`/matches/${roundId}`)}
                  className="relative w-full overflow-hidden rounded-[30px] border border-white/70 bg-white/[0.78] p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-950">
                          {getRoundDate(round)}
                        </div>

                        <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {roundId}
                        </div>

                        <div
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${gameModeMeta.className}`}
                        >
                          {gameModeMeta.icon && (
                            <span aria-hidden="true">{gameModeMeta.icon}</span>
                          )}

                          {gameModeMeta.label}
                        </div>

                        {isWinner && (
                          <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                            <Crown size={10} />
                            Winner
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-start gap-2 text-slate-400">
                        <MapPin size={14} className="mt-1 shrink-0" />

                        <div className="min-w-0 text-sm font-black leading-snug text-slate-500">
                          {courseName}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div
                          className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest ${getSkinColor(
                            roundPlayer?.skins
                          )}`}
                        >
                          {formatSkinSaldo(roundPlayer?.skins)} Skinz
                        </div>
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

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-300">
                        Earnings
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        <motion.button
          type="button"
          whileTap={{
            scale: 0.985,
          }}
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.16,
            duration: 0.35,
            ease: "easeOut",
          }}
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-between rounded-[30px] border border-white/70 bg-white/[0.70] px-5 py-4 text-red-500 shadow-sm backdrop-blur-xl"
        >
          <div>
            <div className="text-xl font-black">Logout</div>

            <div className="mt-1 text-sm font-bold text-red-300">
              Session beenden
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <LogOut size={22} />
          </div>
        </motion.button>
      </div>
    </div>
  )
}