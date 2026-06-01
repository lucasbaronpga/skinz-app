import {
  motion,
} from "framer-motion"

import {
  Trophy,
  DollarSign,
  Target,
  Flag,
  LogOut,
  Crown,
  ArrowRight,
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

export default function Profile() {

  const navigate =
    useNavigate()

  const {
    user,
    logout,
  } = useAuth()

  const {
    playerStats,
    completedRounds,
  } = useGame()

  const player =
    playerStats.find(
      (player) =>
        player.name ===
        user?.name
    )

  const recentMatches =
    [...completedRounds]
      .filter((round) =>
        round.players.some(
          (player) =>
            player.name ===
            user?.name
        )
      )
      .sort(
        (a, b) =>
          (b.createdAt || 0) -
          (a.createdAt || 0)
      )
      .slice(0, 3)

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
        <motion.div

          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}
        >

          <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
            Account
          </div>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
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
          }}

          className="mt-8 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
        >

          <div className="p-8">

            {/* Avatar */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-4xl font-black shadow-[0_15px_40px_rgba(16,185,129,0.35)]">

              {user?.name?.charAt(0)}

            </div>

            {/* Name */}
            <div className="mt-6 flex items-center gap-3">

              <div className="truncate text-5xl font-black tracking-tight">

                {user?.name}

              </div>

              <div className="shrink-0 rounded-full bg-yellow-400 px-3 py-1 text-xs font-black uppercase tracking-widest text-black">
                Member
              </div>

            </div>

            {/* Subtitle */}
            <div className="mt-3 text-lg text-slate-400">
              Premium Golf Player
            </div>

            {/* Hero Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">

              {/* Wins */}
              <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-xl">

                <div className="text-sm font-bold text-slate-400">
                  Wins
                </div>

                <div className="mt-2 text-3xl font-black text-white">

                  {player?.wins || 0}

                </div>

              </div>

              {/* Rounds */}
              <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-xl">

                <div className="text-sm font-bold text-slate-400">
                  Rounds
                </div>

                <div className="mt-2 text-3xl font-black text-white">

                  {player?.roundsPlayed || 0}

                </div>

              </div>

              {/* Earnings */}
              <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-xl">

                <div className="text-sm font-bold text-slate-400">
                  Earnings
                </div>

                <div className="mt-2 text-3xl font-black text-emerald-400">

                  {player?.totalWinnings || 0}€

                </div>

              </div>

            </div>

          </div>

        </motion.div>

        {/* Ranking Link */}
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
            delay: 0.08,
          }}

          onClick={() =>
            navigate("/leaderboard")
          }

          className="mt-6 flex w-full items-center justify-between rounded-[34px] border border-slate-100 bg-white px-6 py-5 text-left shadow-sm"
        >

          <div>

            <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Season
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Full Rankings
            </div>

          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">

            <ArrowRight
              size={20}
            />

          </div>

        </motion.button>

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
            delay: 0.1,
          }}

          className="mt-8 rounded-[38px] bg-white p-5 shadow-sm"
        >

          <div className="text-2xl font-black tracking-tight text-slate-950">
            Performance
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">

            {/* Birdies */}
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-2 text-slate-400">

                <Target
                  size={18}
                />

                <div className="text-sm font-bold">
                  Birdies
                </div>

              </div>

              <div className="mt-4 text-5xl font-black text-red-500">

                {player?.birdies || 0}

              </div>

            </div>

            {/* Eagles */}
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-2 text-slate-400">

                <Trophy
                  size={18}
                />

                <div className="text-sm font-bold">
                  Eagles
                </div>

              </div>

              <div className="mt-4 text-5xl font-black text-orange-500">

                {player?.eagles || 0}

              </div>

            </div>

            {/* Avg To Par */}
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-2 text-slate-400">

                <Flag
                  size={18}
                />

                <div className="text-sm font-bold">
                  Avg To Par
                </div>

              </div>

              <div
                className={`mt-4 text-5xl font-black ${getToParColor(
                  player?.avgToPar
                )}`}
              >

                {formatToPar(
                  player?.avgToPar
                )}

              </div>

            </div>

            {/* Total Earnings */}
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-2 text-slate-400">

                <DollarSign
                  size={18}
                />

                <div className="text-sm font-bold">
                  Total €
                </div>

              </div>

              <div className="mt-4 text-5xl font-black text-emerald-600">

                {player?.totalWinnings || 0}

              </div>

            </div>

          </div>

        </motion.div>

        {/* Recent Matches */}
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
            delay: 0.15,
          }}

          className="mt-8 rounded-[38px] bg-white p-5 shadow-sm"
        >

          <div className="flex items-center justify-between">

            <div>

              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                History
              </div>

              <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Letzte Matches
              </div>

            </div>

            <div className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
              Recent
            </div>

          </div>

          <div className="mt-5 space-y-3">

            {recentMatches.length === 0 && (

              <div className="rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch keine Matches gespielt.
              </div>

            )}

            {recentMatches.map(
              (round) => {

                const roundPlayer =
                  round.players.find(
                    (player) =>
                      player.name ===
                      user?.name
                  )

                return (

                  <div
                    key={round.id}

                    className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 py-4 shadow-sm"
                  >

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

                      <div className="mt-2 flex items-center gap-2">

                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">

                          {roundPlayer?.skins || 0} Skins

                        </div>

                        {round.winner === user?.name && (

                          <div className="flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">

                            <Crown
                              size={10}
                            />

                            Win

                          </div>

                        )}

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

                )
              }
            )}

          </div>

        </motion.div>

        {/* Logout */}
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
            delay: 0.2,
          }}

          onClick={logout}

          className="mt-8 flex w-full items-center justify-between rounded-[34px] border border-red-100 bg-white px-6 py-6 text-red-500 shadow-sm"
        >

          <div>

            <div className="text-2xl font-black">
              Logout
            </div>

            <div className="mt-1 text-sm font-bold text-red-300">
              Session beenden
            </div>

          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">

            <LogOut
              size={24}
            />

          </div>

        </motion.button>

      </div>

    </div>
  )
}