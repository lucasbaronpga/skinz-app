import {
  motion,
} from "framer-motion"

import {
  DollarSign,
  Target,
  Flag,
  LogOut,
  Crown,
  MapPin,
  Sparkles,
  Trophy,
  User,
} from "lucide-react"

import {
  useNavigate,
} from "react-router-dom"

import {
  useAuth,
} from "../context/AuthContext"

import {
  GAME_MODES,
  useGame,
} from "../context/GameContext"

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function formatEuroAmount(value) {
  const amount =
    roundMoney(Math.abs(value))

  const hasCents =
    Math.abs(amount % 1) > 0

  if (hasCents) {
    return amount
      .toFixed(2)
      .replace(".", ",")
  }

  return amount.toFixed(0)
}

function formatMoney(value) {
  const amount =
    roundMoney(value)

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
    return "text-yellow-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getMoneyColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-yellow-300"
  }

  if (amount < 0) {
    return "text-red-300"
  }

  return "text-white"
}

function formatSkinSaldo(value) {
  const amount =
    toNumber(value, 0)

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
    return "text-slate-950"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-400"
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

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players)
    ? round.players
    : []
}

function getRoundPlayer(round, playerName) {
  return (
    getRoundPlayers(round).find(
      (player) =>
        normalizeName(player.name) ===
        normalizeName(playerName)
    ) || null
  )
}

function getRoundCourseName(round) {
  return (
    round?.course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getRoundCoursePar(round) {
  return (
    round?.course?.par ||
    72
  )
}

function getRoundCourseMeta(round) {
  return `Par ${getRoundCoursePar(round)}`
}

function getRoundDate(round) {
  return (
    round?.date ||
    "Unbekannt"
  )
}

function getRoundId(round) {
  return (
    round?.id ||
    "SKZ-0000"
  )
}

function getInitials(name) {
  const cleanedName =
    String(name || "S").trim()

  if (!cleanedName) {
    return "S"
  }

  const parts =
    cleanedName
      .split(" ")
      .filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }

  return cleanedName.charAt(0).toUpperCase()
}

function roundIsWolffn(round) {
  return round?.gameMode === GAME_MODES.WOLFFN
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
        !roundIsWolffn(playedHole) &&
        (
          playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied
        )
    )

  if (historyHasSpecialScoring) {
    return true
  }

  const playerHoleHasSpecialScoring =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          !roundIsWolffn(playedHole) &&
          (
            playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied
          )
      )
    )

  return playerHoleHasSpecialScoring
}

function getRoundSortValue(round) {
  const createdAt =
    toNumber(round?.createdAt, 0)

  if (createdAt > 0) {
    return createdAt
  }

  const parsedDate =
    Date.parse(round?.date || "")

  if (Number.isFinite(parsedDate)) {
    return parsedDate
  }

  return 0
}

function getHeroMoneyTextSize(value) {
  const formattedValue =
    formatMoney(value)

  if (formattedValue.length >= 8) {
    return "text-[1.35rem]"
  }

  if (formattedValue.length >= 6) {
    return "text-[1.55rem]"
  }

  return "text-[1.85rem]"
}

function getPerformanceMoneyTextSize(value) {
  const formattedValue =
    formatMoney(value)

  if (formattedValue.length >= 8) {
    return "text-[2.15rem]"
  }

  if (formattedValue.length >= 6) {
    return "text-[2.45rem]"
  }

  return "text-[3rem]"
}

export default function ProfileScreen() {
  const navigate = useNavigate()

  const {
    user,
    logout,
  } = useAuth()

  const {
    playerStats,
    completedRounds,
  } = useGame()

  const userName =
    user?.name || "Player"

  const safePlayerStats =
    Array.isArray(playerStats)
      ? playerStats
      : []

  const safeCompletedRounds =
    Array.isArray(completedRounds)
      ? completedRounds
      : []

  const player =
    safePlayerStats.find(
      (currentPlayer) =>
        normalizeName(currentPlayer.name) ===
        normalizeName(userName)
    ) || null

  const userRounds =
    safeCompletedRounds.filter((round) =>
      getRoundPlayers(round).some(
        (roundPlayer) =>
          normalizeName(roundPlayer.name) ===
          normalizeName(userName)
      )
    )

  const recentMatches =
    [...userRounds]
      .sort(
        (a, b) =>
          getRoundSortValue(b) -
          getRoundSortValue(a)
      )
      .slice(0, 3)

  const roundsPlayed =
    toNumber(
      player?.roundsPlayed,
      userRounds.length
    )

  const totalWins =
    toNumber(player?.wins, 0)

  const totalBirdies =
    toNumber(player?.birdies, 0)

  const totalWinnings =
    toNumber(player?.totalWinnings, 0)

  const avgToPar =
    toNumber(player?.avgToPar, 0)

  function handleLogout() {
    logout()

    navigate("/login", {
      replace: true,
    })
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-[calc(9rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <div className="mx-auto max-w-md px-5">
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
        >
          <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            Skinz
          </div>

          <h1 className="mt-2 text-6xl font-black tracking-tight">
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
          className="mt-8 overflow-hidden rounded-[42px] bg-[#071819] text-white shadow-2xl shadow-slate-900/20"
        >
          <div className="relative p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-yellow-300/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white text-4xl font-black text-[#071819] shadow-[0_20px_55px_rgba(255,255,255,0.16)]">
                  {getInitials(userName)}
                </div>

                <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/70 backdrop-blur-xl">
                  Player
                </div>
              </div>

              <div className="mt-6 min-w-0">
                <div className="truncate text-5xl font-black tracking-tight">
                  {userName}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-white/45">
                  <User size={15} />
                  Active Skinz profile
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-[26px] bg-white/10 p-4 text-center backdrop-blur-xl">
                  <div className="text-xs font-black uppercase tracking-widest text-white/40">
                    Wins
                  </div>

                  <div className="mt-2 text-3xl font-black text-white">
                    {totalWins}
                  </div>
                </div>

                <div className="rounded-[26px] bg-white/10 p-4 text-center backdrop-blur-xl">
                  <div className="text-xs font-black uppercase tracking-widest text-white/40">
                    Rounds
                  </div>

                  <div className="mt-2 text-3xl font-black text-white">
                    {roundsPlayed}
                  </div>
                </div>

                <div className="rounded-[26px] bg-white/10 p-4 text-center backdrop-blur-xl">
                  <div className="text-xs font-black uppercase tracking-widest text-white/40">
                    Earnings
                  </div>

                  <div
                    className={`mt-3 w-full text-center font-black leading-none tracking-tight ${getHeroMoneyTextSize(totalWinnings)} ${getMoneyColorDark(totalWinnings)}`}
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
          className="mt-8 rounded-[38px] bg-white/48 p-5 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
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
            <div className="rounded-[28px] bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Target size={18} />

                <div className="text-sm font-black">
                  Birdies
                </div>
              </div>

              <div className="mt-4 text-5xl font-black text-red-500">
                {totalBirdies}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Crown size={18} />

                <div className="text-sm font-black">
                  Wins
                </div>
              </div>

              <div className="mt-4 text-5xl font-black text-yellow-500">
                {totalWins}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/80 p-5 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Flag size={18} />

                <div className="text-sm font-black">
                  Avg To Par
                </div>
              </div>

              <div
                className={`mt-4 text-5xl font-black ${getToParColor(avgToPar)}`}
              >
                {formatToPar(avgToPar)}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/80 p-5 text-center shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <DollarSign size={18} />

                <div className="text-sm font-black">
                  Earnings
                </div>
              </div>

              <div
                className={`mt-4 w-full text-center font-black leading-none tracking-tight ${getPerformanceMoneyTextSize(totalWinnings)} ${getMoneyColor(totalWinnings)}`}
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
          className="mt-8 rounded-[38px] bg-white/48 p-5 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Scorecards
              </div>

              <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Recent Rounds
              </div>
            </div>

            <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
              Latest
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentMatches.length === 0 && (
              <div className="rounded-[28px] bg-white/80 p-6 text-center shadow-sm backdrop-blur-xl">
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
              const roundPlayer =
                getRoundPlayer(
                  round,
                  userName
                )

              const roundId =
                getRoundId(round)

              const courseName =
                getRoundCourseName(round)

              const courseMeta =
                getRoundCourseMeta(round)

              const isWolffnRound =
                roundIsWolffn(round)

              const roundHasSpecialMode =
                roundHasSpecialScoring(round)

              const isWinner =
                normalizeName(round.winner) ===
                normalizeName(userName)

              return (
                <motion.button
                  key={roundId}
                  type="button"
                  whileTap={{
                    scale: 0.985,
                  }}
                  onClick={() =>
                    navigate(`/matches/${roundId}`)
                  }
                  className="w-full rounded-[30px] bg-white/82 p-5 text-left shadow-sm backdrop-blur-xl"
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

                        {isWinner && (
                          <div className="flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                            <Crown size={10} />
                            Winner
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-slate-400">
                        <MapPin size={14} />

                        <div className="truncate text-sm font-black text-slate-500">
                          {courseName}
                        </div>
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-400">
                        {courseMeta}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div
                          className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest ${getSkinColor(roundPlayer?.skins)}`}
                        >
                          {formatSkinSaldo(roundPlayer?.skins)} Skinz
                        </div>

                        {isWolffnRound && (
                          <div className="flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <span aria-hidden="true">
                              🐺
                            </span>
                            Wolffn
                          </div>
                        )}

                        {!isWolffnRound && roundHasSpecialMode && (
                          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <Sparkles size={10} />
                            Skinz Pro
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className={`text-3xl font-black ${getMoneyColor(roundPlayer?.winnings)}`}
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
          className="mt-8 flex w-full items-center justify-between rounded-[30px] bg-white/70 px-5 py-4 text-red-500 shadow-sm backdrop-blur-xl"
        >
          <div>
            <div className="text-xl font-black">
              Logout
            </div>

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