import { useState } from "react"

import { AnimatePresence, motion } from "framer-motion"

import { useNavigate, useParams } from "react-router-dom"

import {
  ArrowLeft,
  ChevronDown,
  Flame,
  MapPin,
  Sparkles,
  Trophy,
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

function formatPlainMoney(value) {
  const amount = roundMoney(value)

  return `${formatEuroAmount(amount)}€`
}

function getMoneyColorDark(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-yellow-300"
  }

  if (amount < 0) {
    return "text-red-300"
  }

  return "text-white"
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
    return "text-emerald-300"
  }

  if (amount > 0) {
    return "text-red-300"
  }

  return "text-white"
}

function getScoreStyle(label) {
  if (label === "Albatross") {
    return "bg-yellow-300 border-yellow-300 text-black"
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

function getRankStyle(index) {
  if (index === 0) {
    return "bg-yellow-300 text-black shadow-lg shadow-yellow-500/20"
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
  return Array.isArray(round?.players) ? round.players : []
}

function getPlayerHoles(player) {
  return Array.isArray(player?.holes) ? player.holes : []
}

function getPlayerTotalScore(player) {
  const holes = getPlayerHoles(player)

  if (holes.length > 0) {
    return holes.reduce((total, hole) => total + toNumber(hole.score, 0), 0)
  }

  return toNumber(player?.total, 0)
}

function getPlayerTotalPar(player, fallbackPar) {
  const holes = getPlayerHoles(player)

  if (holes.length === 0) {
    return fallbackPar
  }

  return holes.reduce((total, hole) => total + toNumber(hole.par, 0), 0)
}

function getCoursePar(round) {
  return round?.course?.par || 72
}

function getPlayerTotalToPar(player, fallbackPar) {
  if (Number.isFinite(Number(player?.totalToPar))) {
    return toNumber(player.totalToPar, 0)
  }

  const score = getPlayerTotalScore(player)
  const par = getPlayerTotalPar(player, fallbackPar)

  return score - par
}

function getSortedPlayers(round) {
  const coursePar = getCoursePar(round)

  return [...getRoundPlayers(round)].sort((a, b) => {
    const winningsA = toNumber(a.winnings, 0)
    const winningsB = toNumber(b.winnings, 0)

    const toParA = getPlayerTotalToPar(a, coursePar)
    const toParB = getPlayerTotalToPar(b, coursePar)

    const scoreA = getPlayerTotalScore(a)
    const scoreB = getPlayerTotalScore(b)

    return winningsB - winningsA || toParA - toParB || scoreA - scoreB
  })
}

function getWinner(round) {
  const players = getRoundPlayers(round)

  return (
    players.find((player) => player.name === round?.winner) ||
    getSortedPlayers(round)[0] ||
    null
  )
}

function getCourseName(round) {
  return round?.course?.name || "Erster Golfclub Westpfalz"
}

function getCourseLocation(round) {
  return round?.course?.location || "Westpfalz"
}

function getRoundDate(round) {
  return round?.date || "Unbekannt"
}

function getRoundId(round) {
  return round?.id || "SKZ-0000"
}

function countResult(player, result) {
  return getPlayerHoles(player).filter((hole) => hole.result?.label === result)
    .length
}

function countPars(player) {
  return countResult(player, "Par")
}

function getHoleToPar(hole) {
  return toNumber(hole?.score, 0) - toNumber(hole?.par, 0)
}

function getNineTotal(holes) {
  return holes.reduce((total, hole) => total + toNumber(hole.score, 0), 0)
}

function getNinePar(holes) {
  return holes.reduce((total, hole) => total + toNumber(hole.par, 0), 0)
}

function getNineToPar(holes) {
  return getNineTotal(holes) - getNinePar(holes)
}

function isWolffnItem(item) {
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

function isWolffnRound(round) {
  return Boolean(
    round?.gameMode === GAME_MODES.WOLFFN || round?.gameModeLabel === "Wolffn"
  )
}

function getHoleBonusSkins(hole) {
  if (isWolffnItem(hole)) {
    return 0
  }

  if (hole?.bonusSkins !== undefined) {
    return toNumber(hole.bonusSkins, 0)
  }

  if (hole?.eagleBonusApplied) {
    return 1
  }

  return 0
}

function getHoleBonusLabel(hole) {
  const bonusSkins = getHoleBonusSkins(hole)

  if (bonusSkins <= 0) {
    return null
  }

  const resultLabel = hole?.result?.label || hole?.bonusResult || ""

  if (
    resultLabel === "Eagle" ||
    resultLabel === "Albatross" ||
    bonusSkins >= 2
  ) {
    return `Eagle +${bonusSkins}`
  }

  return `Birdie +${bonusSkins}`
}

function getHoleBonusStyle(hole) {
  const label = getHoleBonusLabel(hole)

  if (!label) {
    return ""
  }

  if (label.includes("Birdie")) {
    return "bg-red-500 text-white"
  }

  return "bg-orange-500 text-white"
}

function getHistoryBonusSkins(item) {
  if (isWolffnItem(item)) {
    return 0
  }

  if (item?.bonusSkins !== undefined) {
    return toNumber(item.bonusSkins, 0)
  }

  if (item?.eagleBonusApplied) {
    return 1
  }

  return 0
}

function getHistoryBonusLabel(item) {
  const bonusSkins = getHistoryBonusSkins(item)

  if (bonusSkins <= 0) {
    return null
  }

  const resultLabel = item?.winningResult || item?.bonusResult || ""

  if (
    resultLabel === "Eagle" ||
    resultLabel === "Albatross" ||
    bonusSkins >= 2
  ) {
    return `Eagle +${bonusSkins}`
  }

  return `Birdie +${bonusSkins}`
}

function getHistoryBonusStyle(item) {
  const label = getHistoryBonusLabel(item)

  if (!label) {
    return ""
  }

  if (label.includes("Birdie")) {
    return "bg-red-500 text-white"
  }

  return "bg-orange-500 text-white"
}

function formatSkinsText(value) {
  const amount = toNumber(value, 0)

  return amount === 1 ? "1 Skin" : `${amount} Skins`
}

function joinTeamNames(team) {
  return Array.isArray(team) && team.length > 0 ? team.join(" + ") : "-"
}

function getWolffnFormatLabel(item) {
  if (item?.wolffnFormat === "2v2") {
    return "2v2"
  }

  return "Wolffn"
}

function getWonHoleNumbers(history, index) {
  const item = history[index]

  if (!item || item.hasTie) {
    return []
  }

  const holes = [item.hole]

  for (
    let previousIndex = index - 1;
    previousIndex >= 0;
    previousIndex -= 1
  ) {
    const previousItem = history[previousIndex]

    if (!previousItem?.hasTie) {
      break
    }

    holes.unshift(previousItem.hole)
  }

  return holes.filter((hole) => hole !== undefined && hole !== null)
}

function formatWonHolesLabel(holes) {
  if (!holes.length || holes.length === 1) {
    return null
  }

  return `Holes: ${holes.join(" + ")}`
}

function normalizeResultLabel(value) {
  if (!value) {
    return "Par"
  }

  const label = String(value)

  if (label.includes("Albatross")) {
    return "Albatross"
  }

  if (label.includes("Eagle")) {
    return "Eagle"
  }

  if (label.includes("Birdie")) {
    return "Birdie"
  }

  if (label.includes("Double")) {
    return "Double Bogey"
  }

  if (label.includes("Triple")) {
    return "Triple+"
  }

  if (label.includes("Bogey")) {
    return "Bogey"
  }

  if (label.includes("Par")) {
    return "Par"
  }

  return label
}

function getHistoryResultLabel(item) {
  return normalizeResultLabel(
    item?.winningResult ||
      item?.tieResult ||
      item?.bestResult ||
      item?.scoreMultiplierLabel ||
      item?.bonusResult ||
      item?.result?.label ||
      item?.resultLabel ||
      "Par"
  )
}

function getHistoryOutcomeLabel(item) {
  const resultLabel = getHistoryResultLabel(item)

  return item?.hasTie ? `Tied with ${resultLabel}` : `Won with ${resultLabel}`
}

function getHistoryOutcomeStyle(item) {
  const resultLabel = getHistoryResultLabel(item)

  if (item?.hasTie) {
    if (resultLabel === "Birdie") {
      return "bg-red-50 text-red-600"
    }

    if (resultLabel === "Eagle" || resultLabel === "Albatross") {
      return "bg-orange-50 text-orange-600"
    }

    return "bg-slate-100 text-slate-600"
  }

  if (resultLabel === "Albatross") {
    return "bg-yellow-300 text-black"
  }

  if (resultLabel === "Eagle") {
    return "bg-orange-500 text-white"
  }

  if (resultLabel === "Birdie") {
    return "bg-red-500 text-white"
  }

  if (
    resultLabel === "Bogey" ||
    resultLabel === "Double Bogey" ||
    resultLabel === "Triple+"
  ) {
    return "bg-blue-500 text-white"
  }

  return "bg-emerald-100 text-emerald-700"
}

function SummaryCard({ label, score, par, toPar }) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/[0.70] p-4 text-center shadow-sm backdrop-blur-xl">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {score}
      </div>

      <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Par {par}
      </div>

      <div className={`mt-2 text-lg font-black ${getToParColor(toPar)}`}>
        {formatToPar(toPar)}
      </div>
    </div>
  )
}

function BonusBadge({ label, className }) {
  if (!label) {
    return null
  }

  return (
    <div
      className={`mt-3 flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${className}`}
    >
      <Sparkles size={10} />
      {label}
    </div>
  )
}

function HoleGrid({ holes }) {
  if (!holes.length) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/[0.70] p-5 text-center text-sm font-bold text-slate-400 shadow-sm backdrop-blur-xl">
        Keine Lochdaten vorhanden.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {holes.map((hole) => {
        const toPar = getHoleToPar(hole)
        const score = toNumber(hole?.score, 0)
        const par = toNumber(hole?.par, 0)
        const holeNumber = hole?.hole || "-"
        const resultLabel = hole?.result?.label || "Par"
        const bonusLabel = getHoleBonusLabel(hole)
        const bonusStyle = getHoleBonusStyle(hole)

        return (
          <div
            key={`${holeNumber}-${score}-${par}`}
            className="rounded-[24px] border border-white/60 bg-white/[0.70] p-4 shadow-sm backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Hole
              </div>

              <div className="text-xl font-black text-slate-950">
                {holeNumber}
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-black shadow-sm ${getScoreStyle(
                  resultLabel
                )}`}
              >
                {score}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Par {par}
              </div>

              <div
                className={`text-xs font-black uppercase tracking-widest ${getToParColor(
                  toPar
                )}`}
              >
                {formatToPar(toPar)}
              </div>
            </div>

            <div className="mt-2 truncate text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              {resultLabel}
            </div>

            <BonusBadge label={bonusLabel} className={bonusStyle} />
          </div>
        )
      })}
    </div>
  )
}

export default function MatchDetailsScreen() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { completedRounds } = useGame()

  const [expandedPlayer, setExpandedPlayer] = useState(null)

  const safeCompletedRounds = Array.isArray(completedRounds)
    ? completedRounds
    : []

  const round = safeCompletedRounds.find(
    (completedRound) => String(completedRound.id) === String(id)
  )

  if (!round) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] px-5">
        <AppBackground />

        <div className="relative w-full max-w-sm rounded-[40px] border border-white/70 bg-white/[0.78] p-10 text-center shadow-sm backdrop-blur-2xl">
          <div className="text-5xl" aria-hidden="true">
            🔎
          </div>

          <div className="mt-5 text-3xl font-black tracking-tight text-slate-950">
            Scorecard nicht gefunden
          </div>

          <div className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
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

  const sortedPlayers = getSortedPlayers(round)
  const winner = getWinner(round)
  const winnerName = round.winner || winner?.name || "Unbekannt"
  const courseName = getCourseName(round)
  const courseLocation = getCourseLocation(round)
  const coursePar = getCoursePar(round)
  const roundId = getRoundId(round)
  const roundDate = getRoundDate(round)
  const roundHistory = Array.isArray(round.history) ? round.history : []
  const displayEarnings = round.winnings ?? winner?.winnings ?? 0
  const wolffnRound = isWolffnRound(round)

  const bonusModeWasEnabled =
    !wolffnRound &&
    Boolean(
      round.specialScoringEnabled ||
        round.bonusSkinsEnabled ||
        round.eagleBonusEnabled ||
        roundHistory.some((item) => getHistoryBonusSkins(item) > 0)
    )

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-5">
        <div className="flex items-center justify-between pt-8">
          <motion.button
            type="button"
            whileTap={{
              scale: 0.92,
            }}
            onClick={() => navigate("/matches")}
            aria-label="Zurück zum Rundenarchiv"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/[0.70] text-slate-950 shadow-sm backdrop-blur-xl"
          >
            <ArrowLeft size={22} />
          </motion.button>

          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-700/80">
              Scorecard
            </div>

            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {roundDate}
            </div>
          </div>
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-7 overflow-hidden rounded-[38px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
        >
          <div className="relative p-6">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
            />

            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-yellow-300/20 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-emerald-300/15 blur-3xl"
            />

            <div className="relative">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-white/40">
                Winner
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="truncate text-5xl font-black tracking-tight">
                  {winnerName}
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-black shadow-lg shadow-yellow-400/20">
                  <Trophy size={23} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="inline-flex rounded-full bg-white/[0.12] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                  Match {roundId}
                </div>

                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.12] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                  <MapPin size={13} />

                  <span className="max-w-[230px] truncate">{courseName}</span>
                </div>

                {wolffnRound && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-950">
                    <span aria-hidden="true">🐺</span>
                    Wolffn
                  </div>
                )}

                {bonusModeWasEnabled && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                    <Sparkles size={13} />
                    Skinz Professional
                  </div>
                )}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-[28px] bg-black/[0.24] p-5">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white/40">
                    Earnings
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black tracking-tight ${getMoneyColorDark(
                      displayEarnings
                    )}`}
                  >
                    {formatMoney(displayEarnings)}
                  </div>
                </div>

                <div className="rounded-[28px] bg-black/[0.24] p-5 text-right">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white/40">
                    To Par
                  </div>

                  <div
                    className={`mt-2 text-4xl font-black tracking-tight ${getToParColorDark(
                      winner?.totalToPar
                    )}`}
                  >
                    {formatToPar(winner?.totalToPar)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
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
          className="mt-5 rounded-[34px] border border-white/70 bg-white/[0.62] p-6 shadow-sm backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin size={18} />

                <div className="text-xs font-black uppercase tracking-[0.25em]">
                  Course
                </div>
              </div>

              <div className="mt-3 truncate text-4xl font-black tracking-tight text-slate-950">
                {courseName}
              </div>

              <div className="mt-2 text-sm font-bold text-slate-500">
                {courseLocation}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-5xl font-black text-slate-950">
                {coursePar}
              </div>

              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500">
                Par
              </div>
            </div>
          </div>
        </motion.div>

        {roundHistory.length > 0 && (
          <div className="mt-5 rounded-[38px] border border-white/70 bg-white/[0.62] p-5 shadow-sm backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Match Details
                </div>

                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Holes
                </div>
              </div>

              <div className="text-4xl" aria-hidden="true">
                {wolffnRound ? "🐺" : "💰"}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {roundHistory.map((item, index) => {
                const wolffnHole = isWolffnItem(item)
                const bonusLabel = getHistoryBonusLabel(item)
                const bonusStyle = getHistoryBonusStyle(item)
                const bonusSkins = getHistoryBonusSkins(item)
                const currentHoleValue = toNumber(item.currentHoleValue, 0)
                const scoreMultiplierLabel =
                  item.scoreMultiplierLabel || item.bonusResult || null
                const wolffnMultiplier = toNumber(item.wolffnMultiplier, 1)
                const wonHoles = getWonHoleNumbers(roundHistory, index)
                const wonHolesLabel = formatWonHolesLabel(wonHoles)
                const outcomeLabel = getHistoryOutcomeLabel(item)
                const outcomeStyle = getHistoryOutcomeStyle(item)

                return (
                  <div
                    key={`${roundId}-history-${item.hole}-${
                      item.winner || index
                    }`}
                    className="rounded-[26px] border border-white/70 bg-white/[0.74] px-5 py-4 shadow-sm backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div>
                          <div className="text-lg font-black text-slate-950">
                            Hole {item.hole}
                          </div>

                          <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                            Par {item.par}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div
                            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${outcomeStyle}`}
                          >
                            {outcomeLabel}
                          </div>

                          {wolffnHole && (
                            <div className="flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                              <span aria-hidden="true">🐺</span>
                              {getWolffnFormatLabel(item)}
                            </div>
                          )}

                          {!wolffnHole && bonusLabel && (
                            <div
                              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${bonusStyle}`}
                            >
                              <Sparkles size={10} />
                              {bonusLabel}
                            </div>
                          )}

                          {wonHolesLabel && !item.hasTie && (
                            <div className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                              {wonHolesLabel}
                            </div>
                          )}
                        </div>

                        {wolffnHole && (
                          <div className="mt-3 rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                            <div className="text-xs font-black uppercase tracking-widest text-white/40">
                              Teams
                            </div>

                            <div className="mt-2 text-sm font-black leading-relaxed">
                              {joinTeamNames(item.wolffnTeamA)}
                              <span className="mx-2 text-white/40">vs</span>
                              {joinTeamNames(item.wolffnTeamB)}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {wolffnHole && wolffnMultiplier > 1 && (
                            <div className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                              Wolffn x{wolffnMultiplier}
                            </div>
                          )}

                          {wolffnHole && scoreMultiplierLabel && (
                            <div
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                                scoreMultiplierLabel.includes("Birdie")
                                  ? "bg-red-500 text-white"
                                  : "bg-orange-500 text-white"
                              }`}
                            >
                              {scoreMultiplierLabel}
                            </div>
                          )}

                          {wolffnHole && currentHoleValue > 0 && (
                            <div className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-700">
                              Value {formatSkinsText(currentHoleValue)}
                            </div>
                          )}

                          {!wolffnHole && bonusSkins > 0 && (
                            <div className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                              Bonus {formatSkinsText(bonusSkins)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-black text-slate-950">
                          {item.hasTie ? "Carryover" : item.winner}
                        </div>

                        <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                          {formatSkinsText(item.skins || 0)} ·{" "}
                          {formatPlainMoney(item.pot || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-[38px] border border-white/70 bg-white/[0.62] p-5 shadow-sm backdrop-blur-2xl">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
              Final Scores
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {sortedPlayers.map((player, index) => {
              const isExpanded = expandedPlayer === player.name
              const playerHoles = getPlayerHoles(player)
              const frontNine = playerHoles.slice(0, 9)
              const backNine = playerHoles.slice(9, 18)
              const totalScore = getPlayerTotalScore(player)
              const totalPar = getPlayerTotalPar(player, coursePar)
              const totalToPar = getPlayerTotalToPar(player, coursePar)
              const isWinner = player.name === winnerName

              return (
                <div key={`${roundId}-${player.name}`}>
                  <motion.button
                    type="button"
                    whileTap={{
                      scale: 0.985,
                    }}
                    onClick={() => {
                      setExpandedPlayer(isExpanded ? null : player.name)
                    }}
                    aria-expanded={isExpanded}
                    className={`w-full rounded-[32px] border px-5 py-5 text-left shadow-sm transition-all duration-300 ${
                      isWinner
                        ? "border-yellow-300/70 bg-yellow-100/80"
                        : "border-white/70 bg-white/[0.74]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${getRankStyle(
                            index
                          )}`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-3xl font-black tracking-tight text-slate-950">
                            {player.name}
                          </div>

                          <div className="mt-2 text-sm font-black uppercase tracking-widest text-slate-400">
                            Score {totalScore} · Par {totalPar}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <div
                            className={`text-5xl font-black ${getToParColor(
                              totalToPar
                            )}`}
                          >
                            {formatToPar(totalToPar)}
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
                          <ChevronDown size={24} className="text-slate-400" />
                        </motion.div>
                      </div>
                    </div>
                  </motion.button>

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
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="rounded-[24px] border border-white/60 bg-white/[0.70] p-4 text-center shadow-sm backdrop-blur-xl">
                            <div className="flex justify-center">
                              <Flame size={24} className="text-red-500" />
                            </div>

                            <div className="mt-3 text-3xl font-black text-slate-950">
                              {countResult(player, "Birdie")}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Birdies
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-white/60 bg-white/[0.70] p-4 text-center shadow-sm backdrop-blur-xl">
                            <div className="text-2xl" aria-hidden="true">
                              🦅
                            </div>

                            <div className="mt-3 text-3xl font-black text-slate-950">
                              {countResult(player, "Eagle")}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Eagles
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-white/60 bg-white/[0.70] p-4 text-center shadow-sm backdrop-blur-xl">
                            <div className="text-2xl" aria-hidden="true">
                              ⛳️
                            </div>

                            <div className="mt-3 text-3xl font-black text-slate-950">
                              {countPars(player)}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Pars
                            </div>
                          </div>
                        </div>

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

                        <div className="mt-6">
                          <div className="mb-3 flex items-end justify-between">
                            <div>
                              <div className="text-2xl font-black tracking-tight text-slate-950">
                                Front 9
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Score {getNineTotal(frontNine)} · Par{" "}
                                {getNinePar(frontNine)}
                              </div>
                            </div>

                            <div
                              className={`text-sm font-black uppercase tracking-widest ${getToParColor(
                                getNineToPar(frontNine)
                              )}`}
                            >
                              {formatToPar(getNineToPar(frontNine))}
                            </div>
                          </div>

                          <HoleGrid holes={frontNine} />
                        </div>

                        <div className="mt-8">
                          <div className="mb-3 flex items-end justify-between">
                            <div>
                              <div className="text-2xl font-black tracking-tight text-slate-950">
                                Back 9
                              </div>

                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Score {getNineTotal(backNine)} · Par{" "}
                                {getNinePar(backNine)}
                              </div>
                            </div>

                            <div
                              className={`text-sm font-black uppercase tracking-widest ${getToParColor(
                                getNineToPar(backNine)
                              )}`}
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