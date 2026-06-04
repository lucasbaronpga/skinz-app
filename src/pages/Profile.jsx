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
} from "lucide-react"

import {
  useNavigate,
} from "react-router-dom"

import {
  useAuth,
} from "../context/AuthContext"

import {
  useGame,
} from "../context/GameContext"

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

function getMoneyColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-yellow-400"
  }

  if (amount < 0) {
    return "text-red-400"
  }

  return "text-white"
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

  return "text-slate-500"
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

  return cleanedName.charAt(0).toUpperCase()
}

function roundHasSpecialScoring(round) {
  if (!round) {
    return false
  }

  if (
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
        playedHole?.specialScoringEnabled ||
        playedHole?.specialScoringApplied ||
        toNumber(playedHole?.bonusSkins, 0) > 0 ||
        playedHole?.eagleBonusApplied
    )

  if (historyHasSpecialScoring) {
    return true
  }

  const playerHoleHasSpecialScoring =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied
      )
    )

  return playerHoleHasSpecialScoring
}

export default function Profile() {
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

  const player =
    playerStats.find(
      (currentPlayer) =>
        normalizeName(currentPlayer.name) ===
        normalizeName(userName)
    ) || null

  const recentMatches =
    [...completedRounds]
      .filter((round) =>
        getRoundPlayers(round).some(
          (roundPlayer) =>
            normalizeName(roundPlayer.name) ===
            normalizeName(userName)
        )
      )
      .sort(
        (a, b) =>
          toNumber(b.createdAt, 0) -
          toNumber(a.createdAt, 0)
      )
      .slice(0, 3)

  function handleLogout() {
    logout()

    navigate("/login", {
      replace: true,
    })
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
            duration: 0.35,
            ease: "easeOut",
          }}
        >
          <h1 className="text-6xl font-black tracking-tight">
            Profile
          </h1>
        </motion.div>

        {/* Hero */}
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
          className="mt-8 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
        >
          <div className="p-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-4xl font-black shadow-[0_15px_40px_rgba(16,185,129,0.35)]">
              {getInitials(userName)}
            </div>

            <div className="mt-6 truncate text-6xl font-black tracking-tight">
              {userName}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-xl">
                <div className="text-sm font-bold text-slate-400">
                  Wins
                </div>

                <div className="mt-2 text-3xl font-black text-white">
                  {toNumber(player?.wins, 0)}
                </div>
              </div>

              <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-xl">
                <div className="text-sm font-bold text-slate-400">
                  Rounds
                </div>

                <div className="mt-2 text-3xl font-black text-white">
                  {toNumber(player?.roundsPlayed, 0)}
                </div>
              </div>

              <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-xl">
                <div className="text-sm font-bold text-slate-400">
                  Earnings
                </div>

                <div
                  className={`mt-2 text-3xl font-black ${getMoneyColorDark(player?.totalWinnings)}`}
                >
                  {formatMoney(player?.totalWinnings)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Performance */}
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
            delay: 0.08,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[38px] bg-white/90 p-5 shadow-sm backdrop-blur-xl"
        >
          <div className="text-2xl font-black tracking-tight text-slate-950">
            Performance
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Target size={18} />

                <div className="text-sm font-bold">
                  Birdies
                </div>
              </div>

              <div className="mt-4 text-5xl font-black text-red-500">
                {toNumber(player?.birdies, 0)}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Crown size={18} />

                <div className="text-sm font-bold">
                  Wins
                </div>
              </div>

              <div className="mt-4 text-5xl font-black text-yellow-500">
                {toNumber(player?.wins, 0)}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Flag size={18} />

                <div className="text-sm font-bold">
                  Avg To Par
                </div>
              </div>

              <div
                className={`mt-4 text-5xl font-black ${getToParColor(player?.avgToPar)}`}
              >
                {formatToPar(player?.avgToPar)}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <DollarSign size={18} />

                <div className="text-sm font-bold">
                  Earnings
                </div>
              </div>

              <div
                className={`mt-4 text-5xl font-black ${getMoneyColor(player?.totalWinnings)}`}
              >
                {formatMoney(player?.totalWinnings)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Rounds */}
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
            delay: 0.12,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[38px] bg-white/90 p-5 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Scorecards
              </div>

              <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Recent Rounds
              </div>
            </div>

            <div className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
              Recent
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentMatches.length === 0 && (
              <div className="rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch keine Runden gespielt.
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
                  className="w-full rounded-[26px] border border-slate-100 bg-white p-5 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-950">
                          {getRoundDate(round)}
                        </div>

                        <div className="rounded-full border border-slate-100 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                          {roundId}
                        </div>

                        {roundHasSpecialMode && (
                          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <Sparkles size={10} />
                            Skinz Professional
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

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div
                          className={`text-xs font-black uppercase tracking-widest ${getSkinColor(roundPlayer?.skins)}`}
                        >
                          {formatSkinSaldo(roundPlayer?.skins)} Skinz
                        </div>

                        {isWinner && (
                          <div className="flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                            <Crown size={10} />
                            Winner
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
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Logout */}
        <motion.button
          type="button"
          whileTap={{
            scale: 0.985,
          }}
          initial={{
            opacity: 0,
            y: 20,
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
          className="mt-8 flex w-full items-center justify-between rounded-[30px] border border-red-100 bg-white px-5 py-4 text-red-500 shadow-sm"
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