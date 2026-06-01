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

  function handleCloseLive() {
    navigate("/")
  }

  function handleResetGame() {
    resetGame()
    navigate("/round")
  }

  function handleAbortMatch() {
    resetGame()
    navigate("/")
  }

  function formatToPar(
    value
  ) {
    if (value === 0) return "E"
    if (value > 0) return `+${value}`
    return value
  }

  function getToParColor(
    value
  ) {
    if (value < 0) return "text-emerald-500"
    if (value > 0) return "text-red-500"
    return "text-slate-950"
  }

  function getHotStreak(player) {

    const recent =
      player.holes?.slice(-3) || []

    return recent.filter(
      (h) =>
        ["Birdie", "Eagle", "Albatross"]
          .includes(h.result?.label)
    ).length >= 2
  }

  function getScoreStyle(label) {

    const map = {
      Albatross: "bg-yellow-400 text-black",
      Eagle: "bg-orange-500 text-white",
      Birdie: "bg-red-500 text-white",
      Bogey: "bg-blue-500 text-white",
      "Double Bogey": "bg-blue-900 text-white",
      "Triple+": "bg-purple-600 text-white",
    }

    return map[label] ||
      "bg-white text-slate-950 border"
  }

  return (

    <div className="min-h-screen bg-[#f5f5f7] pb-52 text-slate-950">

      {/* HEADER */}
      <div className="mx-auto max-w-md px-6 pt-10">

        <div className="flex justify-between">

          <div>
            <div className="text-xs font-black text-emerald-600 uppercase">
              Live Match
            </div>

            <div className="mt-3 text-6xl font-black">
              Hole {hole}
            </div>

            <div className="text-slate-400 font-bold">
              Par {currentPar}
            </div>
          </div>

          {!matchFinished && (

            <button
              onClick={handleCloseLive}
              className="h-14 w-14 rounded-full bg-white shadow"
            >
              <X />
            </button>

          )}

        </div>

        {/* PROGRESS */}
        <div className="mt-6 bg-white rounded-full p-2 shadow">

          <div className="h-3 bg-[#eee] rounded-full">

            <div
              style={{
                width: `${progress}%`,
              }}
              className="h-full bg-emerald-500 rounded-full"
            />

          </div>

        </div>

      </div>

      {/* POT */}
      <div className="mx-auto px-5 max-w-md mt-6">

        <div className={`p-6 rounded-3xl ${
          hasTie
            ? "bg-orange-500 text-white"
            : "bg-slate-950 text-white"
        }`}>

          <div className="text-xs uppercase font-black">

            {hasTie
              ? "Carryover"
              : "Pot"}

          </div>

          <div className="text-6xl font-black mt-2">
            {currentPot}€
          </div>

          <div className="mt-2 text-sm">
            {hasTie
              ? "Tie"
              : winners[0]?.name}
          </div>

        </div>

      </div>

      {/* PLAYERS */}
      <div className="mx-auto max-w-md px-5 mt-6 space-y-4">

        {players.map((player, index) => {

          const result =
            getGolfResult(
              player.score,
              currentPar
            )

          const toPar =
            player.score - currentPar

          return (

            <div
              key={player.name}
              className="bg-white p-5 rounded-3xl shadow"
            >

              <div className="flex justify-between">

                <div>

                  <div className="text-3xl font-black">
                    {player.name}
                  </div>

                  <div
                    className={`mt-2 px-3 py-1 rounded-xl ${result.color}`}
                  >
                    {result.label}
                  </div>

                  <div
                    className={`text-5xl mt-3 ${getToParColor(toPar)}`}
                  >
                    {formatToPar(toPar)}
                  </div>

                </div>

                <div className="flex flex-col items-center gap-3">

                  <button
                    onClick={() =>
                      updateScore(index, player.score + 1)
                    }
                  >+</button>

                  <div
                    className={`text-4xl p-4 rounded-xl ${getScoreStyle(result.label)}`}
                  >
                    {player.score}
                  </div>

                  <button
                    onClick={() =>
                      updateScore(index, player.score - 1)
                    }
                  >−</button>

                </div>

              </div>

            </div>

          )
        })}

      </div>

      {/* FINISH BUTTON */}
      {!matchFinished && (

        <div className="fixed bottom-8 w-full px-5">

          <button
            onClick={finishHole}
            className="w-full bg-emerald-500 text-white font-black py-5 rounded-3xl"
          >
            Loch abschließen
          </button>

        </div>

      )}

      {/* ABORT BUTTON */}
      {!matchFinished && (

        <div className="mx-auto max-w-md px-5 mt-6">

          <button
            onClick={() =>
              setShowAbortModal(true)
            }
            className="w-full text-red-500"
          >
            Match abbrechen
          </button>

        </div>

      )}

      {/* MATCH ABORT MODAL */}
      <AnimatePresence>

        {showAbortModal && (

          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

            <div className="bg-white p-6 rounded-3xl w-full max-w-sm">

              <div className="text-center font-black text-lg">
                Match abbrechen?
              </div>

              <div className="text-center text-sm mt-2 text-slate-400">
                Wird nicht gespeichert
              </div>

              <div className="mt-5">

                <button
                  onClick={() =>
                    setShowAbortModal(false)
                  }
                  className="w-full py-3"
                >
                  Abbrechen
                </button>

                <button
                  onClick={handleAbortMatch}
                  className="w-full text-red-500 py-3 border-t"
                >
                  Löschen
                </button>

              </div>

            </div>

          </div>

        )}

      </AnimatePresence>

    </div>
  )
}