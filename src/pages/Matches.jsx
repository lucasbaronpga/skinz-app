import {
  motion,
} from "framer-motion"

import {
  useNavigate,
} from "react-router-dom"

import {
  ChevronRight,
  Trophy,
  Crown,
  Users,
  MapPin,
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

export default function Matches() {

  const navigate =
    useNavigate()

  const {
    completedRounds,
  } = useGame()

  const sortedRounds =
    [...completedRounds].sort(
      (a, b) =>
        (b.createdAt || 0) -
        (a.createdAt || 0)
    )

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

  function getWinner(
    round
  ) {

    return (
      round.players.find(
        (player) =>
          player.name ===
          round.winner
      ) ||
      round.players[0]
    )
  }

  function getSortedPlayers(
    round
  ) {

    return [...round.players].sort(
      (a, b) =>
        b.winnings -
          a.winnings ||
        a.totalToPar -
          b.totalToPar
    )
  }

  function getCourseName(
    round
  ) {

    return (
      round.course?.name ||
      "Erster Golfclub Westpfalz"
    )
  }

  function getCourseLocation(
    round
  ) {

    return (
      round.course?.location ||
      "Westpfalz"
    )
  }

  function getCoursePar(
    round
  ) {

    return (
      round.course?.par ||
      72
    )
  }

  function getCourseMeta(
    round
  ) {

    return `${getCourseLocation(
      round
    )} · Par ${getCoursePar(
      round
    )}`
  }

  return (

    <div className="min-h-screen bg-[#f5f5f7] pb-36 pt-8 text-slate-950">

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
          }}
        >

          <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
            Match Archiv
          </div>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Matches
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-400">
            Vergangene Runden,
            Golfplätze, Gewinner und
            Scorekarten im Überblick.
          </p>

        </motion.div>

        {/* Empty State */}
        {sortedRounds.length === 0 && (

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            className="mt-16 rounded-[42px] bg-white p-10 text-center shadow-sm"
          >

            <div className="text-7xl">
              ⛳
            </div>

            <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Noch keine Matches
            </div>

            <div className="mt-3 text-sm font-bold leading-relaxed text-slate-400">
              Spiele eine komplette
              Runde um dein Match
              Archiv aufzubauen.
            </div>

          </motion.div>

        )}

        {/* Match Cards */}
        <div className="mt-10 space-y-6">

          {sortedRounds.map(
            (
              round,
              index
            ) => {

              const winner =
                getWinner(
                  round
                )

              const sortedPlayers =
                getSortedPlayers(
                  round
                )

              const courseName =
                getCourseName(
                  round
                )

              const courseMeta =
                getCourseMeta(
                  round
                )

              return (

                <motion.button
                  key={round.id}

                  whileTap={{
                    scale: 0.985,
                  }}

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

                  onClick={() =>
                    navigate(
                      `/matches/${round.id}`
                    )
                  }

                  className="w-full overflow-hidden rounded-[42px] bg-white text-left shadow-sm transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.10)]"
                >

                  {/* Hero */}
                  <div className="bg-slate-950 p-7 text-white">

                    {/* Top */}
                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                          Match Gewinner
                        </div>

                        <div className="mt-4 flex items-center gap-3">

                          <div className="truncate text-5xl font-black tracking-tight">
                            {round.winner}
                          </div>

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">

                            <Trophy
                              size={22}
                            />

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Match / Golfplatz Chips */}
                    <div className="mt-5 flex flex-wrap gap-2">

                      <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                        {round.id}
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">

                        <MapPin
                          size={13}
                        />

                        <span className="max-w-[220px] truncate">
                          {courseName}
                        </span>

                      </div>

                    </div>

                    {/* Bottom */}
                    <div className="mt-8 flex items-end justify-between">

                      {/* Earnings */}
                      <div>

                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Earnings
                        </div>

                        <div className="mt-2 text-6xl font-black tracking-tight text-emerald-400">

                          +
                          {
                            round.winnings
                          }
                          €

                        </div>

                      </div>

                      {/* Score */}
                      <div className="text-right">

                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Score
                        </div>

                        <div
                          className={`mt-2 text-5xl font-black tracking-tight ${getToParColor(
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

                  {/* Content */}
                  <div className="p-6">

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3">

                      {/* Date */}
                      <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">

                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                          Datum
                        </div>

                        <div className="mt-2 text-xl font-black tracking-tight text-slate-950">
                          {round.date}
                        </div>

                        <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                          Abgeschlossen
                        </div>

                      </div>

                      {/* Players */}
                      <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-right shadow-sm">

                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                          Spieler
                        </div>

                        <div className="mt-2 flex items-center justify-end gap-2 text-xl font-black tracking-tight text-slate-950">

                          <Users
                            size={18}
                          />

                          {
                            round.players
                              .length
                          }

                        </div>

                        <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                          Flight
                        </div>

                      </div>

                    </div>

                    {/* Golfplatz Meta */}
                    <div className="mt-4 rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

                      <div className="flex items-center justify-between gap-4">

                        <div className="min-w-0">

                          <div className="flex items-center gap-2 text-slate-400">

                            <MapPin
                              size={16}
                            />

                            <div className="text-xs font-black uppercase tracking-[0.25em]">
                              Golfplatz
                            </div>

                          </div>

                          <div className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
                            {courseName}
                          </div>

                          <div className="mt-1 text-sm font-bold text-slate-400">
                            {courseMeta}
                          </div>

                        </div>

                        <div className="text-3xl">
                          ⛳
                        </div>

                      </div>

                    </div>

                    {/* Players */}
                    <div className="mt-6 space-y-3">

                      {sortedPlayers.map(
                        (
                          player,
                          playerIndex
                        ) => {

                          const isWinner =
                            player.name ===
                            round.winner

                          return (

                            <div
                              key={
                                player.name
                              }

                              className={`flex items-center justify-between rounded-[24px] border px-5 py-4 shadow-sm ${
                                isWinner
                                  ? "border-emerald-100 bg-emerald-50"
                                  : "border-slate-100 bg-white"
                              }`}
                            >

                              {/* Left */}
                              <div className="min-w-0">

                                <div className="flex items-center gap-3">

                                  {/* Ranking */}
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                      playerIndex === 0
                                        ? "bg-yellow-400 text-black"
                                        : playerIndex === 1
                                        ? "border border-slate-200 bg-white text-slate-900"
                                        : playerIndex === 2
                                        ? "bg-orange-400 text-white"
                                        : "border border-slate-200 bg-white text-slate-900"
                                    }`}
                                  >

                                    {
                                      playerIndex +
                                      1
                                    }

                                  </div>

                                  {/* Player */}
                                  <div className="min-w-0">

                                    <div className="flex items-center gap-2">

                                      <div className="truncate text-xl font-black tracking-tight text-slate-950">

                                        {
                                          player.name
                                        }

                                      </div>

                                      {isWinner && (

                                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">

                                          <Crown
                                            size={
                                              10
                                            }
                                          />

                                          Winner

                                        </div>

                                      )}

                                    </div>

                                    <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">

                                      {
                                        player.skins
                                      }{" "}
                                      Skins

                                    </div>

                                  </div>

                                </div>

                              </div>

                              {/* Right */}
                              <div className="shrink-0 text-right">

                                <div
                                  className={`text-3xl font-black tracking-tight ${getToParColor(
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

                            </div>

                          )
                        }
                      )}

                    </div>

                    {/* Footer */}
                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">

                      <div className="text-sm font-black uppercase tracking-widest text-slate-400">
                        Scorekarte
                      </div>

                      <div className="flex items-center gap-2 text-sm font-black text-slate-950">

                        Öffnen

                        <ChevronRight
                          size={18}
                        />

                      </div>

                    </div>

                  </div>

                </motion.button>

              )
            }
          )}

        </div>

      </div>

    </div>
  )
}