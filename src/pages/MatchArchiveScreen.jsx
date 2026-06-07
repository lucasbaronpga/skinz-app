import { motion } from "framer-motion"

import { useNavigate } from "react-router-dom"

import {
  ChevronRight,
  Crown,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"

import AppBackground from "../components/AppBackground"

import { GAME_MODES, useGame } from "../context/GameContext"

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function formatEuroAmount(value) {
  const amount = roundMoney(Math.abs(value))

  const hasCents = Math.abs(amount % 1) > 0

  if (hasCents) {
    return amount.toFixed(2).replace(".", ",")
  }

  return amount.toFixed(0)
}

function formatMoney(value) {
  const amount = roundMoney(value)

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
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getMoneyColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-300"
  }

  if (amount < 0) {
    return "text-red-400"
  }

  return "text-white"
}

function formatSkinSaldo(value) {
  return Math.abs(toNumber(value, 0))
}

function getSkinColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

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
    return "bg-amber-400 text-black"
  }

  if (index === 1) {
    return "bg-slate-300 text-slate-950"
  }

  if (index === 2) {
    return "bg-[#cd7f32] text-white"
  }

  return "border border-white/70 bg-white/70 text-slate-900"
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
}

function getSortedPlayers(round) {
  return [...getRoundPlayers(round)].sort(
    (a, b) =>
      toNumber(b.winnings, 0) - toNumber(a.winnings, 0) ||
      toNumber(a.totalToPar, 0) - toNumber(b.totalToPar, 0)
  )
}

function getWinner(round) {
  const players = getRoundPlayers(round)

  return (
    players.find((player) => player?.name === round?.winner) ||
    getSortedPlayers(round)[0] ||
    null
  )
}

function getCourseName(round) {
  return round?.course?.name || "Erster Golfclub Westpfalz"
}

function getCoursePar(round) {
  return toNumber(round?.course?.par, 72)
}

function getCourseParMeta(round) {
  return `Par ${getCoursePar(round)}`
}

function getRoundDate(round) {
  return round?.date || "Unbekannt"
}

function getRoundId(round) {
  return round?.id || "SKZ-0000"
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
    round.history.some((playedHole) => itemIsWolffn(playedHole))

  if (historyHasWolffn) {
    return true
  }

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some((playedHole) => itemIsWolffn(playedHole))
  )
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
      (playedHole) =>
        !itemIsWolffn(playedHole) &&
        (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied)
    )

  if (historyHasSpecialScoring) {
    return true
  }

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          !itemIsWolffn(playedHole) &&
          (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.gameModeLabel === "Skinz Professional" ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied)
      )
  )
}

export default function MatchArchiveScreen() {
  const navigate = useNavigate()

  const { completedRounds } = useGame()

  const safeCompletedRounds = Array.isArray(completedRounds)
    ? completedRounds
    : []

  const sortedRounds = [...safeCompletedRounds].sort(
    (a, b) => toNumber(b.createdAt, 0) - toNumber(a.createdAt, 0)
  )

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-5">
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
          <div className="text-[12px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
            Match Archive
          </div>

          <h1 className="mt-3 text-[4rem] font-black leading-none tracking-[-0.075em] text-slate-950">
            Matches
          </h1>

          <p className="mt-4 max-w-sm text-base font-semibold leading-relaxed tracking-[-0.02em] text-slate-600">
            Deine Matches, Courses, Winners & Scores.
          </p>
        </motion.div>

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
            className="mt-16 rounded-[42px] border border-white/70 bg-white/[0.48] p-10 text-center shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="text-7xl" aria-hidden="true">
              ⛳
            </div>

            <div className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Noch keine Matches
            </div>

            <div className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
              Spiele eine komplette Runde, um deine erste Scorecard zu
              speichern.
            </div>

            <button
              type="button"
              onClick={() => navigate("/round")}
              className="mt-8 w-full rounded-[28px] bg-[#071819] py-5 text-lg font-black text-white shadow-[0_18px_48px_rgba(7,24,25,0.28)] transition active:scale-[0.985]"
            >
              Runde starten
            </button>
          </motion.div>
        )}

        <div className="mt-10 space-y-6">
          {sortedRounds.map((round, index) => {
            const winner = getWinner(round)
            const sortedPlayers = getSortedPlayers(round)
            const roundPlayers = getRoundPlayers(round)
            const roundId = getRoundId(round)
            const courseName = getCourseName(round)
            const courseParMeta = getCourseParMeta(round)

            const displayWinnerName = round?.winner || winner?.name || "Unbekannt"

            const displayEarnings = round?.winnings ?? winner?.winnings ?? 0

            const isWolffnRound = roundIsWolffn(round)

            const roundHasProfessionalMode =
              roundHasProfessionalScoring(round)

            return (
              <motion.button
                key={`${roundId}-${toNumber(round?.createdAt, index)}`}
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
                onClick={() => navigate(`/matches/${roundId}`)}
                aria-label={`Scorecard ${roundId} öffnen`}
                className="w-full overflow-hidden rounded-[42px] border border-white/70 bg-white/[0.48] text-left shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all duration-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
              >
                <div className="relative overflow-hidden bg-[#071819] p-7 text-white">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-400/28 via-emerald-500/8 to-transparent"
                  />

                  <div
                    aria-hidden="true"
                    className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                          Winner
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <div className="truncate text-5xl font-black tracking-[-0.055em]">
                            {displayWinnerName}
                          </div>

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg">
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
                          <span aria-hidden="true">🐺</span>
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
                          className={`mt-2 text-6xl font-black tracking-[-0.06em] ${getMoneyColorDark(
                            displayEarnings
                          )}`}
                        >
                          {formatMoney(displayEarnings)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                          To Par
                        </div>

                        <div
                          className={`mt-2 text-5xl font-black tracking-[-0.055em] ${getToParColorDark(
                            winner?.totalToPar
                          )}`}
                        >
                          {formatToPar(winner?.totalToPar)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] border border-white/70 bg-white/[0.50] p-4 shadow-sm backdrop-blur-xl">
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

                    <div className="rounded-[24px] border border-white/70 bg-white/[0.50] p-4 text-right shadow-sm backdrop-blur-xl">
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

                  <div className="mt-4 rounded-[26px] border border-white/70 bg-white/[0.50] p-5 shadow-sm backdrop-blur-xl">
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

                  <div className="mt-6 space-y-3">
                    {sortedPlayers.map((player, playerIndex) => {
                      const isWinner = player?.name === displayWinnerName

                      return (
                        <div
                          key={`${roundId}-${player?.name || playerIndex}`}
                          className={`flex items-center justify-between rounded-[24px] border px-5 py-4 shadow-sm ${
                            isWinner
                              ? "border-emerald-200/80 bg-emerald-50/85"
                              : "border-white/70 bg-white/[0.50]"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${getRankStyle(
                                  playerIndex
                                )}`}
                              >
                                {playerIndex + 1}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-xl font-black tracking-tight text-slate-950">
                                    {player?.name || "Spieler"}
                                  </div>

                                  {isWinner && (
                                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                      <Crown size={10} />
                                      Winner
                                    </div>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-2">
                                  <div
                                    className={`text-xs font-black uppercase tracking-widest ${getSkinColor(
                                      player?.skins
                                    )}`}
                                  >
                                    {formatSkinSaldo(player?.skins)} Skinz
                                  </div>

                                  <div
                                    className={`text-xs font-black uppercase tracking-widest ${getMoneyColor(
                                      player?.winnings
                                    )}`}
                                  >
                                    {formatMoney(player?.winnings)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div
                              className={`text-3xl font-black tracking-tight ${getToParColor(
                                player?.totalToPar
                              )}`}
                            >
                              {formatToPar(player?.totalToPar)}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              To Par
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/70 pt-5">
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