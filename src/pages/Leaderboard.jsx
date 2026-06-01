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
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

export default function Leaderboard() {

  const navigate =
    useNavigate()

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
        b.totalWinnings -
        a.totalWinnings
    )

  const seasonLeader =
    sortedPlayers[0]

  function handleBack() {

    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate("/")
  }

  function getRankStyle(
    index
  ) {

    if (index === 0) {
      return "bg-yellow-400 text-black"
    }

    if (index === 1) {
      return "bg-white text-slate-900 border border-slate-200"
    }

    if (index === 2) {
      return "bg-orange-400 text-white"
    }

    return "bg-white text-slate-700 border border-slate-200"
  }

  function getHotPlayer(
    player
  ) {

    return (
      player.wins >= 3 ||
      player.totalWinnings >= 20
    )
  }

  function getWinRate(
    player
  ) {

    if (!player.roundsPlayed) {
      return 0
    }

    return Math.round(
      (
        player.wins /
        player.roundsPlayed
      ) * 100
    )
  }

  function getRecentMatches(
    playerName
  ) {

    return completedRounds
      .filter((round) =>
        round.players.some(
          (player) =>
            player.name ===
            playerName
        )
      )
      .sort(
        (a, b) =>
          (b.createdAt || 0) -
          (a.createdAt || 0)
      )
      .slice(0, 3)
  }

  function getRoundCourseName(
    round
  ) {

    return (
      round?.course?.name ||
      "Erster Golfclub Westpfalz"
    )
  }

  function getRoundCourseLocation(
    round
  ) {

    return (
      round?.course?.location ||
      "Westpfalz"
    )
  }

  function getRoundCoursePar(
    round
  ) {

    return (
      round?.course?.par ||
      72
    )
  }

  function getRoundCourseMeta(
    round
  ) {

    return `${getRoundCourseLocation(
      round
    )} · Par ${getRoundCoursePar(
      round
    )}`
  }

  function formatToPar(
    value
  ) {

    if (
      value === 0 ||
      value === undefined ||
      value === null
    ) {
      return "E"
    }

    if (Number(value) > 0) {
      return `+${value}`
    }

    return value
  }

  function getToParColor(
    value
  ) {

    if (Number(value) < 0) {
      return "text-emerald-500"
    }

    if (Number(value) > 0) {
      return "text-red-500"
    }

    return "text-slate-950"
  }

  return (

    <div className="min-h-screen bg-[#f5f5f7] pb-36 pt-8 text-slate-950">

      <div className="mx-auto max-w-md px-5">

        {/* Header */}
        <div className="flex items-center justify-between">

          <motion.button
            whileTap={{
              scale: 0.92,
            }}

            onClick={handleBack}

            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
          >

            <ArrowLeft
              size={22}
            />

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

          className="mt-8"
        >

          <h1 className="text-6xl font-black tracking-tight text-slate-950">
            Leaderboard
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-400">
            Season Rankings,
            Winnings und Performance
            aller Spieler.
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

            className="mt-16 rounded-[40px] bg-white p-10 text-center shadow-sm"
          >

            <div className="text-7xl">
              🏌️
            </div>

            <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Noch kein Leaderboard
            </div>

            <div className="mt-3 text-sm font-bold text-slate-400">
              Spiele deine erste Runde,
              um Rankings und Scorecards
              zu sehen.
            </div>

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
            }}

            className="mt-8 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
          >

            <div className="p-8">

              <div className="flex items-start justify-between">

                <div>

                  <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                    Season Leader
                  </div>

                  <div className="mt-4 flex items-center gap-3">

                    <div className="text-6xl font-black tracking-tight">
                      {seasonLeader.name}
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">

                      <Trophy
                        size={26}
                      />

                    </div>

                  </div>

                </div>

              </div>

              <div className="mt-10 flex items-end justify-between">

                <div>

                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Winnings
                  </div>

                  <div className="mt-2 text-6xl font-black text-emerald-400">
                    {seasonLeader.totalWinnings}€
                  </div>

                </div>

                <div className="text-right">

                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Wins
                  </div>

                  <div className="mt-2 text-5xl font-black text-white">
                    {seasonLeader.wins}
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

              {sortedPlayers.map(
                (
                  player,
                  index
                ) => {

                  const isExpanded =
                    expandedPlayer ===
                    player.name

                  const recentMatches =
                    getRecentMatches(
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
                        delay:
                          index * 0.04,
                      }}
                    >

                      {/* Player Card */}
                      <motion.button
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

                        className="w-full rounded-[36px] border border-slate-100 bg-white p-5 text-left shadow-sm"
                      >

                        <div className="flex items-center justify-between gap-4">

                          {/* Left */}
                          <div className="flex min-w-0 items-center gap-4">

                            <div
                              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black shadow-sm ${getRankStyle(
                                index
                              )}`}
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

                                    <Crown
                                      size={10}
                                    />

                                    #1

                                  </div>

                                )}

                                {getHotPlayer(
                                  player
                                ) && index !== 0 && (

                                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">

                                    <Flame
                                      size={10}
                                    />

                                    Hot

                                  </div>

                                )}

                              </div>

                              <div className="mt-2 text-sm font-bold text-slate-400">

                                {player.wins} Wins •{" "}
                                {player.birdies} Birdies

                              </div>

                            </div>

                          </div>

                          {/* Right */}
                          <div className="flex shrink-0 items-center gap-3">

                            <div className="text-right">

                              <div className="text-4xl font-black tracking-tight text-emerald-600">
                                {player.totalWinnings}€
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Total
                              </div>

                            </div>

                            <motion.div
                              animate={{
                                rotate:
                                  isExpanded
                                    ? 180
                                    : 0,
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
                        <div className="mt-5 grid grid-cols-4 gap-3">

                          <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">

                            <div className="text-2xl font-black text-orange-500">
                              {player.eagles}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Eagles
                            </div>

                          </div>

                          <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">

                            <div className="text-2xl font-black text-slate-950">
                              {player.roundsPlayed}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Rounds
                            </div>

                          </div>

                          <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">

                            <div
                              className={`text-2xl font-black ${getToParColor(
                                Number(
                                  player.avgToPar
                                )
                              )}`}
                            >
                              {formatToPar(
                                player.avgToPar
                              )}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Avg
                            </div>

                          </div>

                          <div className="rounded-[22px] border border-slate-100 bg-white p-3 text-center shadow-sm">

                            <div className="text-2xl font-black text-blue-500">
                              {getWinRate(
                                player
                              )}%
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
                            }}

                            className="overflow-hidden"
                          >

                            <div className="mt-4 rounded-[34px] bg-white p-5 shadow-sm">

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

                                {recentMatches.map(
                                  (round) => {

                                    const roundPlayer =
                                      round.players.find(
                                        (p) =>
                                          p.name ===
                                          player.name
                                      )

                                    const courseName =
                                      getRoundCourseName(
                                        round
                                      )

                                    const courseMeta =
                                      getRoundCourseMeta(
                                        round
                                      )

                                    return (

                                      <div
                                        key={round.id}

                                        className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"
                                      >

                                        <div className="flex items-start justify-between gap-4">

                                          {/* Left */}
                                          <div className="min-w-0">

                                            <div className="flex items-center gap-2">

                                              <div className="text-lg font-black text-slate-950">
                                                {round.date}
                                              </div>

                                              <div className="rounded-full border border-slate-100 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                                                {round.id}
                                              </div>

                                            </div>

                                            <div className="mt-3 flex items-center gap-2 text-slate-400">

                                              <MapPin
                                                size={14}
                                              />

                                              <div className="truncate text-sm font-black text-slate-500">
                                                {courseName}
                                              </div>

                                            </div>

                                            <div className="mt-1 text-xs font-bold text-slate-400">
                                              {courseMeta}
                                            </div>

                                            <div className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">
                                              {roundPlayer?.skins || 0} Skins
                                            </div>

                                          </div>

                                          {/* Right */}
                                          <div className="shrink-0 text-right">

                                            <div className="text-3xl font-black text-emerald-600">
                                              {roundPlayer?.winnings > 0
                                                ? `+${roundPlayer?.winnings}€`
                                                : `${roundPlayer?.winnings || 0}€`}
                                            </div>

                                            <div
                                              className={`mt-1 text-sm font-black uppercase tracking-widest ${getToParColor(
                                                roundPlayer?.totalToPar
                                              )}`}
                                            >
                                              {formatToPar(
                                                roundPlayer?.totalToPar
                                              )}
                                            </div>

                                          </div>

                                        </div>

                                      </div>

                                    )
                                  }
                                )}

                              </div>

                              {/* Performance */}
                              <div className="mt-6 grid grid-cols-2 gap-4">

                                <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">

                                  <div className="text-sm font-bold text-slate-400">
                                    Birdies
                                  </div>

                                  <div className="mt-2 text-5xl font-black text-red-500">
                                    {player.birdies}
                                  </div>

                                </div>

                                <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">

                                  <div className="text-sm font-bold text-slate-400">
                                    Winnings
                                  </div>

                                  <div className="mt-2 text-5xl font-black text-emerald-600">
                                    {player.totalWinnings}€
                                  </div>

                                </div>

                              </div>

                            </div>

                          </motion.div>

                        )}

                      </AnimatePresence>

                    </motion.div>

                  )
                }
              )}

            </div>

          </div>

        )}

      </div>

    </div>
  )
}