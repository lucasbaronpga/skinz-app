import {
  useState,
} from "react"

import {
  motion,
  AnimatePresence,
} from "framer-motion"

import {
  useNavigate,
} from "react-router-dom"

import {
  X,
  Flame,
  Crown,
  ChevronRight,
} from "lucide-react"

import {
  useGame,
} from "../context/GameContext"

export default function Live() {

  const navigate =
    useNavigate()

  const {

    hole,

    currentPot,
    currentPar,

    players,

    history,

    celebration,

    matchFinished,
    resetGame,

    lowestScore,
    winners,
    hasTie,

    updateScore,
    finishHole,

    getGolfResult,

  } = useGame()

  const [
    showAbortModal,
    setShowAbortModal,
  ] = useState(false)

  const sortedPlayers =
    [...players].sort(
      (a, b) =>
        b.winnings -
        a.winnings
    )

  const champion =
    sortedPlayers[0]

  const progress =
    Math.min(
      100,
      (hole / 18) * 100
    )

  function formatToPar(
    value
  ) {

    if (value === 0) {
      return "E"
    }

    if (value > 0) {
      return `+${value}`
    }

    return value
  }

  function getToParColor(
    value
  ) {

    if (value < 0) {
      return "text-emerald-500"
    }

    if (value > 0) {
      return "text-red-500"
    }

    return "text-slate-950"
  }

  function getScoreStyle(
    label
  ) {

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

  function getHotStreak(
    player
  ) {

    const recentHoles =
      player.holes?.slice(-3) || []

    const hotRounds =
      recentHoles.filter(
        (hole) => {

          const label =
            hole.result?.label

          return (
            label === "Birdie" ||
            label === "Eagle" ||
            label === "Albatross"
          )
        }
      )

    return hotRounds.length >= 2
  }

  function handleCloseLive() {

    navigate("/")
  }

  function handleAbortMatch() {

    resetGame()

    navigate("/")
  }

  function handleResetGame() {

    resetGame()

    navigate("/round")
  }

  return (

    <div className="min-h-screen bg-[#f5f5f7] pb-52 text-slate-950">

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

        className="px-6 pt-10"
      >

        <div className="mx-auto max-w-md">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
                Live Match
              </div>

              <div className="mt-3 text-6xl font-black tracking-tight text-slate-950">
                Hole {hole}
              </div>

              <div className="mt-2 text-lg font-bold text-slate-400">
                Par {currentPar}
              </div>

            </div>

            {!matchFinished && (

              <motion.button
                whileTap={{
                  scale: 0.92,
                }}

                onClick={
                  handleCloseLive
                }

                className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm"
              >

                <X
                  size={22}
                />

              </motion.button>

            )}

          </div>

          {/* Progress */}
          <div className="mt-8 rounded-full border border-slate-100 bg-white p-2 shadow-sm">

            <div className="h-3 overflow-hidden rounded-full bg-[#f5f5f7]">

              <motion.div
                initial={{
                  width: 0,
                }}

                animate={{
                  width: `${progress}%`,
                }}

                transition={{
                  duration: 0.4,
                }}

                className="h-full rounded-full bg-emerald-500"
              />

            </div>

          </div>

          <div className="mt-3 flex items-center justify-between px-1">

            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              Progress
            </div>

            <div className="text-xs font-black text-slate-400">
              {hole}/18
            </div>

          </div>

        </div>

      </motion.div>

      {/* Pot Hero */}
      <div className="mx-auto mt-8 max-w-md px-5">

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          className={`overflow-hidden rounded-[42px] p-8 shadow-2xl ${
            hasTie
              ? "bg-orange-500 text-white"
              : "bg-slate-950 text-white"
          }`}
        >

          <div className="flex items-start justify-between">

            <div>

              <div
                className={`text-xs font-black uppercase tracking-[0.3em] ${
                  hasTie
                    ? "text-orange-100"
                    : "text-slate-500"
                }`}
              >

                {hasTie
                  ? "Carryover"
                  : "Current Pot"}

              </div>

              <motion.div
                key={currentPot}

                initial={{
                  scale: 0.92,
                  opacity: 0,
                }}

                animate={{
                  scale: 1,
                  opacity: 1,
                }}

                className="mt-5 text-7xl font-black tracking-tight"
              >

                {currentPot}€

              </motion.div>

            </div>

            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                hasTie
                  ? "bg-white/20"
                  : "bg-emerald-500"
              }`}
            >

              {hasTie
                ? "🔥"
                : "💰"}

            </div>

          </div>

          <div
            className={`mt-6 text-lg font-bold ${
              hasTie
                ? "text-orange-100"
                : "text-slate-400"
            }`}
          >

            {hasTie
              ? `Gleichstand auf Loch ${hole}`
              : `${winners[0]?.name || "-"} führt aktuell`}

          </div>

        </motion.div>

      </div>

      {/* Players */}
      <div className="mx-auto mt-8 max-w-md space-y-5 px-5">

        {players.map(
          (
            player,
            index
          ) => {

            const isWinning =
              player.score ===
              lowestScore

            const golfResult =
              getGolfResult(
                player.score,
                currentPar
              )

            const currentToPar =
              player.score -
              currentPar

            return (

              <motion.div
                key={player.name}

                initial={{
                  opacity: 0,
                  y: 20,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  delay:
                    index * 0.05,
                }}
              >

                <div
                  className={`overflow-hidden rounded-[38px] border p-6 shadow-sm transition-all duration-300 ${
                    isWinning
                      ? "border-emerald-100 bg-white shadow-[0_18px_50px_rgba(16,185,129,0.14)]"
                      : "border-slate-100 bg-white"
                  }`}
                >

                  <div className="flex items-start justify-between gap-5">

                    {/* Player Info */}
                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <div className="truncate text-4xl font-black tracking-tight text-slate-950">
                          {player.name}
                        </div>

                        {isWinning &&
                          !hasTie && (

                          <div className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Leader
                          </div>

                        )}

                        {getHotStreak(
                          player
                        ) && (

                          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">

                            <Flame
                              size={10}
                            />

                            Hot

                          </div>

                        )}

                      </div>

                      <div
                        className={`mt-5 inline-flex rounded-2xl px-4 py-3 text-xs font-black shadow-sm ${golfResult.color}`}
                      >
                        {golfResult.label}
                      </div>

                      <div
                        className={`mt-5 text-6xl font-black tracking-tight ${getToParColor(
                          currentToPar
                        )}`}
                      >
                        {formatToPar(
                          currentToPar
                        )}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Current Hole
                      </div>

                    </div>

                    {/* Score Controls */}
                    <div className="flex flex-col items-center gap-4">

                      <motion.button
                        whileTap={{
                          scale: 0.9,
                        }}

                        disabled={
                          matchFinished
                        }

                        onClick={() =>
                          updateScore(
                            index,
                            player.score + 1
                          )
                        }

                        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-3xl font-black text-slate-500 shadow-sm disabled:opacity-40"
                      >
                        +
                      </motion.button>

                      <motion.div
                        key={player.score}

                        initial={{
                          scale: 0.82,
                          opacity: 0,
                        }}

                        animate={{
                          scale: 1,
                          opacity: 1,
                        }}

                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 18,
                        }}

                        className={`flex h-28 w-28 items-center justify-center rounded-[34px] border-2 text-6xl font-black shadow-sm ${getScoreStyle(
                          golfResult.label
                        )}`}
                      >
                        {player.score}
                      </motion.div>

                      <motion.button
                        whileTap={{
                          scale: 0.9,
                        }}

                        disabled={
                          matchFinished
                        }

                        onClick={() =>
                          updateScore(
                            index,
                            Math.max(
                              1,
                              player.score - 1
                            )
                          )
                        }

                        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-3xl font-black text-slate-500 shadow-sm disabled:opacity-40"
                      >
                        −
                      </motion.button>

                    </div>

                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">

                    <div>

                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Earnings
                      </div>

                      <div className="mt-1 text-3xl font-black text-emerald-600">
                        {player.winnings > 0
                          ? `+${player.winnings}€`
                          : "0€"}
                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Skins
                      </div>

                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {player.skins}
                      </div>

                    </div>

                  </div>

                </div>

              </motion.div>

            )
          }
        )}

      </div>

      {/* Timeline */}
      <div className="mx-auto mt-10 max-w-md px-5">

        <div className="rounded-[38px] bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Match History
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Timeline
              </div>

            </div>

            <div className="text-4xl">
              ⛳
            </div>

          </div>

          <div className="mt-6 space-y-3">

            {history.length === 0 && (

              <div className="rounded-[24px] border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400 shadow-sm">
                Noch keine gespielten Löcher.
              </div>

            )}

            {history
              .slice()
              .reverse()
              .map(
                (item) => (

                  <div
                    key={item.hole}

                    className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 py-4 shadow-sm"
                  >

                    <div>

                      <div className="text-lg font-black text-slate-950">
                        Hole {item.hole}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                        Par {item.par}
                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-lg font-black text-slate-950">
                        {item.hasTie
                          ? "Carryover"
                          : item.winner}
                      </div>

                      <div className="mt-1 text-xs font-black uppercase tracking-widest text-emerald-600">
                        {item.pot}€
                      </div>

                    </div>

                  </div>

                )
              )}

          </div>

        </div>

      </div>

      {/* Abort Button */}
      {!matchFinished && (

        <div className="mx-auto mt-6 max-w-md px-5">

          <motion.button
            whileTap={{
              scale: 0.98,
            }}

            onClick={() =>
              setShowAbortModal(true)
            }

            className="w-full rounded-[28px] border border-red-100 bg-white py-4 text-sm font-black text-red-500 shadow-sm"
          >

            Match abbrechen

          </motion.button>

        </div>

      )}

      {/* Finish Button */}
      {!matchFinished && (

        <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center px-5">

          <div className="w-full max-w-md">

            <motion.button
              whileTap={{
                scale: 0.98,
              }}

              onClick={finishHole}

              className="flex w-full items-center justify-between rounded-[32px] bg-emerald-500 px-6 py-5 text-xl font-black text-white shadow-[0_20px_50px_rgba(16,185,129,0.35)]"
            >

              <span>
                Loch abschließen
              </span>

              <ChevronRight
                size={24}
              />

            </motion.button>

          </div>

        </div>

      )}

      {/* Celebration */}
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

              className="w-full max-w-sm rounded-[42px] bg-white p-10 text-center shadow-2xl"
            >

              <div
                className={`inline-flex rounded-2xl px-5 py-3 text-sm font-black ${celebration.color}`}
              >
                {celebration.result}
              </div>

              <div className="mt-6 text-6xl font-black tracking-tight text-slate-950">
                {celebration.player}
              </div>

              <div className="mt-4 text-lg font-bold text-slate-400">
                gewinnt den Skin
              </div>

              <div className="mt-6 text-7xl font-black tracking-tight text-emerald-600">
                {celebration.pot}€
              </div>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      {/* Match Finished */}
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

              className="mx-auto w-full max-w-md rounded-[44px] bg-white p-8 text-center shadow-2xl"
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
              >
                🏆
              </motion.div>

              <div className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
                Match Finished
              </div>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-slate-950">
                {champion?.name}
              </h2>

              <div className="mt-4 text-4xl font-black text-emerald-600">
                +{champion?.winnings}€
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">

                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

                  <div className="text-sm font-bold text-slate-400">
                    Skins
                  </div>

                  <div className="mt-2 text-4xl font-black text-slate-950">
                    {champion?.skins}
                  </div>

                </div>

                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

                  <div className="text-sm font-bold text-slate-400">
                    Earnings
                  </div>

                  <div className="mt-2 text-4xl font-black text-emerald-600">
                    {champion?.winnings}€
                  </div>

                </div>

                <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">

                  <div className="text-sm font-bold text-slate-400">
                    Leader
                  </div>

                  <div className="mt-2 flex justify-center text-yellow-500">

                    <Crown
                      size={34}
                    />

                  </div>

                </div>

              </div>

              <motion.button
                whileTap={{
                  scale: 0.98,
                }}

                onClick={
                  handleResetGame
                }

                className="mt-8 w-full rounded-[30px] bg-slate-950 py-5 text-lg font-black text-white shadow-lg"
              >

                Neue Runde starten

              </motion.button>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      {/* Abort Modal */}
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

              className="w-full max-w-sm overflow-hidden rounded-[34px] bg-white shadow-2xl"
            >

              <div className="p-6 text-center">

                <div className="text-lg font-black text-slate-950">
                  Match abbrechen?
                </div>

                <div className="mt-2 text-sm font-bold text-slate-400">
                  Dieses Match wird gelöscht und nicht gespeichert.
                </div>

              </div>

              <div className="border-t border-slate-100">

                <button
                  onClick={() =>
                    setShowAbortModal(false)
                  }

                  className="w-full py-4 text-sm font-black text-slate-500"
                >
                  Abbrechen
                </button>

                <button
                  onClick={
                    handleAbortMatch
                  }

                  className="w-full border-t border-slate-100 py-4 text-sm font-black text-red-500"
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