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
  Sparkles,
} from "lucide-react"

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
    return "text-emerald-600"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getMoneyColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-emerald-400"
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

function getScoreStyle(label) {
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

function getCourseLocation(round) {
  return (
    round?.course?.location ||
    "Westpfalz"
  )
}

function getCoursePar(round) {
  return (
    round?.course?.par ||
    72
  )
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

function getPlayerHoles(player) {
  return Array.isArray(player?.holes)
    ? player.holes
    : []
}

function countResult(player, result) {
  return getPlayerHoles(player).filter(
    (hole) =>
      hole.result?.label === result
  ).length
}

function getHoleToPar(hole) {
  return (
    toNumber(hole?.score, 0) -
    toNumber(hole?.par, 0)
  )
}

function getNineTotal(holes) {
  return holes.reduce(
    (total, hole) =>
      total + toNumber(hole.score, 0),
    0
  )
}

function getNinePar(holes) {
  return holes.reduce(
    (total, hole) =>
      total + toNumber(hole.par, 0),
    0
  )
}

function getNineToPar(holes) {
  return (
    getNineTotal(holes) -
    getNinePar(holes)
  )
}

function getPlayerTotalScore(player) {
  return getPlayerHoles(player).reduce(
    (total, hole) =>
      total + toNumber(hole.score, 0),
    0
  )
}

function getPlayerTotalPar(player, fallbackPar) {
  const holes = getPlayerHoles(player)

  if (holes.length === 0) {
    return fallbackPar
  }

  return holes.reduce(
    (total, hole) =>
      total + toNumber(hole.par, 0),
    0
  )
}

function getHoleBonusSkins(hole) {
  if (hole?.bonusSkins !== undefined) {
    return toNumber(hole.bonusSkins, 0)
  }

  if (hole?.eagleBonusApplied) {
    return 1
  }

  return 0
}

function getHoleBonusLabel(hole) {
  const bonusSkins =
    getHoleBonusSkins(hole)

  if (bonusSkins <= 0) {
    return null
  }

  const resultLabel =
    hole?.result?.label ||
    hole?.bonusResult ||
    ""

  if (
    resultLabel === "Eagle" ||
    resultLabel === "Albatross" ||
    bonusSkins >= 2
  ) {
    return `Eagle +${bonusSkins}`
  }

  return `Birdie +${bonusSkins}`
}

function getHistoryBonusSkins(item) {
  if (item?.bonusSkins !== undefined) {
    return toNumber(item.bonusSkins, 0)
  }

  if (item?.eagleBonusApplied) {
    return 1
  }

  return 0
}

function getHistoryBonusLabel(item) {
  const bonusSkins =
    getHistoryBonusSkins(item)

  if (bonusSkins <= 0) {
    return null
  }

  const resultLabel =
    item?.winningResult ||
    item?.bonusResult ||
    ""

  if (
    resultLabel === "Eagle" ||
    resultLabel === "Albatross" ||
    bonusSkins >= 2
  ) {
    return `Eagle +${bonusSkins}`
  }

  return `Birdie +${bonusSkins}`
}

function formatSkinsText(value) {
  const amount =
    toNumber(value, 0)

  return amount === 1
    ? "1 Skin"
    : `${amount} Skins`
}

function SummaryCard({
  label,
  score,
  par,
  toPar,
}) {
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
        className={`mt-2 text-lg font-black ${getToParColor(toPar)}`}
      >
        {formatToPar(toPar)}
      </div>
    </div>
  )
}

function BonusBadge({
  label,
}) {
  if (!label) {
    return null
  }

  return (
    <div className="mt-3 flex items-center justify-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
      <Sparkles size={10} />
      {label}
    </div>
  )
}

function HoleGrid({
  holes,
}) {
  if (!holes.length) {
    return (
      <div className="rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
        Keine Lochdaten vorhanden.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {holes.map((hole) => {
        const toPar =
          getHoleToPar(hole)

        const score =
          toNumber(hole?.score, 0)

        const par =
          toNumber(hole?.par, 0)

        const holeNumber =
          hole?.hole || "-"

        const resultLabel =
          hole?.result?.label || "Par"

        const bonusLabel =
          getHoleBonusLabel(hole)

        return (
          <div
            key={`${holeNumber}-${score}-${par}`}
            className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Loch
              </div>

              <div className="text-xl font-black text-slate-950">
                {holeNumber}
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-black shadow-sm ${getScoreStyle(resultLabel)}`}
              >
                {score}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Par {par}
              </div>

              <div
                className={`text-xs font-black uppercase tracking-widest ${getToParColor(toPar)}`}
              >
                {formatToPar(toPar)}
              </div>
            </div>

            <div className="mt-2 truncate text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              {resultLabel}
            </div>

            <BonusBadge label={bonusLabel} />

            {hole?.skinDelta !== undefined && (
              <div
                className={`mt-3 text-center text-[10px] font-black uppercase tracking-widest ${getSkinColor(hole.skinDelta)}`}
              >
                {formatSkinSaldo(hole.skinDelta)} Skin
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MatchDetails() {
  const {
    id,
  } = useParams()

  const navigate = useNavigate()

  const {
    completedRounds,
  } = useGame()

  const [
    expandedPlayer,
    setExpandedPlayer,
  ] = useState(null)

  const round =
    completedRounds.find(
      (completedRound) =>
        String(completedRound.id) ===
        String(id)
    )

  if (!round) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-5">
        <div className="w-full max-w-sm rounded-[40px] bg-white/90 p-10 text-center shadow-sm backdrop-blur-xl">
          <div
            className="text-5xl"
            aria-hidden="true"
          >
            🔎
          </div>

          <div className="mt-5 text-3xl font-black tracking-tight text-slate-950">
            Scorecard nicht gefunden
          </div>

          <div className="mt-3 text-sm font-bold leading-relaxed text-slate-400">
            Diese Runde existiert nicht mehr oder wurde lokal gelöscht.
          </div>

          <button
            type="button"
            onClick={() => navigate("/matches")}
            className="mt-6 w-full rounded-[28px] bg-slate-950 px-6 py-5 font-black text-white shadow-lg"
          >
            Zurück zum Archiv
          </button>
        </div>
      </div>
    )
  }

  const roundPlayers =
    getRoundPlayers(round)

  const sortedPlayers =
    getSortedPlayers(round)

  const winner =
    getWinner(round)

  const winnerName =
    round.winner ||
    winner?.name ||
    "Unbekannt"

  const courseName =
    getCourseName(round)

  const courseLocation =
    getCourseLocation(round)

  const coursePar =
    getCoursePar(round)

  const roundId =
    getRoundId(round)

  const roundDate =
    getRoundDate(round)

  const roundHistory =
    Array.isArray(round.history)
      ? round.history
      : []

  const displayWinnings =
    round.winnings ??
    winner?.winnings ??
    0

  const bonusModeWasEnabled =
    Boolean(
      round.bonusSkinsEnabled ||
      round.eagleBonusEnabled ||
      roundHistory.some((item) =>
        getHistoryBonusSkins(item) > 0
      )
    )

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
            onClick={() => navigate("/matches")}
            aria-label="Zurück zum Rundenarchiv"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={22} />
          </motion.button>

          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
              Scorecard
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {roundDate}
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
          transition={{
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 overflow-hidden rounded-[42px] bg-slate-950 text-white shadow-2xl"
        >
          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                  Round Winner
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="truncate text-6xl font-black tracking-tight">
                    {winnerName}
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
                    <Trophy size={26} />
                  </div>
                </div>
              </div>
            </div>

            {/* Match / Golfplatz Chips */}
            <div className="mt-6 flex flex-wrap gap-2">
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                Match {roundId}
              </div>

              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                <MapPin size={13} />

                <span className="max-w-[230px] truncate">
                  {courseName}
                </span>
              </div>

              {bonusModeWasEnabled && (
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-200">
                  <Sparkles size={13} />
                  Bonus-Skins
                </div>
              )}
            </div>

            <div className="mt-10 flex items-end justify-between gap-5">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Winnings
                </div>

                <div
                  className={`mt-2 text-6xl font-black ${getMoneyColorDark(displayWinnings)}`}
                >
                  {formatMoney(displayWinnings)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                  To Par
                </div>

                <div
                  className={`mt-2 text-5xl font-black ${getToParColorDark(winner?.totalToPar)}`}
                >
                  {formatToPar(winner?.totalToPar)}
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
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-8 rounded-[36px] bg-white/90 p-6 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin size={18} />

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
              {roundPlayers.length}
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Flight
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">
            <div className="text-4xl font-black text-slate-950">
              18
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Holes
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">
            <div
              className={`text-4xl font-black ${getSkinColor(winner?.skins)}`}
            >
              {formatSkinSaldo(winner?.skins)}
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Skin-Saldo
            </div>
          </div>
        </div>

        {/* Hole Results */}
        {roundHistory.length > 0 && (
          <div className="mt-8 rounded-[40px] bg-white/90 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Skins Verlauf
                </div>

                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Löcher
                </div>
              </div>

              <div
                className="text-4xl"
                aria-hidden="true"
              >
                💰
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {roundHistory.map((item) => {
                const bonusLabel =
                  getHistoryBonusLabel(item)

                const baseSkins =
                  toNumber(item.baseSkins, item.hasTie ? 1 : 1)

                const bonusSkins =
                  getHistoryBonusSkins(item)

                const carryoverSkins =
                  toNumber(item.carryoverSkins, 0)

                return (
                  <div
                    key={`${roundId}-history-${item.hole}-${item.winner}`}
                    className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 py-4 shadow-sm"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-950">
                          Loch {item.hole}
                        </div>

                        {bonusLabel && (
                          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <Sparkles size={10} />
                            {bonusLabel}
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Par {item.par}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Base {formatSkinsText(baseSkins)}
                        </div>

                        {carryoverSkins > 0 && (
                          <div className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                            Carry {formatSkinsText(carryoverSkins)}
                          </div>
                        )}

                        {bonusSkins > 0 && (
                          <div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            Bonus {formatSkinsText(bonusSkins)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-slate-950">
                        {item.hasTie
                          ? "Carryover"
                          : item.winner}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        {formatSkinsText(item.skins || 0)} · {item.pot || 0}€
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Final Leaderboard */}
        <div className="mt-8 rounded-[40px] bg-white/90 p-5 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Final Scores
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Leaderboard
              </div>
            </div>

            <div
              className="text-4xl"
              aria-hidden="true"
            >
              🏆
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {sortedPlayers.map((player, index) => {
              const isExpanded =
                expandedPlayer === player.name

              const playerHoles =
                getPlayerHoles(player)

              const frontNine =
                playerHoles.slice(0, 9)

              const backNine =
                playerHoles.slice(9, 18)

              const totalScore =
                getPlayerTotalScore(player)

              const totalPar =
                getPlayerTotalPar(
                  player,
                  coursePar
                )

              const totalToPar =
                totalScore - totalPar

              const isWinner =
                player.name === winnerName

              return (
                <div key={`${roundId}-${player.name}`}>
                  {/* Player Row */}
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
                    className={`w-full rounded-[32px] border px-5 py-5 text-left transition-all duration-300 ${
                      isWinner
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
                              : "border border-slate-200 bg-white text-slate-900"
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-3xl font-black tracking-tight text-slate-950">
                              {player.name}
                            </div>

                            {isWinner && (
                              <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                <Crown size={10} />
                                Winner
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <div
                              className={`text-sm font-black uppercase tracking-widest ${getSkinColor(player.skins)}`}
                            >
                              {formatSkinSaldo(player.skins)} Skin-Saldo
                            </div>

                            <div
                              className={`text-sm font-black uppercase tracking-widest ${getMoneyColor(player.winnings)}`}
                            >
                              {formatMoney(player.winnings)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <div
                            className={`text-5xl font-black ${getToParColor(player.totalToPar)}`}
                          >
                            {formatToPar(player.totalToPar)}
                          </div>

                          <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                            To Par
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
                          ease: "easeOut",
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
                              {countResult(player, "Birdie")}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              Birdies
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">
                            <div
                              className="text-2xl"
                              aria-hidden="true"
                            >
                              🦅
                            </div>

                            <div className="mt-3 text-3xl font-black text-slate-950">
                              {countResult(player, "Eagle")}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              Eagles
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-sm">
                            <div
                              className="text-2xl"
                              aria-hidden="true"
                            >
                              💰
                            </div>

                            <div
                              className={`mt-3 text-3xl font-black ${getMoneyColor(player.winnings)}`}
                            >
                              {formatMoney(player.winnings)}
                            </div>

                            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              Winnings
                            </div>
                          </div>
                        </div>

                        {/* Score Summary */}
                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <SummaryCard
                            label="Front 9"
                            score={getNineTotal(frontNine)}
                            par={getNinePar(frontNine)}
                            toPar={getNineToPar(frontNine)}
                          />

                          <SummaryCard
                            label="Back 9"
                            score={getNineTotal(backNine)}
                            par={getNinePar(backNine)}
                            toPar={getNineToPar(backNine)}
                          />

                          <SummaryCard
                            label="Total"
                            score={totalScore}
                            par={totalPar}
                            toPar={totalToPar}
                          />
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
                              className={`text-sm font-black uppercase tracking-widest ${getToParColor(getNineToPar(frontNine))}`}
                            >
                              {formatToPar(getNineToPar(frontNine))}
                            </div>
                          </div>

                          <HoleGrid holes={frontNine} />
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
                              className={`text-sm font-black uppercase tracking-widest ${getToParColor(getNineToPar(backNine))}`}
                            >
                              {formatToPar(getNineToPar(backNine))}
                            </div>
                          </div>

                          <HoleGrid holes={backNine} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}