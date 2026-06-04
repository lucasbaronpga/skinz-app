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

  return "text-slate-950"
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

function getRoundPlayers(round) {
  return Array.isArray(round?.players)
    ? round.players
    : []
}

function getSortedPlayers(round) {
  return [...getRoundPlayers(round)].sort(
    (a, b) =>
      toNumber(b.winnings, 0) -
        toNumber(a.winnings, 0) ||
      toNumber(a.totalToPar, 0) -
        toNumber(b.totalToPar, 0)
  )
}

function getWinner(round) {
  const players = getRoundPlayers(round)

  return (
    players.find(
      (player) =>
        player.name === round?.winner
    ) ||
    getSortedPlayers(round)[0] ||
    null
  )
}

function getCourseName(round) {
  return (
    round?.course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getCoursePar(round) {
  return (
    round?.course?.par ||
    72
  )
}

function getCourseParMeta(round) {
  return `Par ${getCoursePar(round)}`
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
    round.history.some((hole) =>
      itemIsWolffn(hole)
    )

  if (historyHasWolffn) {
    return true
  }

  const playerHoleHasWolffn =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some((hole) =>
        itemIsWolffn(hole)
      )
    )

  return playerHoleHasWolffn
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

  const historyHasSpecialScoring =
    Array.isArray(round?.history) &&
    round.history.some(
      (hole) =>
        !itemIsWolffn(hole) &&
        (
          hole?.gameMode === GAME_MODES.PROFESSIONAL ||
          hole?.gameModeLabel === "Skinz Professional" ||
          hole?.specialScoringEnabled ||
          hole?.specialScoringApplied ||
          toNumber(hole?.bonusSkins, 0) > 0 ||
          hole?.eagleBonusApplied
        )
    )

  if (historyHasSpecialScoring) {
    return true
  }

  const playerHoleHasSpecialScoring =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (hole) =>
          !itemIsWolffn(hole) &&
          (
            hole?.gameMode === GAME_MODES.PROFESSIONAL ||
            hole?.gameModeLabel === "Skinz Professional" ||
            hole?.specialScoringEnabled ||
            hole?.specialScoringApplied ||
            toNumber(hole?.bonusSkins, 0) > 0 ||
            hole?.eagleBonusApplied
          )
      )
    )

  return playerHoleHasSpecialScoring
}

export default function Matches() {
  const navigate = useNavigate()

  const {
    completedRounds,
  } = useGame()

  const sortedRounds =
    [...completedRounds].sort(
      (a, b) =>
        toNumber(b.createdAt, 0) -
        toNumber(a.createdAt, 0)
    )

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
            Matches
          </h1>

          <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-slate-400">
            Deine Matches, Courses, Winners & Scores.
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
            transition={{
              delay: 0.06,
              duration: 0.35,
              ease: "easeOut",
            }}
            className="mt-16 rounded-[42px] bg-white/90 p-10 text-center shadow-sm backdrop-blur-xl"
          >
            <div
              className="text-7xl"
              aria-hidden="true"
            >
              ⛳
            </div>

            <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Noch keine Matches
            </div>

            <div className="mt-3 text-sm font-bold leading-relaxed text-slate-400">
              Spiele eine komplette Runde, um deine erste Scorecard zu speichern.
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

        {/* Match Cards */}
        <div className="mt-10 space-y-6">
          {sortedRounds.map((round, index) => {
            const winner = getWinner(round)
            const sortedPlayers = getSortedPlayers(round)
            const roundPlayers = getRoundPlayers(round)

            const roundId = getRoundId(round)
            const courseName = getCourseName(round)
            const courseParMeta = getCourseParMeta(round)

            const displayWinnerName =
              round?.winner ||
              winner?.name ||
              "Unbekannt"

            const displayEarnings =
              round?.winnings ??
              winner?.winnings ??
              0

            const isWolffnRound =
              roundIsWolffn(round)

            const roundHasProfessionalMode =
              roundHasProfessionalScoring(round)

            return (
              <motion.button
                key={roundId}
                type="button"
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
                  delay: index * 0.04,
                  ease: "easeOut",
                }}
                onClick={() =>
                  navigate(`/matches/${roundId}`)
                }
                aria-label={`Scorecard ${roundId} öffnen`}
                className="w-full overflow-hidden rounded-[42px] bg-white/90 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
              >
                {/* Hero */}
                <div className="bg-slate-950 p-7 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                        Winner
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="truncate text-5xl font-black tracking-tight">
                          {displayWinnerName}
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
                          <Trophy size={22} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                      {roundId}
                    </div>

                    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                      <MapPin size={13} />

                      <span className="max-w-[220px] truncate">
                        {courseName}
                      </span>
                    </div>

                    {isWolffnRound && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950">
                        <span aria-hidden="true">
                          🐺
                        </span>
                        Wolffn
                      </div>
                    )}

                    {!isWolffnRound && roundHasProfessionalMode && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                        <Sparkles size={13} />
                        Skinz Professional
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-5">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Earnings
                      </div>

                      <div
                        className={`mt-2 text-6xl font-black tracking-tight ${getMoneyColorDark(displayEarnings)}`}
                      >
                        {formatMoney(displayEarnings)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                        To Par
                      </div>

                      <div
                        className={`mt-2 text-5xl font-black tracking-tight ${getToParColorDark(winner?.totalToPar)}`}
                      >
                        {formatToPar(winner?.totalToPar)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Datum
                      </div>

                      <div className="mt-2 text-xl font-black tracking-tight text-slate-950">
                        {getRoundDate(round)}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Runde gespielt
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-right shadow-sm">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Flight
                      </div>

                      <div className="mt-2 flex items-center justify-end gap-2 text-xl font-black tracking-tight text-slate-950">
                        <Users size={18} />
                        {roundPlayers.length}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Mitspieler
                      </div>
                    </div>
                  </div>

                  {/* Golfplatz Meta */}
                  <div className="mt-4 rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={16} />

                        <div className="text-xs font-black uppercase tracking-[0.25em]">
                          Golfplatz
                        </div>
                      </div>

                      <div className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
                        {courseName}
                      </div>

                      <div className="mt-1 text-sm font-bold text-slate-400">
                        {courseParMeta}
                      </div>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="mt-6 space-y-3">
                    {sortedPlayers.map((player, playerIndex) => {
                      const isWinner =
                        player.name === displayWinnerName

                      return (
                        <div
                          key={`${roundId}-${player.name}`}
                          className={`flex items-center justify-between rounded-[24px] border px-5 py-4 shadow-sm ${
                            isWinner
                              ? "border-emerald-100 bg-emerald-50"
                              : "border-slate-100 bg-white"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${getRankStyle(playerIndex)}`}
                              >
                                {playerIndex + 1}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-xl font-black tracking-tight text-slate-950">
                                    {player.name}
                                  </div>

                                  {isWinner && (
                                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                      <Crown size={10} />
                                      Winner
                                    </div>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-2">
                                  <div
                                    className={`text-xs font-black uppercase tracking-widest ${getSkinColor(player.skins)}`}
                                  >
                                    {formatSkinSaldo(player.skins)} Skinz
                                  </div>

                                  <div
                                    className={`text-xs font-black uppercase tracking-widest ${getMoneyColor(player.winnings)}`}
                                  >
                                    {formatMoney(player.winnings)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div
                              className={`text-3xl font-black tracking-tight ${getToParColor(player.totalToPar)}`}
                            >
                              {formatToPar(player.totalToPar)}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              To Par
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <div className="text-sm font-black uppercase tracking-widest text-slate-400">
                      Scorecard
                    </div>

                    <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                      View
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}