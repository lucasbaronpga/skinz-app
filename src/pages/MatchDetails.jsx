import {
  useState,
} from "react"

import {
  AnimatePresence,
  motion,
} from "framer-motion"

import {
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  ArrowLeft,
  Trophy,
  Crown,
  ChevronDown,
  Flame,
  MapPin,
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

export default function MatchDetails() {

  const {
    id,
  } = useParams()

  const navigate =
    useNavigate()

  const {
    completedRounds,
  } = useGame()

  const [
    expandedPlayer,
    setExpandedPlayer,
  ] = useState(null)

  const round =
    completedRounds.find(
      (round) =>
        String(round.id) ===
        String(id)
    )

  if (!round) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-5">

        <div className="w-full max-w-sm rounded-[40px] bg-white p-10 text-center shadow-sm">

          <div className="text-3xl font-black tracking-tight text-slate-950">
            Match nicht gefunden
          </div>

          <button
            onClick={() =>
              navigate("/matches")
            }

            className="mt-6 rounded-2xl bg-slate-950 px-6 py-4 font-black text-white"
          >
            Zurück
          </button>

        </div>

      </div>
    )
  }

  const sortedPlayers =
    [...round.players].sort(
      (a, b) =>
        b.winnings - a.winnings ||
        a.totalToPar - b.totalToPar
    )

  const winner =
    round.players.find(
      (player) =>
        player.name ===
        round.winner
    ) || sortedPlayers[0]

  const courseName =
    round.course?.name ||
    "Erster Golfclub Westpfalz"

  const courseLocation =
    round.course?.location ||
    "Westpfalz"

  const coursePar =
    round.course?.par ||
    72

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

  function getScoreStyle(
    label
  ) {

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

  function countResult(
    player,
    result
  ) {

    return (
      player.holes?.filter(
        (hole) =>
          hole.result?.label ===
          result
      ).length || 0
    )
  }

  function getHoleToPar(
    hole
  ) {

    return (
      (hole?.score || 0) -
      (hole?.par || 0)
    )
  }

  function getNineTotal(
    holes
  ) {

    return holes.reduce(
      (total, hole) =>
        total + (hole.score || 0),
      0
    )
  }

  function getNinePar(
    holes
  ) {

    return holes.reduce(
      (total, hole) =>
        total + (hole.par || 0),
      0
    )
  }

  function getNineToPar(
    holes
  ) {

    return (
      getNineTotal(holes) -
      getNinePar(holes)
    )
  }

  function getPlayerTotalScore(
    player
  ) {

    return (
      player.holes?.reduce(
        (total, hole) =>
          total + (hole.score || 0),
        0
      ) || 0
    )
  }

  function getPlayerTotalPar(
    player
  ) {

    return (
      player.holes?.reduce(
        (total, hole) =>
          total + (hole.par || 0),
        0
      ) || coursePar
    )
  }

  function renderSummaryCard(
    label,
    score,
    par,
    toPar
  ) {

    return (

      <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">

        <div className="text-xs font-black uppercase tracking-widest text-slate-400">
          {label}
        </div>

        <div className="mt-2 text-3xl font-black text-slate-950">
          {score}
        </div>

        <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
          Par {par}
        </div>

        <div
          className={`mt-2 text-lg font-black ${getToParColor(
            toPar
          )}`}
        >
          {formatToPar(
            toPar
          )}
        </div>

      </div>

    )
  }

  function renderHoleGrid(
    holes
  ) {

    return (

      <div className="grid grid-cols-3 gap-3">

        {holes.map(
          (hole) => {

            const toPar =
              getHoleToPar(
                hole
              )

            return (

              <div
                key={hole.hole}

                className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm"
              >

                <div className="flex items-center justify-between">

                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Loch
                  </div>

                  <div className="text-xl font-black text-slate-950">
                    {hole.hole}
                  </div>

                </div>

                <div className="mt-4 flex justify-center">

                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-black shadow-sm ${getScoreStyle(
                      hole.result?.label
                    )}`}
                  >
                    {hole.score}
                  </div>

                </div>

                <div className="mt-4 flex items-center justify-between gap-2">

                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Par {hole.par}
                  </div>

                  <div
                    className={`text-xs font-black uppercase tracking-widest ${getToParColor(
                      toPar
                    )}`}
                  >
                    {formatToPar(
                      toPar
                    )}
                  </div>

                </div>

                <div className="mt-2 truncate text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {hole.result?.label || "Par"}
                </div>

              </div>

            )
          }
        )}

      </div>

    )
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

            onClick={() =>
              navigate("/matches")
            }

            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft
              size={22}
            />
          </motion.button>

          <div className="text-right">

            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
              Match Details
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {round.date}
            </div>

          </div>

        </div>

        {/* Winner Hero */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          className="mt-8 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
        >

          <div className="p-8">

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                  Match Winner
                </div>

                <div className="mt-4 flex items-center gap-3">

                  <div className="truncate text-6xl font-black tracking-tight">
                    {winner?.name}
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
                    <Trophy
                      size={26}
                    />
                  </div>

                </div>

              </div>

            </div>

            {/* Match / Golfplatz Chips */}
            <div className="mt-6 flex flex-wrap gap-2">

              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                Match {round.id}
              </div>

              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">

                <MapPin
                  size={13}
                />

                <span className="max-w-[230px] truncate">
                  {courseName}
                </span>

              </div>

            </div>

            <div className="mt-10 flex items-end justify-between">

              <div>

                <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Earnings
                </div>

                <div className="mt-2 text-6xl font-black text-emerald-400">
                  +{round.winnings}€
                </div>

              </div>

              <div className="text-right">

                <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                  To Par
                </div>

                <div
                  className={`mt-2 text-5xl font-black ${getToParColor(
                    winner?.totalToPar
                  )}`}
                >
                  {formatToPar(
                    winner?.totalToPar
                  )}
                </div>

              </div>

            </div>

          </div>

        </motion.div>

        {/* Golfplatz Card */}
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
            delay: 0.04,
          }}

          className="mt-8 rounded-[36px] bg-white p-6 shadow-sm"
        >

          <div className="flex items-center justify-between gap-4">

            <div className="min-w-0">

              <div className="flex items-center gap-2 text-slate-400">

                <MapPin
                  size={18}
                />

                <div className="text-xs font-black uppercase tracking-[0.25em]">
                  Golfplatz
                </div>

              </div>

              <div className="mt-3 truncate text-4xl font-black tracking-tight text-slate-950">
                {courseName}
              </div>

              <div className="mt-2 text-sm font-bold text-slate-400">
                {courseLocation}
              </div>

            </div>

            <div className="shrink-0 text-right">

              <div className="text-5xl font-black text-slate-950">
                {coursePar}
              </div>

              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                Par
              </div>

            </div>

          </div>

        </motion.div>

        {/* Meta */}
        <div className="mt-8 grid grid-cols-3 gap-3">

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">

            <div className="text-4xl font-black text-slate-950">
              {round.players.length}
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Spieler
            </div>

          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">

            <div className="text-4xl font-black text-slate-950">
              18
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Löcher
            </div>

          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">

            <div className="text-4xl font-black text-slate-950">
              {winner?.skins || 0}
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Skins
            </div>

          </div>

        </div>

        {/* Final Leaderboard */}
        <div className="mt-8 rounded-[40px] bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Final Ranking
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Rangliste
              </div>

            </div>

            <div className="text-4xl">
              🏆
            </div>

          </div>

          <div className="mt-6 space-y-4">

            {sortedPlayers.map(
              (
                player,
                index
              ) => {

                const isExpanded =
                  expandedPlayer ===
                  player.name

                const frontNine =
                  player.holes?.slice(
                    0,
                    9
                  ) || []

                const backNine =
                  player.holes?.slice(
                    9,
                    18
                  ) || []

                const totalScore =
                  getPlayerTotalScore(
                    player
                  )

                const totalPar =
                  getPlayerTotalPar(
                    player
                  )

                const totalToPar =
                  totalScore -
                  totalPar

                return (

                  <div
                    key={player.name}
                  >

                    {/* Player Row */}
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

                      className={`w-full rounded-[32px] border px-5 py-5 text-left transition-all duration-300 ${
                        player.name ===
                        round.winner
                          ? "border-emerald-100 bg-emerald-50"
                          : "border-slate-100 bg-white"
                      }`}
                    >

                      <div className="flex items-center justify-between gap-4">

                        {/* Left */}
                        <div className="flex min-w-0 items-center gap-4">

                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              index === 0
                                ? "bg-yellow-400 text-black"
                                : index === 1
                                ? "bg-slate-200 text-slate-900"
                                : index === 2
                                ? "bg-orange-400 text-white"
                                : "bg-white text-slate-900 border border-slate-200"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <div className="truncate text-3xl font-black tracking-tight text-slate-950">
                                {player.name}
                              </div>

                              {player.name ===
                                round.winner && (

                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">

                                  <Crown
                                    size={10}
                                  />

                                  Winner

                                </div>

                              )}

                            </div>

                            <div className="mt-2 text-sm font-black uppercase tracking-widest text-slate-400">
                              {player.skins} Skins · {player.winnings}€
                            </div>

                          </div>

                        </div>

                        {/* Right */}
                        <div className="flex shrink-0 items-center gap-3">

                          <div className="text-right">

                            <div
                              className={`text-5xl font-black ${getToParColor(
                                player.totalToPar
                              )}`}
                            >
                              {formatToPar(
                                player.totalToPar
                              )}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              To Par
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

                    </motion.button>

                    {/* Expanded Scorecard */}
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

                          {/* Player Stats */}
                          <div className="mt-4 grid grid-cols-3 gap-3">

                            <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">

                              <div className="flex justify-center">
                                <Flame
                                  size={24}
                                  className="text-red-500"
                                />
                              </div>

                              <div className="mt-3 text-3xl font-black text-slate-950">
                                {countResult(
                                  player,
                                  "Birdie"
                                )}
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Birdies
                              </div>

                            </div>

                            <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">

                              <div className="text-2xl">
                                🦅
                              </div>

                              <div className="mt-3 text-3xl font-black text-slate-950">
                                {countResult(
                                  player,
                                  "Eagle"
                                )}
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Eagles
                              </div>

                            </div>

                            <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">

                              <div className="text-2xl">
                                💰
                              </div>

                              <div className="mt-3 text-3xl font-black text-emerald-600">
                                {player.winnings}€
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Earnings
                              </div>

                            </div>

                          </div>

                          {/* Score Summary */}
                          <div className="mt-5 grid grid-cols-3 gap-3">

                            {renderSummaryCard(
                              "Front 9",
                              getNineTotal(frontNine),
                              getNinePar(frontNine),
                              getNineToPar(frontNine)
                            )}

                            {renderSummaryCard(
                              "Back 9",
                              getNineTotal(backNine),
                              getNinePar(backNine),
                              getNineToPar(backNine)
                            )}

                            {renderSummaryCard(
                              "Total",
                              totalScore,
                              totalPar,
                              totalToPar
                            )}

                          </div>

                          {/* Front 9 */}
                          <div className="mt-6">

                            <div className="mb-3 flex items-end justify-between">

                              <div>

                                <div className="text-2xl font-black tracking-tight text-slate-950">
                                  Front 9
                                </div>

                                <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                  Score {getNineTotal(frontNine)} · Par {getNinePar(frontNine)}
                                </div>

                              </div>

                              <div
                                className={`text-sm font-black uppercase tracking-widest ${getToParColor(
                                  getNineToPar(
                                    frontNine
                                  )
                                )}`}
                              >
                                {formatToPar(
                                  getNineToPar(
                                    frontNine
                                  )
                                )}
                              </div>

                            </div>

                            {renderHoleGrid(
                              frontNine
                            )}

                          </div>

                          {/* Back 9 */}
                          <div className="mt-8">

                            <div className="mb-3 flex items-end justify-between">

                              <div>

                                <div className="text-2xl font-black tracking-tight text-slate-950">
                                  Back 9
                                </div>

                                <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                  Score {getNineTotal(backNine)} · Par {getNinePar(backNine)}
                                </div>

                              </div>

                              <div
                                className={`text-sm font-black uppercase tracking-widest ${getToParColor(
                                  getNineToPar(
                                    backNine
                                  )
                                )}`}
                              >
                                {formatToPar(
                                  getNineToPar(
                                    backNine
                                  )
                                )}
                              </div>

                            </div>

                            {renderHoleGrid(
                              backNine
                            )}

                          </div>

                        </motion.div>

                      )}

                    </AnimatePresence>

                  </div>

                )
              }
            )}

          </div>

        </div>

      </div>

    </div>
  )
}