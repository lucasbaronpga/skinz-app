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

function getToParColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount < 0) {
    return "text-emerald-400"
  }

  if (amount > 0) {
    return "text-red-400"
  }

  return "text-white"
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
    return "text-yellow-400"
  }

  if (amount < 0) {
    return "text-red-400"
  }

  return "text-white"
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

  return "border border-slate-200 bg-white text-slate-900"
}

function getCurrentCourseName(course) {
  return (
    course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getRoundCourseName(round) {
  return (
    round?.course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players)
    ? round.players
    : []
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
    round.history.some((playedHole) =>
      itemIsWolffn(playedHole)
    )

  if (historyHasWolffn) {
    return true
  }

  const playerHoleHasWolffn =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some((playedHole) =>
        itemIsWolffn(playedHole)
      )
    )

  return playerHoleHasWolffn
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
        (
          playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
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
          !itemIsWolffn(playedHole) &&
          (
            playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.gameModeLabel === "Skinz Professional" ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied
          )
      )
    )

  return playerHoleHasSpecialScoring
}

export default function Home() {
  const navigate = useNavigate()

  const {
    hole,
    currentPot,
    currentCourse,
    currentBaseSkins,
    currentSkinsAtStake,
    players,
    playerStats,
    matchFinished,
    completedRounds,
    activeMatchId,
    hasActiveMatch,
    isWolffnMode,
    specialScoringEnabled,
  } = useGame()

  const liveLeader =
    [...players].sort(
      (a, b) =>
        toNumber(b.winnings, 0) -
        toNumber(a.winnings, 0)
    )[0] || null

  const latestRound =
    [...completedRounds].sort(
      (a, b) =>
        toNumber(b.createdAt, 0) -
        toNumber(a.createdAt, 0)
    )[0] || null

  const latestRoundIsWolffn =
    roundIsWolffn(latestRound)

  const latestRoundHasSpecialScoring =
    roundHasSpecialScoring(latestRound)

  const topPlayers =
    [...playerStats]
      .sort(
        (a, b) =>
          toNumber(b.totalWinnings, 0) -
          toNumber(a.totalWinnings, 0)
      )
      .slice(0, 3)

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-[calc(9rem+env(safe-area-inset-bottom))] text-slate-900">
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
            transition={{
              duration: 0.35,
              ease: "easeOut",
            }}
            className="pt-8"
          >
            <h1 className="text-7xl font-black tracking-tight text-slate-950">
              Skinz
            </h1>
          </motion.div>

          {/* Active Match OR Start Match */}
          {hasActiveMatch ? (
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
                delay: 0.05,
                duration: 0.35,
                ease: "easeOut",
              }}
              onClick={() => navigate("/live")}
              className="mt-10 w-full overflow-hidden rounded-[42px] border border-white/70 bg-white/90 p-8 text-left shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Auf der Runde
                  </div>

                  <div className="mt-3 text-5xl font-black tracking-tight text-slate-950">
                    Loch {hole}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="inline-flex rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
                      {activeMatchId || "-"}
                    </div>

                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
                      <MapPin size={13} />

                      <span className="max-w-[170px] truncate">
                        {getCurrentCourseName(currentCourse)}
                      </span>
                    </div>

                    {isWolffnMode && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                        <span aria-hidden="true">
                          🐺
                        </span>
                        Wolffn
                      </div>
                    )}

                    {!isWolffnMode && specialScoringEnabled && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                        <Sparkles size={13} />
                        Skinz Professional
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black ${
                    matchFinished
                      ? "bg-amber-100 text-amber-700"
                      : isWolffnMode
                      ? "bg-slate-950 text-white"
                      : specialScoringEnabled
                      ? "bg-orange-100 text-orange-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {matchFinished
                    ? "Beendet"
                    : isWolffnMode
                    ? "Wolffn"
                    : specialScoringEnabled
                    ? "Pro"
                    : "Live"}
                </div>
              </div>

              <div className="mt-8">
                <div className="text-sm font-bold text-slate-400">
                  Skins-Pot
                </div>

                <div
                  className={`mt-2 text-7xl font-black tracking-tight ${
                    isWolffnMode
                      ? "text-yellow-500"
                      : specialScoringEnabled
                      ? "text-orange-500"
                      : "text-yellow-500"
                  }`}
                >
                  {formatMoney(currentPot)}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Base
                  </div>

                  <div className="mt-1 text-3xl font-black text-slate-950">
                    {toNumber(currentBaseSkins, 1)}
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-400">
                    Skins
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-right shadow-sm">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                    At Stake
                  </div>

                  <div className="mt-1 text-3xl font-black text-slate-950">
                    {toNumber(currentSkinsAtStake, 1)}
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-400">
                    inkl. Carryover
                  </div>
                </div>
              </div>

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
                  <div
                    className={`text-4xl font-black ${getMoneyColor(liveLeader?.winnings)}`}
                  >
                    {formatMoney(liveLeader?.winnings)}
                  </div>

                  <div className="text-xs font-bold text-slate-400">
                    Earnings
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                <div className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Runde öffnen
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg">
                  <ArrowRight size={20} />
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
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-10 overflow-hidden rounded-[42px] bg-slate-950 p-8 text-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="text-5xl font-black tracking-tight">
                    Neue Runde
                  </div>

                  <div className="mt-4 max-w-xs text-base font-bold leading-relaxed text-slate-400">
                    Wähle Golfplatz, Flight und €/Skin — dann geht es auf die Runde.
                  </div>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
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
                <div>
                  <div className="text-xl font-black">
                    Runde starten
                  </div>

                  <div className="mt-1 text-sm font-bold text-slate-400">
                    Golfplatz & Flight wählen
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <ArrowRight size={20} />
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
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-8"
            >
              <Link
                to="/round"
                className="flex items-center justify-between rounded-[38px] border border-white/70 bg-white/90 px-6 py-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.01]"
              >
                <div>
                  <div className="text-3xl font-black text-slate-900">
                    Neue Runde
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Neuen Flight starten
                  </div>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg">
                  +
                </div>
              </Link>
            </motion.div>
          )}

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
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-10 overflow-hidden rounded-[40px] bg-slate-950 p-6 text-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                    Last Round Winner
                  </div>

                  <div className="mt-4 truncate text-5xl font-black tracking-tight">
                    {latestRound.winner || "Unbekannt"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-300">
                      {latestRound.id || "SKZ-0000"}
                    </div>

                    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-300">
                      <MapPin size={13} />

                      <span className="max-w-[180px] truncate">
                        {getRoundCourseName(latestRound)}
                      </span>
                    </div>

                    {latestRoundIsWolffn && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-950">
                        <span aria-hidden="true">
                          🐺
                        </span>
                        Wolffn
                      </div>
                    )}

                    {!latestRoundIsWolffn && latestRoundHasSpecialScoring && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                        <Sparkles size={13} />
                        Skinz Professional
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
                  <Trophy size={24} />
                </div>
              </div>

              <div className="mt-8 flex items-end justify-between gap-5">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Earnings
                  </div>

                  <div
                    className={`mt-2 text-5xl font-black ${getMoneyColorDark(latestRound.winnings)}`}
                  >
                    {formatMoney(latestRound.winnings)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                    To Par
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black ${getToParColorDark(latestRound.totalToPar)}`}
                  >
                    {formatToPar(latestRound.totalToPar)}
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
              duration: 0.35,
              ease: "easeOut",
            }}
            className="mt-10 rounded-[40px] bg-white/90 p-6 shadow-sm backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Season Leaderboard
                </div>

                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Hot Players
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/leaderboard")}
                className="flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
              >
                Alle
                <ArrowRight size={14} />
              </button>
            </div>

            {topPlayers.length === 0 && (
              <div className="mt-6 rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch kein Leaderboard vorhanden.
              </div>
            )}

            <div className="mt-6 space-y-3">
              {topPlayers.map((player, index) => (
                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.985,
                  }}
                  key={player.name}
                  onClick={() => navigate("/leaderboard")}
                  className="flex w-full items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 py-4 text-left shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${getRankStyle(index)}`}
                    >
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-xl font-black text-slate-950">
                          {player.name}
                        </div>

                        {index === 0 && (
                          <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                            <Crown size={10} />
                            Leader
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        {player.wins || 0} Wins
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`text-3xl font-black ${getMoneyColor(player.totalWinnings)}`}
                    >
                      {formatMoney(player.totalWinnings)}
                    </div>

                    <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                      Earnings
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}