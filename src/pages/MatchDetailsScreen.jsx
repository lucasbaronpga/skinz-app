import { useMemo, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  MapPin,
  Sparkles,
  Trash2,
  Trophy,
  X,
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

function normalizeName(value) {
  return String(value || "").trim().toLowerCase()
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
  return `${formatEuroAmount(value)}€`
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

function formatToPar(value) {
  const amount = toNumber(value, 0)

  if (amount === 0) {
    return "E"
  }

  if (amount > 0) {
    return `+${amount}`
  }

  return String(amount)
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
  if (label === "Albatross") return "border-yellow-300 bg-yellow-300 text-black"
  if (label === "Eagle") return "border-orange-500 bg-orange-500 text-white"
  if (label === "Birdie") return "border-red-500 bg-red-500 text-white"
  if (label === "Bogey") return "border-blue-500 bg-blue-500 text-white"
  if (label === "Double Bogey") return "border-blue-900 bg-blue-900 text-white"
  if (label === "Triple+") return "border-purple-600 bg-purple-600 text-white"
  return "border-slate-200 bg-white text-slate-950"
}

function getRankStyle(index) {
  if (index === 0) return "bg-amber-400 text-black shadow-lg shadow-amber-500/20"
  if (index === 1) return "bg-slate-300 text-slate-950"
  if (index === 2) return "bg-[#cd7f32] text-white"
  return "border border-slate-200 bg-white text-slate-900"
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
}

function getPlayerWonSkinz(player) {
  return Math.max(toNumber(player?.skins, 0), 0)
}

function getSettlementRows({ player, players, stake }) {
  if (!player || !Array.isArray(players)) return []

  const playerSkinz = getPlayerWonSkinz(player)
  const safeStake = toNumber(stake, 0)

  return players
    .filter((opponent) => normalizeName(opponent?.name) !== normalizeName(player?.name))
    .map((opponent) => {
      const opponentSkinz = getPlayerWonSkinz(opponent)
      const skinzDifference = playerSkinz - opponentSkinz
      const amount = roundMoney(skinzDifference * safeStake)

      return {
        opponentName: opponent?.name || "Player",
        opponentSkinz,
        skinzDifference,
        amount,
      }
    })
}

function formatSettlementAction(row) {
  if (row.amount > 0) return `bekommt von ${row.opponentName}`
  if (row.amount < 0) return `zahlt an ${row.opponentName}`
  return `ausgeglichen mit ${row.opponentName}`
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
  return toNumber(round?.course?.par, 72)
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
    const skinsA = getPlayerWonSkinz(a)
    const skinsB = getPlayerWonSkinz(b)
    const toParA = getPlayerTotalToPar(a, coursePar)
    const toParB = getPlayerTotalToPar(b, coursePar)
    const scoreA = getPlayerTotalScore(a)
    const scoreB = getPlayerTotalScore(b)
    const nameA = String(a?.name || "")
    const nameB = String(b?.name || "")

    return (
      winningsB - winningsA ||
      skinsB - skinsA ||
      toParA - toParB ||
      scoreA - scoreB ||
      nameA.localeCompare(nameB)
    )
  })
}

function getWinner(round) {
  const players = getRoundPlayers(round)
  const winnerName = String(round?.winner || "").trim().toLowerCase()

  return (
    players.find((player) => String(player?.name || "").trim().toLowerCase() === winnerName) ||
    getSortedPlayers(round)[0] ||
    null
  )
}

function getCourseName(round) {
  return round?.course?.name || "Erster Golfclub Westpfalz"
}

function getRoundDate(round) {
  return round?.date || "Unbekannt"
}

function getRoundId(round) {
  return round?.id || "SKZ-0000"
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

function roundHasWolffnData(round) {
  if (!round) return false

  if (round?.gameMode === GAME_MODES.WOLFFN || round?.gameModeLabel === "Wolffn") {
    return true
  }

  const historyHasWolffn =
    Array.isArray(round?.history) && round.history.some((playedHole) => isWolffnItem(playedHole))

  if (historyHasWolffn) return true

  return getRoundPlayers(round).some(
    (player) => Array.isArray(player?.holes) && player.holes.some((playedHole) => isWolffnItem(playedHole))
  )
}

function roundHasProfessionalScoring(round) {
  if (!round || roundHasWolffnData(round)) return false

  if (
    round?.gameMode === GAME_MODES.PROFESSIONAL ||
    round?.gameModeLabel === "Skinz Professional" ||
    round?.specialScoringEnabled ||
    round?.bonusSkinsEnabled ||
    round?.eagleBonusEnabled
  ) {
    return true
  }

  const historyHasProfessionalScoring =
    Array.isArray(round?.history) &&
    round.history.some(
      (playedHole) =>
        !isWolffnItem(playedHole) &&
        (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied)
    )

  if (historyHasProfessionalScoring) return true

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          !isWolffnItem(playedHole) &&
          (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.gameModeLabel === "Skinz Professional" ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied)
      )
  )
}

function getRoundGameMode(round) {
  if (roundHasWolffnData(round)) return GAME_MODES.WOLFFN
  if (roundHasProfessionalScoring(round)) return GAME_MODES.PROFESSIONAL
  if (round?.gameMode === GAME_MODES.PROFESSIONAL) return GAME_MODES.PROFESSIONAL
  if (round?.gameMode === GAME_MODES.WOLFFN) return GAME_MODES.WOLFFN
  return GAME_MODES.CLASSIC
}

function getRoundGameModeMeta(round) {
  const gameMode = getRoundGameMode(round)

  if (gameMode === GAME_MODES.WOLFFN) {
    return {
      label: "Wolffn",
      icon: "🐺",
      heroClassName: "bg-white text-slate-950",
      pillClassName: "bg-slate-950 text-white",
      glowClassName: "from-white/18 via-white/6 to-transparent",
      emoji: "🐺",
    }
  }

  if (gameMode === GAME_MODES.PROFESSIONAL) {
    return {
      label: "Pro",
      icon: null,
      heroClassName: "bg-orange-500 text-white",
      pillClassName: "bg-orange-500 text-white",
      glowClassName: "from-orange-400/32 via-orange-500/10 to-transparent",
      emoji: "💰",
    }
  }

  return {
    label: "Classic",
    icon: null,
    heroClassName: "bg-emerald-500 text-white",
    pillClassName: "bg-emerald-500 text-white",
    glowClassName: "from-emerald-400/28 via-emerald-500/8 to-transparent",
    emoji: "💰",
  }
}

function getHoleBonusSkins(hole) {
  if (isWolffnItem(hole)) return 0
  if (hole?.bonusSkins !== undefined) return toNumber(hole.bonusSkins, 0)
  if (hole?.eagleBonusApplied) return 1
  return 0
}

function getHoleBonusLabel(hole) {
  const bonusSkins = getHoleBonusSkins(hole)
  if (bonusSkins <= 0) return null

  const resultLabel = hole?.result?.label || hole?.bonusResult || ""

  if (resultLabel === "Eagle" || resultLabel === "Albatross" || bonusSkins >= 2) {
    return `Eagle +${bonusSkins}`
  }

  return `Birdie +${bonusSkins}`
}

function getHoleBonusStyle(hole) {
  const label = getHoleBonusLabel(hole)
  if (!label) return ""
  if (label.includes("Birdie")) return "bg-red-500 text-white"
  return "bg-orange-500 text-white"
}

function getHistoryBonusSkins(item) {
  if (isWolffnItem(item)) return 0
  if (item?.bonusSkins !== undefined) return toNumber(item.bonusSkins, 0)
  if (item?.eagleBonusApplied) return 1
  return 0
}

function getHistoryBonusLabel(item) {
  const bonusSkins = getHistoryBonusSkins(item)
  if (bonusSkins <= 0) return null

  const resultLabel = item?.winningResult || item?.bonusResult || ""

  if (resultLabel === "Eagle" || resultLabel === "Albatross" || bonusSkins >= 2) {
    return `Eagle +${bonusSkins}`
  }

  return `Birdie +${bonusSkins}`
}

function getHistoryBonusStyle(item) {
  const label = getHistoryBonusLabel(item)
  if (!label) return ""
  if (label.includes("Birdie")) return "bg-red-500 text-white"
  return "bg-orange-500 text-white"
}

function formatSkinsText(value) {
  const amount = toNumber(value, 0)
  return amount === 1 ? "1 Skin" : `${amount} Skinz`
}

function joinTeamNames(team) {
  return Array.isArray(team) && team.length > 0 ? team.join(" + ") : "-"
}

function getWolffnFormatLabel(item) {
  if (item?.wolffnFormat === "2v2") return "2v2"
  return "Wolffn"
}

function getWonHoleNumbers(history, index) {
  const item = history[index]

  if (!item || item.hasTie) return []

  const holes = [item.hole]

  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const previousItem = history[previousIndex]

    if (!previousItem?.hasTie) break

    holes.unshift(previousItem.hole)
  }

  return holes.filter((hole) => hole !== undefined && hole !== null)
}

function formatWonHolesLabel(holes) {
  if (!holes.length || holes.length === 1) return null
  return `Holes: ${holes.join(" + ")}`
}

function normalizeResultLabel(value) {
  if (!value) return "Par"

  const label = String(value)

  if (label.includes("Albatross")) return "Albatross"
  if (label.includes("Eagle")) return "Eagle"
  if (label.includes("Birdie")) return "Birdie"
  if (label.includes("Double")) return "Double Bogey"
  if (label.includes("Triple")) return "Triple+"
  if (label.includes("Bogey")) return "Bogey"
  if (label.includes("Par")) return "Par"
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
    if (resultLabel === "Birdie") return "bg-red-50 text-red-600"
    if (resultLabel === "Eagle" || resultLabel === "Albatross") return "bg-orange-50 text-orange-600"
    return "bg-slate-100 text-slate-600"
  }

  if (resultLabel === "Albatross") return "bg-yellow-300 text-black"
  if (resultLabel === "Eagle") return "bg-orange-500 text-white"
  if (resultLabel === "Birdie") return "bg-red-500 text-white"
  if (resultLabel === "Bogey" || resultLabel === "Double Bogey" || resultLabel === "Triple+") return "bg-blue-500 text-white"
  return "bg-emerald-100 text-emerald-700"
}

function GameModePill({ meta, className = "" }) {
  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm ${meta.pillClassName} ${className}`}
    >
      {meta.icon && <span aria-hidden="true">{meta.icon}</span>}
      <span className="min-w-0 whitespace-normal leading-tight">{meta.label}</span>
    </div>
  )
}

function BonusBadge({ label, className }) {
  if (!label) return null

  return (
    <div className={`mt-3 flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${className}`}>
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
        const resultLabel = normalizeResultLabel(hole?.result?.label || "Par")
        const bonusLabel = getHoleBonusLabel(hole)
        const bonusStyle = getHoleBonusStyle(hole)

        return (
          <div
            key={`${holeNumber}-${score}-${par}`}
            className="rounded-[24px] border border-white/60 bg-white/[0.70] p-4 shadow-sm backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hole</div>
              <div className="text-xl font-black text-slate-950">{holeNumber}</div>
            </div>

            <div className="mt-4 flex justify-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-black shadow-sm ${getScoreStyle(resultLabel)}`}>
                {score}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Par {par}</div>
              <div className={`text-xs font-black uppercase tracking-widest ${getToParColor(toPar)}`}>{formatToPar(toPar)}</div>
            </div>

            <div className="mt-2 text-center text-[10px] font-black uppercase leading-tight tracking-widest text-slate-400">
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
  const { completedRounds, deleteCompletedRound } = useGame()

  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [selectedSettlementPlayer, setSelectedSettlementPlayer] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const round = useMemo(() => {
    const safeCompletedRounds = Array.isArray(completedRounds) ? completedRounds : []
    return safeCompletedRounds.find((completedRound) => String(completedRound.id) === String(id))
  }, [completedRounds, id])

  const handleDeleteMatch = () => {
    if (!round || isDeleting) return

    setIsDeleting(true)
    const deleted = deleteCompletedRound(round.id)

    if (deleted) {
      navigate("/matches", { replace: true })
      return
    }

    setIsDeleting(false)
  }

  const handleCancelDelete = () => {
    if (isDeleting) return
    setShowDeleteConfirm(false)
  }

  if (!round) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] px-5">
        <AppBackground />

        <div className="relative w-full max-w-sm rounded-[40px] border border-white/70 bg-white/[0.78] p-10 text-center shadow-sm backdrop-blur-2xl">
          <div className="text-5xl" aria-hidden="true">🔎</div>
          <div className="mt-5 text-3xl font-black tracking-tight text-slate-950">Scorecard nicht gefunden</div>
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
  const coursePar = getCoursePar(round)
  const roundId = getRoundId(round)
  const roundDate = getRoundDate(round)
  const roundHistory = Array.isArray(round.history) ? round.history : []
  const displayEarnings = round.winnings ?? winner?.winnings ?? 0
  const winnerToPar = getPlayerTotalToPar(winner, coursePar)
  const winnerSkinz = getPlayerWonSkinz(winner)
  const gameModeMeta = getRoundGameModeMeta(round)
  const settlementRows = getSettlementRows({
    player: selectedSettlementPlayer,
    players: sortedPlayers,
    stake: round.stake,
  })

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <AppBackground />

      <div className="relative mx-auto max-w-md px-5">
        <div className="flex items-center justify-between gap-4 pt-8">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate("/matches")}
            aria-label="Zurück zum Rundenarchiv"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/[0.70] text-slate-950 shadow-sm backdrop-blur-xl"
          >
            <ArrowLeft size={22} />
          </motion.button>

          <div className="min-w-0 text-right">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-700/80">Scorecard</div>
            <div className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">{roundDate}</div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-7 overflow-hidden rounded-[38px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
        >
          <div className="relative p-6">
            <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t ${gameModeMeta.glowClassName}`} />
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden="true" className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-white/8 blur-3xl" />

            <div className="relative">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Winner</div>

              <div className="mt-3 flex items-start gap-3">
                <div className="min-w-0 break-words text-5xl font-black leading-[0.92] tracking-[-0.055em]">{winnerName}</div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg shadow-amber-400/20">
                  <Trophy size={23} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="inline-flex rounded-full bg-white/[0.12] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">{roundId}</div>
                <div className={`inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest shadow-sm ${gameModeMeta.heroClassName}`}>
                  {gameModeMeta.icon && <span aria-hidden="true">{gameModeMeta.icon}</span>}
                  <span className="min-w-0 whitespace-normal leading-tight">{gameModeMeta.label}</span>
                </div>
                <div className="inline-flex max-w-full items-start gap-2 rounded-full bg-white/[0.12] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                  <MapPin size={13} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 whitespace-normal leading-tight">{courseName}</span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                <div className="min-w-0 rounded-[28px] bg-black/[0.24] p-4 sm:p-5">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white/40">Skinz</div>
                  <div className="mt-2 min-w-0 break-words text-[clamp(1.75rem,9vw,2.5rem)] font-black leading-none tracking-tight text-white">
                    {winnerSkinz}
                  </div>
                </div>

                <div className="min-w-0 rounded-[28px] bg-black/[0.24] p-4 sm:p-5">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white/40">Earnings</div>
                  <div className={`mt-2 min-w-0 break-words text-[clamp(1.75rem,9vw,2.5rem)] font-black leading-none tracking-tight ${getMoneyColorDark(displayEarnings)}`}>
                    {formatMoney(displayEarnings)}
                  </div>
                </div>

                <div className="min-w-0 rounded-[28px] bg-black/[0.24] p-4 text-right sm:p-5">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white/40">To Par</div>
                  <div className={`mt-2 min-w-0 break-words text-[clamp(1.75rem,9vw,2.5rem)] font-black leading-none tracking-tight ${getToParColorDark(winnerToPar)}`}>
                    {formatToPar(winnerToPar)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-5 rounded-[38px] border border-white/70 bg-white/[0.62] p-5 shadow-sm backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Final Scores</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">Results</div>
            </div>
            <GameModePill meta={gameModeMeta} />
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
              const playerSkinz = getPlayerWonSkinz(player)
              const isWinner = normalizeName(player.name) === normalizeName(winnerName)

              return (
                <div key={`${roundId}-${player.name}`}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setExpandedPlayer(isExpanded ? null : player.name)}
                    aria-expanded={isExpanded}
                    className={`w-full rounded-[32px] border px-4 py-5 text-left shadow-sm transition-all duration-300 sm:px-5 ${
                      isWinner ? "border-amber-300/70 bg-amber-100/80" : "border-white/70 bg-white/[0.74]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${getRankStyle(index)}`}>
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="break-words text-2xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-3xl">{player.name}</div>
                          <div className="mt-2 text-sm font-black uppercase tracking-widest text-slate-400">Score {totalScore}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <div className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                              {playerSkinz} Skinz
                            </div>
                            <div className={`rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm ${getMoneyColor(player.winnings)}`}>
                              {formatMoney(player.winnings)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <div className={`text-5xl font-black leading-none ${getToParColor(totalToPar)}`}>{formatToPar(totalToPar)}</div>
                          <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">To Par</div>
                        </div>

                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                          <ChevronDown size={24} className="text-slate-400" />
                        </motion.div>
                      </div>
                    </div>
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setSelectedSettlementPlayer(player)}
                    className="mt-2 flex w-full items-center justify-between rounded-[24px] border border-white/70 bg-white/[0.74] px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl transition active:scale-[0.99]"
                  >
                    <span>Abrechnung anzeigen</span>
                    <span className="flex items-center gap-1 text-slate-950">
                      Details
                      <ChevronRight size={14} strokeWidth={3} />
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-6">
                          <div className="mb-3 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-2xl font-black tracking-tight text-slate-950">Front 9</div>
                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Score {getNineTotal(frontNine)} · Par {getNinePar(frontNine)}
                              </div>
                            </div>
                            <div className={`shrink-0 text-sm font-black uppercase tracking-widest ${getToParColor(getNineToPar(frontNine))}`}>
                              {formatToPar(getNineToPar(frontNine))}
                            </div>
                          </div>

                          <HoleGrid holes={frontNine} />
                        </div>

                        <div className="mt-8">
                          <div className="mb-3 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-2xl font-black tracking-tight text-slate-950">Back 9</div>
                              <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                Score {getNineTotal(backNine)} · Par {getNinePar(backNine)}
                              </div>
                            </div>
                            <div className={`shrink-0 text-sm font-black uppercase tracking-widest ${getToParColor(getNineToPar(backNine))}`}>
                              {formatToPar(getNineToPar(backNine))}
                            </div>
                          </div>

                          <HoleGrid holes={backNine} />
                        </div>

                        <div className="mt-6 rounded-[26px] border border-white/70 bg-white/[0.74] p-4 shadow-sm backdrop-blur-xl">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</div>
                              <div className="mt-1 text-2xl font-black text-slate-950">{totalScore}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Par</div>
                              <div className="mt-1 text-2xl font-black text-slate-950">{totalPar}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">To Par</div>
                              <div className={`mt-1 text-2xl font-black ${getToParColor(totalToPar)}`}>{formatToPar(totalToPar)}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        {roundHistory.length > 0 && (
          <div className="mt-5 rounded-[38px] border border-white/70 bg-white/[0.62] p-5 shadow-sm backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Match Details</div>
                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">Holes</div>
              </div>
              <div className="text-4xl" aria-hidden="true">{gameModeMeta.emoji}</div>
            </div>

            <div className="mt-6 space-y-3">
              {roundHistory.map((item, index) => {
                const wolffnHole = isWolffnItem(item)
                const bonusLabel = getHistoryBonusLabel(item)
                const bonusStyle = getHistoryBonusStyle(item)
                const bonusSkins = getHistoryBonusSkins(item)
                const currentHoleValue = toNumber(item.currentHoleValue, 0)
                const scoreMultiplierLabel = item.scoreMultiplierLabel || item.bonusResult || null
                const wolffnMultiplier = toNumber(item.wolffnMultiplier, 1)
                const wonHoles = getWonHoleNumbers(roundHistory, index)
                const wonHolesLabel = formatWonHolesLabel(wonHoles)
                const outcomeLabel = getHistoryOutcomeLabel(item)
                const outcomeStyle = getHistoryOutcomeStyle(item)

                return (
                  <div
                    key={`${roundId}-history-${item.hole}-${item.winner || index}`}
                    className="rounded-[26px] border border-white/70 bg-white/[0.74] px-4 py-4 shadow-sm backdrop-blur-xl sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-lg font-black text-slate-950">Hole {item.hole}</div>
                          <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">Par {item.par}</div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${outcomeStyle}`}>{outcomeLabel}</div>

                          {wolffnHole && (
                            <div className="flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                              <span aria-hidden="true">🐺</span>
                              {getWolffnFormatLabel(item)}
                            </div>
                          )}

                          {!wolffnHole && bonusLabel && (
                            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${bonusStyle}`}>
                              <Sparkles size={10} />
                              {bonusLabel}
                            </div>
                          )}

                          {wonHolesLabel && !item.hasTie && (
                            <div className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">{wonHolesLabel}</div>
                          )}
                        </div>

                        {wolffnHole && (
                          <div className="mt-3 rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                            <div className="text-xs font-black uppercase tracking-widest text-white/40">Teams</div>
                            <div className="mt-2 break-words text-sm font-black leading-relaxed">
                              {joinTeamNames(item.wolffnTeamA)}
                              <span className="mx-2 text-white/40">vs</span>
                              {joinTeamNames(item.wolffnTeamB)}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {wolffnHole && wolffnMultiplier > 1 && (
                            <div className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">Wolffn x{wolffnMultiplier}</div>
                          )}

                          {wolffnHole && scoreMultiplierLabel && (
                            <div className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${scoreMultiplierLabel.includes("Birdie") ? "bg-red-500 text-white" : "bg-orange-500 text-white"}`}>
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

                      <div className="min-w-[86px] shrink-0 text-right">
                        <div className="break-words text-base font-black leading-tight text-slate-950 sm:text-lg">
                          {item.hasTie ? "Carryover" : item.winner}
                        </div>
                        <div className="mt-1 text-xs font-black uppercase leading-relaxed tracking-widest text-slate-400">
                          {formatSkinsText(item.skins || 0)} · {formatPlainMoney(item.pot || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-[38px] border border-red-200/70 bg-white/[0.62] p-5 shadow-sm backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-red-500">Danger Zone</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">Delete Match</div>
              <div className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                Entfernt diese Scorecard dauerhaft aus Archiv, Leaderboard und Spielerstatistiken.
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 size={22} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!showDeleteConfirm ? (
              <motion.button
                key="delete-trigger"
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-5 w-full rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-black uppercase tracking-widest text-red-600 shadow-sm transition-colors hover:bg-red-100"
              >
                Delete Match
              </motion.button>
            ) : (
              <motion.div
                key="delete-confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="mt-5 rounded-[28px] border border-red-200 bg-red-50 p-4"
              >
                <div className="text-base font-black text-red-700">Match wirklich löschen?</div>
                <div className="mt-2 text-sm font-bold leading-relaxed text-red-500">
                  Diese Aktion kann nicht rückgängig gemacht werden. Die Runde wird lokal aus deinen gespeicherten Skinz-Daten entfernt.
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="rounded-[24px] border border-white/70 bg-white px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-700 shadow-sm disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteMatch}
                    disabled={isDeleting}
                    className="rounded-[24px] bg-red-600 px-4 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedSettlementPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10 backdrop-blur-xl sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlement-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 44, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 34, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-md overflow-hidden rounded-[38px] border border-white/70 bg-white/[0.88] p-5 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Abrechnung</div>
                  <h3 id="settlement-title" className="mt-1 truncate text-4xl font-black tracking-[-0.06em] text-slate-950">
                    {selectedSettlementPlayer.name}
                  </h3>
                  <div className="mt-2 text-sm font-black uppercase tracking-widest text-slate-500">
                    {getPlayerWonSkinz(selectedSettlementPlayer)} Skinz
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSettlementPlayer(null)}
                  aria-label="Abrechnung schließen"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-5 rounded-[28px] border border-white/70 bg-white/[0.48] p-3 shadow-sm backdrop-blur-xl">
                <div className="space-y-2">
                  {settlementRows.map((row) => (
                    <div key={`${selectedSettlementPlayer.name}-${row.opponentName}`} className="rounded-[22px] border border-white/70 bg-white/[0.62] px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-950">{formatSettlementAction(row)}</div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Diff. {row.skinzDifference > 0 ? "+" : ""}{row.skinzDifference} Skinz
                          </div>
                        </div>
                        <div className={`shrink-0 text-xl font-black ${getMoneyColor(row.amount)}`}>{formatMoney(row.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-white/70 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Gesamt</div>
                    <div className="mt-1 text-sm font-bold text-white/70">Schuld / Gewinn</div>
                  </div>
                  <div className={`text-4xl font-black tracking-[-0.06em] ${getMoneyColorDark(selectedSettlementPlayer.winnings)}`}>
                    {formatMoney(selectedSettlementPlayer.winnings)}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}