import {
  Link,
  useNavigate,
} from "react-router-dom"

import {
  motion,
} from "framer-motion"

import {
  ArrowRight,
  Trophy,
  Crown,
  Plus,
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

export default function Home() {

  const navigate =
    useNavigate()

  const {

    hole,

    currentPot,

    players,

    playerStats,

    matchFinished,

    completedRounds,

    activeMatchId,

    hasActiveMatch,

  } = useGame()

  const liveLeader =
    [...players].sort(
      (a, b) =>
        b.winnings -
        a.winnings
    )[0]

  const latestRound =
    [...completedRounds].sort(
      (a, b) =>
        (b.createdAt || 0) -
        (a.createdAt || 0)
    )[0]

  const topPlayers =
    [...playerStats]
      .sort(
        (a, b) =>
          b.totalWinnings -
          a.totalWinnings
      )
      .slice(0, 3)

  const totalRounds =
    completedRounds.length

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

    <div className="min-h-screen bg-[#f5f5f7] pb-36 text-slate-900">

      <div className="px-6 pt-12">

        <div className="mx-auto max-w-md">

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

            className="pt-8"
          >

            <div className="text-sm font-black uppercase tracking-[0.3em] text-emerald-600">
              Modern Golf Skins
            </div>

            <h1 className="mt-4 text-7xl font-black tracking-tight text-slate-950">
              Skinz
            </h1>

            <p className="mt-5 max-w-xs text-lg leading-relaxed text-slate-500">
              Premium Livescoring
              für moderne Golf
              Matches.
            </p>

          </motion.div>

          {/* Active Match OR Start Match */}
          {hasActiveMatch ? (

            <motion.button

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
                delay: 0.05,
              }}

              onClick={() =>
                navigate("/live")
              }

              className="mt-10 w-full overflow-hidden rounded-[42px] border border-white/60 bg-white p-8 text-left shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
            >

              {/* Top */}
              <div className="flex items-start justify-between gap-4">

                <div>

                  <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Aktives Match
                  </div>

                  <div className="mt-3 text-5xl font-black tracking-tight text-slate-950">

                    Hole {hole}

                  </div>

                  <div className="mt-3 inline-flex rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">

                    {activeMatchId}

                  </div>

                </div>

                <div
                  className={`rounded-2xl px-4 py-2 text-xs font-black ${
                    matchFinished
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >

                  {matchFinished
                    ? "Beendet"
                    : "Live"}

                </div>

              </div>

              {/* Pot */}
              <div className="mt-8">

                <div className="text-sm font-bold text-slate-400">
                  Aktueller Pot
                </div>

                <div className="mt-2 text-7xl font-black tracking-tight text-emerald-600">

                  {currentPot}€

                </div>

              </div>

              {/* Leader */}
              <div className="mt-8 flex items-center justify-between rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">

                <div>

                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Leader
                  </div>

                  <div className="mt-1 text-3xl font-black text-slate-900">

                    {liveLeader?.name || "-"}

                  </div>

                </div>

                <div className="text-right">

                  <div className="text-4xl font-black text-emerald-600">

                    {liveLeader?.winnings || 0}€

                  </div>

                  <div className="text-xs font-bold text-slate-400">
                    Gewinn
                  </div>

                </div>

              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">

                <div className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Match öffnen
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg">

                  <ArrowRight
                    size={20}
                  />

                </div>

              </div>

            </motion.button>

          ) : (

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

              className="mt-10 overflow-hidden rounded-[42px] bg-slate-950 p-8 text-white shadow-2xl"
            >

              <div className="flex items-start justify-between">

                <div>

                  <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                    Ready
                  </div>

                  <div className="mt-4 text-5xl font-black tracking-tight">
                    Neues Match
                  </div>

                  <div className="mt-4 max-w-xs text-base font-bold leading-relaxed text-slate-400">
                    Starte eine neue Runde
                    und tracke Skins,
                    Pot und Leader live.
                  </div>

                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">

                  <Plus
                    size={32}
                    strokeWidth={3}
                  />

                </div>

              </div>

              <Link
                to="/round"

                className="mt-10 flex w-full items-center justify-between rounded-[30px] bg-white px-6 py-5 text-slate-950 shadow-lg"
              >

                <div className="text-xl font-black">
                  Runde starten
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">

                  <ArrowRight
                    size={20}
                  />

                </div>

              </Link>

            </motion.div>

          )}

          {/* Quick Action */}
          {hasActiveMatch && (

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
              }}

              className="mt-8"
            >

              <Link
                to="/round"

                className="flex items-center justify-between rounded-[38px] border border-slate-100 bg-white px-6 py-6 shadow-sm transition-all duration-300 hover:scale-[1.01]"
              >

                <div>

                  <div className="text-3xl font-black text-slate-900">
                    Neue Runde
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Neues Match starten
                  </div>

                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg">

                  +

                </div>

              </Link>

            </motion.div>

          )}

          {/* Stats */}
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
              delay: 0.1,
            }}

            className="mt-10 grid grid-cols-3 gap-3"
          >

            {/* Players */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">

              <div className="text-4xl font-black text-slate-950">

                {hasActiveMatch
                  ? players.length
                  : playerStats.length}

              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">

                {hasActiveMatch
                  ? "Spieler"
                  : "Players"}

              </div>

            </div>

            {/* Hole / Rounds */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">

              <div className="text-4xl font-black text-slate-950">

                {hasActiveMatch
                  ? hole
                  : totalRounds}

              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">

                {hasActiveMatch
                  ? "Loch"
                  : "Rounds"}

              </div>

            </div>

            {/* Skins / Wins */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">

              <div className="text-4xl font-black text-slate-950">

                {hasActiveMatch
                  ? liveLeader?.skins || 0
                  : topPlayers[0]?.wins || 0}

              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">

                {hasActiveMatch
                  ? "Skins"
                  : "Wins"}

              </div>

            </div>

          </motion.div>

          {/* Last Winner */}
          {latestRound && (

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
                delay: 0.14,
              }}

              className="mt-10 overflow-hidden rounded-[40px] bg-slate-950 p-6 text-white shadow-2xl"
            >

              <div className="flex items-start justify-between">

                <div>

                  <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                    Letzter Sieger
                  </div>

                  <div className="mt-4 text-5xl font-black tracking-tight">

                    {latestRound.winner}

                  </div>

                  <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-300">

                    {latestRound.id}

                  </div>

                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">

                  <Trophy
                    size={24}
                  />

                </div>

              </div>

              <div className="mt-8 flex items-end justify-between">

                {/* Earnings */}
                <div>

                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Earnings
                  </div>

                  <div className="mt-2 text-5xl font-black text-emerald-400">

                    +{latestRound.winnings}€

                  </div>

                </div>

                {/* Score */}
                <div className="text-right">

                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Score
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black ${getToParColor(
                      latestRound.totalToPar
                    )}`}
                  >

                    {formatToPar(
                      latestRound.totalToPar
                    )}

                  </div>

                </div>

              </div>

            </motion.div>

          )}

          {/* Rankings Preview */}
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
              delay: 0.18,
            }}

            className="mt-10 rounded-[40px] bg-white p-6 shadow-sm"
          >

            {/* Header */}
            <div className="flex items-center justify-between">

              <div>

                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Season Ranking
                </div>

                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Top Players
                </div>

              </div>

              <button
                onClick={() =>
                  navigate("/leaderboard")
                }

                className="flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
              >

                Alle

                <ArrowRight
                  size={14}
                />

              </button>

            </div>

            {/* Empty Ranking */}
            {topPlayers.length === 0 && (

              <div className="mt-6 rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch keine Rankings vorhanden.
              </div>

            )}

            {/* Players */}
            <div className="mt-6 space-y-3">

              {topPlayers.map(
                (
                  player,
                  index
                ) => (

                  <motion.button

                    whileTap={{
                      scale: 0.985,
                    }}

                    key={player.name}

                    onClick={() =>
                      navigate("/leaderboard")
                    }

                    className="flex w-full items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 py-4 text-left shadow-sm"
                  >

                    {/* Left */}
                    <div className="flex min-w-0 items-center gap-4">

                      {/* Rank */}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          index === 0
                            ? "bg-yellow-400 text-black"
                            : index === 1
                            ? "bg-white text-slate-900 border border-slate-200"
                            : "bg-orange-400 text-white"
                        }`}
                      >

                        {index + 1}

                      </div>

                      {/* Name */}
                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <div className="truncate text-xl font-black text-slate-950">

                            {player.name}

                          </div>

                          {index === 0 && (

                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">

                              <Crown
                                size={10}
                              />

                              Leader

                            </div>

                          )}

                        </div>

                        <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">

                          {player.wins} Wins

                        </div>

                      </div>

                    </div>

                    {/* Right */}
                    <div className="shrink-0 text-right">

                      <div className="text-3xl font-black text-emerald-600">

                        {player.totalWinnings}€

                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Earnings
                      </div>

                    </div>

                  </motion.button>

                )
              )}

            </div>

          </motion.div>

        </div>

      </div>

    </div>
  )
}