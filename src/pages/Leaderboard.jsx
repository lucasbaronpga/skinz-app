import {
  useState,
} from "react"

import {
  AnimatePresence,
  motion,
} from "framer-motion"

import {
  useNavigate,
} from "react-router-dom"

import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Flame,
  Trophy,
  MapPin,
  Sparkles,
} from "lucide-react"

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

function getRankStyle(index) {
  if (index === 0) {
    return "bg-yellow-400 text-black"
  }

  if (index === 1) {
    return "bg-slate-300 text-slate-950"
  }

  if (index === 2) {
    return "bg-[#cd7f32] text-white"
  }

  return "border border-slate-200 bg-white text-slate-700"
}

function isHotPlayer(player) {
  return (
    toNumber(player?.wins, 0) >= 3 ||
    toNumber(player?.totalWinnings, 0) >= 20
  )
}

function getWinRate(player) {
  const wins =
    toNumber(player?.wins, 0)

  const roundsPlayed =
    toNumber(player?.roundsPlayed, 0)

  if (!roundsPlayed) {
    return 0
  }

  return Math.round(
    (wins / roundsPlayed) * 100
  )
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players)
    ? round.players
    : []
}

function getRecentMatches(completedRounds, playerName) {
  return completedRounds
    .filter((round) =>
      getRoundPlayers(round).some(
        (player) =>
          player.name === playerName
      )
    )
    .sort(
      (a, b) =>
        toNumber(b.createdAt, 0) -
        toNumber(a.createdAt, 0)
    )
    .slice(0, 3)
}

function getRoundPlayer(round, playerName) {
  return (
    getRoundPlayers(round).find(
      (player) =>
        player.name === playerName
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

function getPlayerTotalScore(player) {
  if (Array.isArray(player?.holes) && player.holes.length > 0) {
    return player.holes.reduce(
      (total, hole) =>
        total + toNumber(hole.score, 0),
      0
    )
  }

  return toNumber(player?.total, 0)
}

function getLatestScore(recentMatches, playerName) {
  const latestRound =
    recentMatches[0]

  const latestPlayer =
    getRoundPlayer(
      latestRound,
      playerName
    )

  return getPlayerTotalScore(latestPlayer)
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

function playerHasSpecialScoringInRound(player) {
  return (
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
}

export default function Leaderboard() {
  const navigate = useNavigate()

  const {
    playerStats,
    completedRounds,
  } = useGame()

  const [
    expandedPlayer,
    setExpandedPlayer,
  ] = useState(null)

  const sortedPlayers =
    [...playerStats].sort(
      (a, b) =>
        toNumber(b.totalWinnings, 0) -
          toNumber(a.totalWinnings, 0) ||
        toNumber(b.wins, 0) -
          toNumber(a.wins, 0) ||
        toNumber(a.avgToPar, 0) -
          toNumber(b.avgToPar, 0)
    )

  const seasonLeader =
    sortedPlayers[0] || null

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate("/")
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-[calc(9rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <div className="mx-auto max-w-md px-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.button
            type="button"
            whileTap={{
              scale: 0.92,
            }}
            onClick={handleBack}
            aria-label="Zurück"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={22} />
          </motion.button>

          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
              Season
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Leaderboard
            </div>
          </div>
        </div>

        {/* Title */}
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
          <h1 className="text-6xl font-black tracking-tight text-slate-950">
            Leaderboard
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-400">
            Season Rankings, Winnings & Performance of all Players.
          </p>
        </motion.div>

        {/* Empty State */}
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
            className="mt-16 rounded-[40px] bg-white/90 p-10 text-center shadow-sm backdrop-blur-xl"
          >
            <div
              className="text-7xl"
              aria-hidden="true"
            >
              🏌️
            </div>

            <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Noch kein Leaderboard
            </div>

            <div className="mt-3 text-sm font-bold leading-relaxed text-slate-400">
              Spiele deine erste Runde, um Rankings und Scorecards zu sehen.
            </div>

            <button
              type="button"
              onClick={() => navigate("/round")}
              className="mt-8 w-full rounded-[28px] bg-emerald-500 py-5 text-lg font-black text-white shadow-lg"
            >
              Runde starten
            </button>
          </motion.div>
        )}

        {/* Season Leader */}
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
            className="mt-8 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                    Season Leader
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="truncate text-6xl font-black tracking-tight">
                      {seasonLeader.name}
                    </div>

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
                      <Trophy size={26} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-end justify-between gap-5">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Winnings
                  </div>

                  <div
                    className={`mt-2 text-6xl font-black ${getMoneyColorDark(seasonLeader.totalWinnings)}`}
                  >
                    {formatMoney(seasonLeader.totalWinnings)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Wins
                  </div>

                  <div className="mt-2 text-5xl font-black text-white">
                    {toNumber(seasonLeader.wins, 0)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rankings */}
        {sortedPlayers.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Global Ranking
                </div>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Players
                </h2>
              </div>

              <div className="text-sm font-black uppercase tracking-widest text-slate-400">
                Winnings
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {sortedPlayers.map((player, index) => {
                const isExpanded =
                  expandedPlayer === player.name

                const recentMatches =
                  getRecentMatches(
                    completedRounds,
                    player.name
                  )

                const latestScore =
                  getLatestScore(
                    recentMatches,
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
                    {/* Player Card */}
                    <motion.button
                      type="button"
                      whileTap={{
                        scale: 0.985,
                      }}
                      onClick={() =>
                        setExpandedPlayer(
                          isExpanded
                            ? null
                            : player.name
                        )
                      }
                      aria-expanded={isExpanded}
                      className="w-full rounded-[36px] border border-white/70 bg-white/90 p-5 text-left shadow-sm backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black shadow-sm ${getRankStyle(index)}`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-3xl font-black tracking-tight text-slate-950">
                                {player.name}
                              </div>

                              {index === 0 && (
                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
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

                            <div className="mt-2 text-sm font-bold text-slate-400">
                              {toNumber(player.wins, 0)} Wins •{" "}
                              {toNumber(player.birdies, 0)} Birdies
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <div
                              className={`text-4xl font-black tracking-tight ${getMoneyColor(player.totalWinnings)}`}
                            >
                              {formatMoney(player.totalWinnings)}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              Total
                            </div>
                          </div>

                          <motion.div
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
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">
                          <div className="text-2xl font-black text-slate-950">
                            {toNumber(player.roundsPlayed, 0)}
                          </div>

                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Rounds
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">
                          <div
                            className={`text-2xl font-black ${getToParColor(player.avgToPar)}`}
                          >
                            {formatToPar(player.avgToPar)}
                          </div>

                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Avg
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">
                          <div className="text-2xl font-black text-blue-500">
                            {getWinRate(player)}%
                          </div>

                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Win
                          </div>
                        </div>
                      </div>
                    </motion.button>

                    {/* Expanded Details */}
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
                          <div className="mt-4 rounded-[34px] bg-white/90 p-5 shadow-sm backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                                  Scorecards
                                </div>

                                <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                                  Recent Rounds
                                </div>
                              </div>

                              <div className="text-sm font-black text-slate-400">
                                {recentMatches.length}
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
                                    player.name
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

                                const playerHasSpecialMode =
                                  !isWolffnRound &&
                                  playerHasSpecialScoringInRound(roundPlayer)

                                return (
                                  <div
                                    key={`${player.name}-${roundId}`}
                                    className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"
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

                                          {isWolffnRound && (
                                            <div className="flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                                              <span aria-hidden="true">
                                                🐺
                                              </span>
                                              Wolffn
                                            </div>
                                          )}

                                          {!isWolffnRound && roundHasSpecialMode && (
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
                                          className={`text-3xl font-black ${getMoneyColor(roundPlayer?.winnings)}`}
                                        >
                                          {formatMoney(roundPlayer?.winnings)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Performance */}
                            <div className="mt-6 grid grid-cols-2 gap-4">
                              <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="text-sm font-bold text-slate-400">
                                  Score
                                </div>

                                <div className="mt-2 text-5xl font-black text-slate-950">
                                  {latestScore || 0}
                                </div>
                              </div>

                              <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="text-sm font-bold text-slate-400">
                                  Winnings
                                </div>

                                <div
                                  className={`mt-2 text-5xl font-black ${getMoneyColor(player.totalWinnings)}`}
                                >
                                  {formatMoney(player.totalWinnings)}
                                </div>
                              </div>
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