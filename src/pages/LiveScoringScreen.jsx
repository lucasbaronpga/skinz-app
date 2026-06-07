import {
  useEffect,
  useRef,
  useState,
} from "react"

import {
  AnimatePresence,
  motion,
} from "framer-motion"

import {
  useNavigate,
} from "react-router-dom"

import {
  Check,
  ChevronRight,
  Crown,
  Sparkles,
  X,
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

const HOLE_COUNT = 18

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

function formatPlainMoney(value) {
  const amount =
    roundMoney(value)

  return `${formatEuroAmount(amount)}€`
}

function getMoneyColor(value) {
  const amount =
    toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function formatSkinSaldo(value) {
  return Math.abs(
    toNumber(value, 0)
  )
}

function getSkinColor(value) {
  const amount =
    toNumber(value, 0)

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function formatToPar(value) {
  const amount =
    toNumber(value, 0)

  if (amount === 0) {
    return "E"
  }

  if (amount > 0) {
    return `+${amount}`
  }

  return amount
}

function getToParColor(value) {
  const amount =
    toNumber(value, 0)

  if (amount < 0) {
    return "text-emerald-500"
  }

  if (amount > 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getScoreStyle(label) {
  if (label === "Albatross") {
    return "border-amber-300 bg-amber-300 text-black"
  }

  if (label === "Eagle") {
    return "border-orange-500 bg-orange-500 text-white"
  }

  if (label === "Birdie") {
    return "border-red-500 bg-red-500 text-white"
  }

  if (label === "Bogey") {
    return "border-blue-500 bg-blue-500 text-white"
  }

  if (label === "Double Bogey") {
    return "border-blue-900 bg-blue-900 text-white"
  }

  if (label === "Triple+") {
    return "border-purple-600 bg-purple-600 text-white"
  }

  return "border-white/80 bg-white/[0.82] text-slate-950"
}

function getCourseName(course) {
  return (
    course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getCourseLocation(course) {
  return (
    course?.location ||
    "Westpfalz"
  )
}

function getCoursePar(course) {
  return (
    course?.par ||
    72
  )
}

function getCourseMeta(course) {
  return `${getCourseLocation(course)} · Par ${getCoursePar(course)}`
}

function getSpecialLabelForScore(score, par, specialScoringEnabled) {
  if (!specialScoringEnabled) {
    return null
  }

  const toPar =
    toNumber(score, par) -
    toNumber(par, 0)

  if (toPar <= -2) {
    return "Eagle 3 Skinz"
  }

  if (toPar === -1) {
    return "Birdie 2 Skinz"
  }

  return null
}

function getScoreBadgeLabel(label) {
  if (
    label === "Birdie" ||
    label === "Eagle" ||
    label === "Albatross"
  ) {
    return label
  }

  return null
}

function getSkinsLabel(value) {
  const amount =
    toNumber(value, 0)

  return amount === 1
    ? "1 Skin"
    : `${amount} Skins`
}

function getHistorySpecialLabel(item) {
  if (!item?.specialScoringEnabled) {
    return null
  }

  if (item.specialScoringLabel) {
    return item.specialScoringLabel
  }

  if (item.bonusResult) {
    return item.bonusResult
  }

  return null
}

function getWolffnTeeOrder(players, hole) {
  const playerNames =
    players.map((player) => player.name)

  if (playerNames.length !== 4) {
    return playerNames
  }

  const offset =
    (Math.max(toNumber(hole, 1), 1) - 1) %
    playerNames.length

  return [
    ...playerNames.slice(offset),
    ...playerNames.slice(0, offset),
  ]
}

function getWolffnTeams({
  teeOrder,
  decisionPlayer,
  askedPlayer,
  wolffnDecision,
}) {
  if (
    !Array.isArray(teeOrder) ||
    teeOrder.length !== 4 ||
    !decisionPlayer
  ) {
    return null
  }

  if (wolffnDecision === "alone") {
    return {
      format: "1v3",
      label: "Wolffn",
      wolffnPlayer: decisionPlayer,
      teamA: [
        decisionPlayer,
      ],
      teamB:
        teeOrder.filter(
          (playerName) =>
            playerName !== decisionPlayer
        ),
    }
  }

  if (!askedPlayer) {
    return null
  }

  if (wolffnDecision === "accepted") {
    const teamA = [
      decisionPlayer,
      askedPlayer,
    ]

    const teamB =
      teeOrder.filter(
        (playerName) =>
          !teamA.includes(playerName)
      )

    return {
      format: "2v2",
      label: "2v2",
      wolffnPlayer: null,
      teamA,
      teamB,
    }
  }

  if (wolffnDecision === "declined") {
    return {
      format: "1v3",
      label: "Wolffn",
      wolffnPlayer: askedPlayer,
      teamA: [
        askedPlayer,
      ],
      teamB:
        teeOrder.filter(
          (playerName) =>
            playerName !== askedPlayer
        ),
    }
  }

  return null
}

function joinTeamNames(team) {
  return Array.isArray(team)
    ? team.join(" + ")
    : "-"
}

function ModePill({
  children,
  isDark = false,
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl ${
        isDark
          ? "border border-white/15 bg-white/10 text-slate-200"
          : "border border-white/70 bg-white/[0.46] text-slate-600"
      }`}
    >
      {children}
    </span>
  )
}

export default function LiveScoringScreen() {
  const navigate = useNavigate()

  const scoreEntryRef =
    useRef(null)

  const {
    hole,

    currentPar,
    currentCourse,

    players,
    history,
    celebration,

    matchFinished,
    resetGame,
    hasActiveMatch,

    lowestScore,
    hasTie,

    gameMode,
    isWolffnMode,

    specialScoringEnabled,

    updateScore,
    finishHole,

    getGolfResult,
  } = useGame()

  const [
    showAbortModal,
    setShowAbortModal,
  ] = useState(false)

  const [
    showSavedFeedback,
    setShowSavedFeedback,
  ] = useState(false)

  const [
    wolffnSetup,
    setWolffnSetup,
  ] = useState({
    hole: null,
    gameMode: null,
    askedPlayer: null,
    decision: null,
  })

  const sortedPlayers =
    [...players].sort(
      (a, b) =>
        toNumber(b.winnings, 0) -
          toNumber(a.winnings, 0) ||
        toNumber(a.totalToPar, 0) -
          toNumber(b.totalToPar, 0)
    )

  const champion =
    sortedPlayers[0] || null

  const safeHole =
    Math.min(
      Math.max(toNumber(hole, 1), 1),
      HOLE_COUNT
    )

  const currentModeLabel =
    isWolffnMode
      ? "🐺 Wolffn"
      : specialScoringEnabled
      ? "Pro"
      : "Classic"

  const wolffnSetupIsCurrent =
    wolffnSetup.hole === safeHole &&
    wolffnSetup.gameMode === gameMode

  const wolffnAskedPlayer =
    wolffnSetupIsCurrent
      ? wolffnSetup.askedPlayer
      : null

  const wolffnDecision =
    wolffnSetupIsCurrent
      ? wolffnSetup.decision
      : null

  const wolffnTeeOrder =
    getWolffnTeeOrder(
      players,
      safeHole
    )

  const wolffnDecisionPlayer =
    wolffnTeeOrder[0] || null

  const wolffnAvailablePartners =
    wolffnTeeOrder.filter(
      (playerName) =>
        playerName !== wolffnDecisionPlayer
    )

  const wolffnTeams =
    getWolffnTeams({
      teeOrder: wolffnTeeOrder,
      decisionPlayer: wolffnDecisionPlayer,
      askedPlayer: wolffnAskedPlayer,
      wolffnDecision,
    })

  const wolffnSetupComplete =
    !isWolffnMode ||
    Boolean(wolffnTeams)

  useEffect(() => {
    if (!hasActiveMatch || matchFinished) {
      return undefined
    }

    const timeoutId =
      window.setTimeout(() => {
        scoreEntryRef.current?.scrollIntoView({
          block: "start",
          behavior: "auto",
        })
      }, 120)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    hasActiveMatch,
    matchFinished,
    safeHole,
  ])

  function handleCloseLive() {
    navigate("/")
  }

  function handleAbortMatch() {
    resetGame()
    setShowAbortModal(false)
    navigate("/")
  }

  function handleResetGame() {
    resetGame()
    navigate("/round")
  }

  function handleGoHome() {
    navigate("/")
  }

  function handleAskPartner(playerName) {
    setWolffnSetup({
      hole: safeHole,
      gameMode,
      askedPlayer: playerName,
      decision: null,
    })
  }

  function handleFinishHole() {
    if (!wolffnSetupComplete) {
      return
    }

    setShowSavedFeedback(true)

    if (isWolffnMode) {
      finishHole(wolffnTeams)
    } else {
      finishHole()
    }

    window.setTimeout(() => {
      setShowSavedFeedback(false)
    }, 650)
  }

  if (!hasActiveMatch && !matchFinished) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e8ebe5] px-6 text-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_45%_80%,rgba(234,179,8,0.14),transparent_36%)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-6 bottom-8 rounded-[56px] border border-white/70 bg-white/18 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_35px_90px_rgba(15,23,42,0.18)] backdrop-blur-3xl"
        />

        <div className="relative w-full max-w-sm rounded-[40px] border border-white/70 bg-white/[0.58] p-8 text-center shadow-[0_28px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          <div className="text-[12px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
            Live Scoring
          </div>

          <div className="mt-4 text-5xl font-black tracking-[-0.06em]">
            Keine Runde
          </div>

          <div className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
            Starte zuerst eine neue Runde, damit Scores geändert und Löcher abgeschlossen werden können.
          </div>

          <button
            type="button"
            onClick={() => navigate("/round")}
            className="mt-8 w-full rounded-[30px] bg-slate-950 py-5 text-lg font-black text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)]"
          >
            Runde starten
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-[30px] border border-white/70 bg-white/[0.58] py-5 text-lg font-black text-slate-500 shadow-sm backdrop-blur-xl"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#e8ebe5] pb-[calc(11rem+env(safe-area-inset-bottom))] pt-8 text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_45%_80%,rgba(234,179,8,0.14),transparent_36%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 top-6 bottom-8 rounded-[56px] border border-white/70 bg-white/18 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_35px_90px_rgba(15,23,42,0.18)] backdrop-blur-3xl"
      />

      <div className="relative mx-auto max-w-md px-5">
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
          className="pt-8"
        >
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="text-[12px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
                Live Scoring
              </div>

              <h1 className="mt-3 text-[3.65rem] font-black leading-none tracking-[-0.07em] text-slate-950">
                Loch {safeHole}
              </h1>

              <div className="mt-2 text-xl font-black tracking-[-0.035em] text-slate-500">
                Par {currentPar}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ModePill>
                  {currentModeLabel}
                </ModePill>

                <ModePill>
                  {getCourseName(currentCourse)}
                </ModePill>
              </div>
            </div>

            {!matchFinished && (
              <motion.button
                type="button"
                whileTap={{
                  scale: 0.9,
                }}
                onClick={handleCloseLive}
                aria-label="Live-Ansicht schließen"
                className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/[0.48] text-slate-600 shadow-sm backdrop-blur-2xl"
              >
                <X size={21} />
              </motion.button>
            )}
          </div>
        </motion.div>

        {isWolffnMode && !matchFinished && (
          <motion.div
            initial={{
              opacity: 0,
              y: 22,
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
            className="mt-8 overflow-hidden rounded-[38px] border border-white/20 bg-slate-950 text-white shadow-[0_28px_70px_rgba(15,23,42,0.35)]"
          >
            <div className="relative p-6">
              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-500">
                      Wolffn Setup
                    </div>

                    <div className="mt-3 text-4xl font-black tracking-[-0.05em]">
                      {wolffnDecisionPlayer || "-"} entscheidet
                    </div>
                  </div>

                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-sm"
                    aria-hidden="true"
                  >
                    🐺
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Tee Order
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {wolffnTeeOrder.map((playerName, index) => (
                      <div
                        key={`${playerName}-${index}`}
                        className={`rounded-[20px] px-3 py-3 text-center ${
                          index === 0
                            ? "bg-amber-300 text-black"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">
                          {index + 1}
                        </div>

                        <div className="mt-1 truncate text-sm font-black">
                          {playerName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Partner fragen
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {wolffnAvailablePartners.map((playerName) => {
                      const isSelected =
                        wolffnAskedPlayer === playerName

                      return (
                        <button
                          key={playerName}
                          type="button"
                          onClick={() => handleAskPartner(playerName)}
                          className={`rounded-[22px] px-3 py-4 text-sm font-black transition ${
                            isSelected
                              ? "bg-amber-300 text-black"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {playerName}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setWolffnSetup({
                        hole: safeHole,
                        gameMode,
                        askedPlayer: null,
                        decision: "alone",
                      })
                    }}
                    className={`mt-3 w-full rounded-[24px] px-4 py-4 text-sm font-black transition ${
                      wolffnDecision === "alone"
                        ? "bg-amber-300 text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    Alleine spielen
                  </button>
                </div>

                {wolffnAskedPlayer && (
                  <div className="mt-6 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                      Hat {wolffnAskedPlayer} angenommen?
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setWolffnSetup({
                            hole: safeHole,
                            gameMode,
                            askedPlayer: wolffnAskedPlayer,
                            decision: "accepted",
                          })
                        }
                        className={`rounded-[22px] px-4 py-4 text-sm font-black transition ${
                          wolffnDecision === "accepted"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        Ja
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setWolffnSetup({
                            hole: safeHole,
                            gameMode,
                            askedPlayer: wolffnAskedPlayer,
                            decision: "declined",
                          })
                        }
                        className={`rounded-[22px] px-4 py-4 text-sm font-black transition ${
                          wolffnDecision === "declined"
                            ? "bg-red-500 text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        Nein
                      </button>
                    </div>
                  </div>
                )}

                {wolffnTeams && (
                  <div className="mt-6 rounded-[28px] border border-white/70 bg-white p-5 text-slate-950 shadow-sm">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                      Teams
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xl font-black tracking-[-0.035em]">
                          {joinTeamNames(wolffnTeams.teamA)}
                        </div>

                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {wolffnTeams.label}
                        </div>
                      </div>

                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        vs
                      </div>

                      <div className="min-w-0 text-right">
                        <div className="text-xl font-black tracking-[-0.035em]">
                          {joinTeamNames(wolffnTeams.teamB)}
                        </div>

                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Gegner
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!wolffnSetupComplete && (
                  <div className="mt-5 rounded-[24px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                    Partner-Antwort wählen oder alleine spielen.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div
          ref={scoreEntryRef}
          className="mt-8 space-y-4 scroll-mt-6"
        >
          {players.map((player, index) => {
            const playerScore =
              toNumber(player.score, currentPar)

            const isWinning =
              playerScore === lowestScore

            const golfResult =
              getGolfResult(
                playerScore,
                currentPar
              )

            const currentToPar =
              playerScore - currentPar

            const playerSpecialLabel =
              getSpecialLabelForScore(
                playerScore,
                currentPar,
                specialScoringEnabled
              )

            const scoreBadgeLabel =
              getScoreBadgeLabel(golfResult.label)

            return (
              <motion.div
                key={player.name}
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.035,
                  duration: 0.24,
                  ease: "easeOut",
                }}
                className={`overflow-hidden rounded-[38px] border shadow-[0_22px_58px_rgba(15,23,42,0.09)] backdrop-blur-2xl transition ${
                  isWinning
                    ? "border-emerald-300/70 bg-emerald-50/78"
                    : "border-white/70 bg-white/[0.56]"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[2.35rem] font-black leading-none tracking-[-0.06em] text-slate-950">
                        {player.name}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {scoreBadgeLabel && (
                          <div
                            className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white ${
                              scoreBadgeLabel === "Birdie"
                                ? "bg-red-500"
                                : scoreBadgeLabel === "Eagle"
                                ? "bg-orange-500"
                                : "bg-amber-400 text-black"
                            }`}
                          >
                            {scoreBadgeLabel}
                          </div>
                        )}

                        {isWinning && !hasTie && (
                          <div className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                            Leader
                          </div>
                        )}

                        {isWinning &&
                          specialScoringEnabled &&
                          playerSpecialLabel && (
                            <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                              <Sparkles size={10} />
                              {playerSpecialLabel}
                            </div>
                          )}
                      </div>
                    </div>

                    <div
                      className={`shrink-0 text-[2.45rem] font-black leading-none tracking-[-0.06em] ${getToParColor(currentToPar)}`}
                    >
                      {formatToPar(currentToPar)}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[32px] border border-white/70 bg-white/[0.46] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.78)] backdrop-blur-xl">
                    <div className="grid grid-cols-[4.2rem_1fr_4.2rem] items-center gap-3">
                      <motion.button
                        type="button"
                        whileTap={{
                          scale: matchFinished ? 1 : 0.92,
                        }}
                        disabled={
                          matchFinished ||
                          playerScore <= 1
                        }
                        onClick={() =>
                          updateScore(
                            index,
                            Math.max(
                              1,
                              playerScore - 1
                            )
                          )
                        }
                        aria-label={`Score von ${player.name} verringern`}
                        className="flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-[24px] border border-white/80 bg-white/[0.72] text-[2.25rem] font-black leading-none text-slate-500 shadow-[0_10px_26px_rgba(15,23,42,0.10)] transition disabled:opacity-35"
                      >
                        −
                      </motion.button>

                      <motion.div
                        key={playerScore}
                        initial={{
                          scale: 0.9,
                          opacity: 0,
                          y: 4,
                        }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 280,
                          damping: 18,
                        }}
                        className={`flex min-h-[5.4rem] items-center justify-center rounded-[28px] border-2 text-[4.1rem] font-black leading-none tracking-[-0.07em] shadow-[0_14px_34px_rgba(15,23,42,0.13)] ${getScoreStyle(golfResult.label)}`}
                      >
                        {playerScore}
                      </motion.div>

                      <motion.button
                        type="button"
                        whileTap={{
                          scale: matchFinished ? 1 : 0.92,
                        }}
                        disabled={matchFinished}
                        onClick={() =>
                          updateScore(
                            index,
                            playerScore + 1
                          )
                        }
                        aria-label={`Score von ${player.name} erhöhen`}
                        className="flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-[24px] border border-white/80 bg-white/[0.72] text-[2.25rem] font-black leading-none text-slate-500 shadow-[0_10px_26px_rgba(15,23,42,0.10)] transition disabled:opacity-35"
                      >
                        +
                      </motion.button>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="rounded-full bg-white/[0.62] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 shadow-sm">
                        {golfResult.label}
                      </div>

                      <div
                        className={`rounded-full bg-white/[0.62] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm ${getToParColor(currentToPar)}`}
                      >
                        {formatToPar(currentToPar)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.12,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                Scorekarte
              </div>

              <div className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Verlauf
              </div>
            </div>

            <ModePill>
              {history.length}/{HOLE_COUNT}
            </ModePill>
          </div>

          <div className="mt-6 space-y-3">
            {history.length === 0 && (
              <div className="rounded-[26px] border border-white/70 bg-white/[0.42] p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                Noch kein Score auf der Karte.
              </div>
            )}

            {history
              .slice()
              .reverse()
              .map((item) => {
                const historySpecialLabel =
                  getHistorySpecialLabel(item)

                return (
                  <div
                    key={`${item.hole}-${item.winner}`}
                    className="rounded-[28px] border border-white/70 bg-white/[0.42] px-5 py-4 shadow-sm backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xl font-black tracking-[-0.035em] text-slate-950">
                            Loch {item.hole}
                          </div>

                          {historySpecialLabel && (
                            <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                              <Sparkles size={10} />
                              {historySpecialLabel}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Par {item.par}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {toNumber(item.carryoverSkins, 0) > 0 && (
                            <div className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                              Carry {getSkinsLabel(item.carryoverSkins)}
                            </div>
                          )}

                          {toNumber(item.carryoverAdded, 0) > 0 && item.hasTie && (
                            <div className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                              Add {getSkinsLabel(item.carryoverAdded)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xl font-black tracking-[-0.035em] text-slate-950">
                          {item.hasTie
                            ? "Carryover"
                            : item.winner}
                        </div>

                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                          {getSkinsLabel(item.skins || 0)} · {formatPlainMoney(item.pot || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>

        {!matchFinished && (
          <motion.button
            type="button"
            whileTap={{
              scale: 0.98,
            }}
            onClick={() => setShowAbortModal(true)}
            className="mt-6 w-full rounded-[30px] border border-red-100 bg-white/[0.58] py-5 text-sm font-black text-red-500 shadow-sm backdrop-blur-xl"
          >
            Match abbrechen
          </motion.button>
        )}
      </div>

      {!matchFinished && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="relative w-full max-w-md">
            <AnimatePresence>
              {showSavedFeedback && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.6,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: -18,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.7,
                    y: -34,
                  }}
                  transition={{
                    duration: 0.24,
                    ease: "easeOut",
                  }}
                  className={`absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)] ${
                    isWolffnMode
                      ? "bg-slate-950"
                      : specialScoringEnabled
                      ? "bg-orange-500"
                      : "bg-emerald-500"
                  }`}
                >
                  <Check
                    size={30}
                    strokeWidth={3.4}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              whileTap={{
                scale: wolffnSetupComplete ? 0.98 : 1,
              }}
              disabled={!wolffnSetupComplete}
              onClick={handleFinishHole}
              className={`flex w-full items-center justify-between rounded-[34px] px-6 py-6 text-xl font-black text-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isWolffnMode
                  ? "bg-slate-950"
                  : specialScoringEnabled
                  ? "bg-orange-500"
                  : "bg-emerald-500"
              }`}
            >
              <span>
                {!wolffnSetupComplete
                  ? "Wolffn Setup wählen"
                  : "Loch abschließen"}
              </span>

              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                <ChevronRight size={24} />
              </span>
            </motion.button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                scale: 0.85,
                opacity: 0,
                y: 40,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className="w-full max-w-sm overflow-hidden rounded-[42px] border border-white/70 bg-white/[0.78] p-10 text-center shadow-2xl backdrop-blur-2xl"
            >
              <div
                className={`inline-flex rounded-2xl px-5 py-3 text-sm font-black ${celebration.color}`}
              >
                {celebration.result}
              </div>

              {celebration.specialScoringApplied &&
                celebration.specialScoringLabel && (
                  <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                    <Sparkles size={13} />
                    {celebration.specialScoringLabel}
                  </div>
                )}

              <div className="mt-6 text-6xl font-black tracking-[-0.06em] text-slate-950">
                {celebration.player}
              </div>

              <div className="mt-4 text-lg font-bold text-slate-500">
                holt {celebration.skins || 1}{" "}
                {(celebration.skins || 1) === 1
                  ? "Skin"
                  : "Skins"}
              </div>

              <div className="mt-6 text-7xl font-black tracking-[-0.07em] text-amber-500">
                {formatMoney(celebration.pot)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchFinished && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                scale: 0.88,
                opacity: 0,
                y: 40,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              className="mx-auto w-full max-w-md overflow-hidden rounded-[44px] border border-white/70 bg-white/[0.82] p-8 text-center shadow-2xl backdrop-blur-2xl"
            >
              <motion.div
                animate={{
                  rotate: [
                    0,
                    -4,
                    4,
                    0,
                  ],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                }}
                className="text-7xl"
                aria-hidden="true"
              >
                🏆
              </motion.div>

              <div className="mt-6 text-[12px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
                Am 19. Loch
              </div>

              <h2 className="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">
                {champion?.name || "Winner"}
              </h2>

              <div className="mt-3 inline-flex max-w-full rounded-full border border-white/70 bg-white/[0.46] px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-xl">
                <span className="truncate">
                  {getCourseName(currentCourse)}
                </span>
              </div>

              <div className="mt-2 text-sm font-bold text-slate-500">
                {getCourseMeta(currentCourse)}
              </div>

              <div
                className={`mt-5 text-5xl font-black tracking-[-0.06em] ${getMoneyColor(champion?.winnings)}`}
              >
                {formatMoney(champion?.winnings)}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="rounded-[24px] border border-white/70 bg-white/[0.48] p-4 shadow-sm backdrop-blur-xl">
                  <div className="text-sm font-bold text-slate-500">
                    Skinz
                  </div>

                  <div
                    className={`mt-2 whitespace-nowrap text-[2rem] font-black leading-none tracking-[-0.045em] ${getSkinColor(champion?.skins)}`}
                  >
                    {formatSkinSaldo(champion?.skins)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/[0.48] p-4 shadow-sm backdrop-blur-xl">
                  <div className="text-sm font-bold text-slate-500">
                    Earnings
                  </div>

                  <div
                    className={`mt-2 whitespace-nowrap text-[1.85rem] font-black leading-none tracking-[-0.045em] ${getMoneyColor(champion?.winnings)}`}
                  >
                    {formatMoney(champion?.winnings)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/[0.48] p-4 shadow-sm backdrop-blur-xl">
                  <div className="text-sm font-bold text-slate-500">
                    To Par
                  </div>

                  <div
                    className={`mt-2 whitespace-nowrap text-[2rem] font-black leading-none tracking-[-0.045em] ${getToParColor(champion?.totalToPar)}`}
                  >
                    {formatToPar(champion?.totalToPar)}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[32px] border border-white/70 bg-white/[0.42] p-4 text-left shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                      Final Scores
                    </div>

                    <div className="mt-1 text-2xl font-black tracking-[-0.045em] text-slate-950">
                      Leaderboard
                    </div>
                  </div>

                  <div
                    className="text-3xl"
                    aria-hidden="true"
                  >
                    🏆
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {sortedPlayers.map((player, index) => {
                    const isChampion =
                      player.name === champion?.name

                    return (
                      <div
                        key={player.name}
                        className={`flex items-center justify-between rounded-[24px] border px-4 py-4 shadow-sm ${
                          isChampion
                            ? "border-emerald-300/70 bg-emerald-50/85"
                            : "border-white/70 bg-white/[0.54]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              index === 0
                                ? "bg-amber-300 text-black"
                                : index === 1
                                ? "border border-slate-200 bg-white text-slate-900"
                                : index === 2
                                ? "bg-orange-400 text-white"
                                : "border border-slate-200 bg-white text-slate-900"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-lg font-black text-slate-950">
                                {player.name}
                              </div>

                              {isChampion && (
                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                                  <Crown size={10} />
                                  Winner
                                </div>
                              )}
                            </div>

                            <div
                              className={`mt-1 text-xs font-black uppercase tracking-widest ${getSkinColor(player.skins)}`}
                            >
                              {formatSkinSaldo(player.skins)} Skinz
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div
                            className={`text-2xl font-black ${getMoneyColor(player.winnings)}`}
                          >
                            {formatMoney(player.winnings)}
                          </div>

                          <div
                            className={`mt-1 text-xs font-black uppercase tracking-widest ${getToParColor(player.totalToPar)}`}
                          >
                            {formatToPar(player.totalToPar)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={handleResetGame}
                  className="w-full rounded-[30px] bg-slate-950 py-5 text-lg font-black text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)]"
                >
                  Neue Runde starten
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={handleGoHome}
                  className="w-full rounded-[30px] border border-white/70 bg-white/[0.58] py-5 text-lg font-black text-slate-500 shadow-sm backdrop-blur-xl"
                >
                  Home
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbortModal && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="abort-match-title"
          >
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 40,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              className="w-full max-w-sm overflow-hidden rounded-[40px] border border-white/70 bg-white/[0.78] shadow-2xl backdrop-blur-2xl"
            >
              <div className="p-7 text-center">
                <div
                  id="abort-match-title"
                  className="text-3xl font-black tracking-[-0.045em] text-slate-950"
                >
                  Match abbrechen?
                </div>

                <div className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
                  Dieses Match wird gelöscht und nicht gespeichert.
                </div>
              </div>

              <div className="border-t border-white/70">
                <button
                  type="button"
                  onClick={() => setShowAbortModal(false)}
                  className="w-full py-4 text-sm font-black text-slate-500"
                >
                  Abbrechen
                </button>

                <button
                  type="button"
                  onClick={handleAbortMatch}
                  className="w-full border-t border-white/70 py-5 text-sm font-black text-red-500"
                >
                  Match löschen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}