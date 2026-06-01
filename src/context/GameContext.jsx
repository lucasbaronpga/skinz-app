import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

const GameContext =
  createContext()

const STORAGE_KEY =
  "skinz-game"

const courses = [
  {
    id: "westpfalz",

    name:
      "Erster Golfclub Westpfalz",

    location:
      "Westpfalz",

    par:
      72,

    pars: [
      4, 4, 3, 5, 4, 5, 4, 3, 4,
      4, 3, 5, 4, 4, 3, 5, 4, 4,
    ],
  },

  {
    id: "kronberg",

    name:
      "Golf- & Landclub Kronberg",

    location:
      "Kronberg",

    par:
      68,

    pars: [
      4, 3, 4, 4, 4, 3, 4, 4, 4,
      4, 3, 4, 4, 3, 4, 3, 5, 4,
    ],
  },
]

const DEFAULT_COURSE_ID =
  "westpfalz"

function getCourseById(
  courseId
) {

  return (
    courses.find(
      (course) =>
        course.id === courseId
    ) || courses[0]
  )
}

function createCourseSnapshot(
  course
) {

  return {
    id:
      course.id,

    name:
      course.name,

    location:
      course.location,

    par:
      course.par,

    pars:
      course.pars,
  }
}

function normalizeCourseSnapshot(
  course
) {

  if (!course) {
    return createCourseSnapshot(
      getCourseById(
        DEFAULT_COURSE_ID
      )
    )
  }

  const courseId =
    String(
      course.id || ""
    ).toLowerCase()

  const courseName =
    String(
      course.name || ""
    ).toLowerCase()

  if (
    courseId === "kronberg" ||
    courseName.includes(
      "kronberg"
    )
  ) {
    return createCourseSnapshot(
      getCourseById(
        "kronberg"
      )
    )
  }

  if (
    courseId === "westpfalz" ||
    courseName.includes(
      "westpfalz"
    ) ||
    courseName === "course" ||
    courseName === "standard 18"
  ) {
    return createCourseSnapshot(
      getCourseById(
        "westpfalz"
      )
    )
  }

  return createCourseSnapshot(
    getCourseById(
      DEFAULT_COURSE_ID
    )
  )
}

function normalizeCompletedRounds(
  rounds
) {

  return rounds.map(
    (round) => ({

      ...round,

      course:
        normalizeCourseSnapshot(
          round.course
        ),
    })
  )
}

function createMatchId(
  number
) {

  return `SKZ-${String(
    number
  ).padStart(
    4,
    "0"
  )}`
}

function createPlayer(
  name,
  initialScore = 4
) {

  return {
    name,

    score:
      initialScore,

    total:
      0,

    totalToPar:
      0,

    skins:
      0,

    winnings:
      0,

    holes:
      [],
  }
}

const defaultPlayers = [
  createPlayer(
    "Lucas",
    4
  ),
  createPlayer(
    "Ben",
    4
  ),
]

function getGolfResult(
  score,
  par
) {

  const difference =
    score - par

  if (difference === -3) {

    return {
      label:
        "Albatross",

      color:
        "bg-yellow-400 text-black",
    }
  }

  if (difference <= -2) {

    return {
      label:
        "Eagle",

      color:
        "bg-orange-500 text-white",
    }
  }

  if (difference === -1) {

    return {
      label:
        "Birdie",

      color:
        "bg-red-500 text-white",
    }
  }

  if (difference === 0) {

    return {
      label:
        "Par",

      color:
        "bg-white text-slate-900 border border-slate-200",
    }
  }

  if (difference === 1) {

    return {
      label:
        "Bogey",

      color:
        "bg-blue-500 text-white",
    }
  }

  if (difference === 2) {

    return {
      label:
        "Double Bogey",

      color:
        "bg-blue-900 text-white",
    }
  }

  return {
    label:
      "Triple+",

    color:
      "bg-purple-600 text-white",
  }
}

export function GameProvider({
  children,
}) {

  let savedGame =
    null

  try {

    savedGame =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        )
      )

  } catch {

    savedGame =
      null
  }

  const savedCompletedRounds =
    normalizeCompletedRounds(
      savedGame?.completedRounds ||
        []
    )

  const initialMatchCounter =
    savedGame?.matchCounter ||
    savedCompletedRounds.length ||
    0

  const initialSelectedCourseId =
    getCourseById(
      savedGame?.selectedCourseId ||
        DEFAULT_COURSE_ID
    ).id

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState(
    initialSelectedCourseId
  )

  const currentCourse =
    getCourseById(
      selectedCourseId
    )

  const currentPars =
    currentCourse?.pars ||
    courses[0].pars

  const [
    hole,
    setHole,
  ] = useState(
    savedGame?.hole || 1
  )

  const [
    carryover,
    setCarryover,
  ] = useState(
    savedGame?.carryover || 0
  )

  const [
    history,
    setHistory,
  ] = useState(
    savedGame?.history || []
  )

  const [
    players,
    setPlayers,
  ] = useState(
    savedGame?.players ||
      defaultPlayers
  )

  const [
    stake,
    setStake,
  ] = useState(
    savedGame?.stake || 2
  )

  const [
    completedRounds,
    setCompletedRounds,
  ] = useState(
    savedCompletedRounds
  )

  const [
    activeMatchId,
    setActiveMatchId,
  ] = useState(
    savedGame?.activeMatchId ||
      createMatchId(
        initialMatchCounter + 1
      )
  )

  const [
    matchCounter,
    setMatchCounter,
  ] = useState(
    initialMatchCounter
  )

  const [
    celebration,
    setCelebration,
  ] = useState(null)

  const [
    matchFinished,
    setMatchFinished,
  ] = useState(
    savedGame?.matchFinished ||
      false
  )

  const [
    hasActiveMatch,
    setHasActiveMatch,
  ] = useState(
    savedGame?.hasActiveMatch ||
      false
  )

  const currentPar =
    currentPars[hole - 1] || 4

  const lowestScore =
    Math.min(
      ...players.map(
        (player) =>
          player.score
      )
    )

  const winners =
    players.filter(
      (player) =>
        player.score ===
        lowestScore
    )

  const hasTie =
    winners.length > 1

  const currentPot =
    stake + carryover

  useEffect(() => {

    localStorage.setItem(
      STORAGE_KEY,

      JSON.stringify({

        hole,

        carryover,

        history,

        players,

        stake,

        matchFinished,

        hasActiveMatch,

        completedRounds,

        activeMatchId,

        matchCounter,

        selectedCourseId,
      })
    )

  }, [

    hole,

    carryover,

    history,

    players,

    stake,

    matchFinished,

    hasActiveMatch,

    completedRounds,

    activeMatchId,

    matchCounter,

    selectedCourseId,
  ])

  function updateScore(
    index,
    value
  ) {

    if (
      matchFinished ||
      !hasActiveMatch
    ) {
      return
    }

    const updatedPlayers =
      players.map(
        (
          player,
          playerIndex
        ) => {

          if (
            playerIndex !==
            index
          ) {
            return player
          }

          return {
            ...player,

            score:
              Number(
                value
              ),
          }
        }
      )

    setPlayers(
      updatedPlayers
    )
  }

  function startMatch(
    playerNames,
    selectedStake = 2,
    courseId = selectedCourseId
  ) {

    const cleanedNames =
      playerNames
        .map((name) =>
          name.trim()
        )
        .filter(Boolean)

    const uniqueNames =
      [
        ...new Set(
          cleanedNames
        ),
      ]

    if (
      uniqueNames.length < 2
    ) {
      return false
    }

    const matchCourse =
      getCourseById(
        courseId
      )

    const matchPars =
      matchCourse?.pars ||
      courses[0].pars

    const nextCounter =
      matchCounter + 1

    const newMatchId =
      createMatchId(
        nextCounter
      )

    const formattedPlayers =
      uniqueNames.map(
        (name) =>
          createPlayer(
            name,
            matchPars[0] || 4
          )
      )

    setSelectedCourseId(
      matchCourse.id
    )

    setPlayers(
      formattedPlayers
    )

    setStake(
      Number(
        selectedStake
      )
    )

    setHole(1)

    setCarryover(0)

    setHistory([])

    setCelebration(null)

    setMatchFinished(false)

    setHasActiveMatch(true)

    setActiveMatchId(
      newMatchId
    )

    setMatchCounter(
      nextCounter
    )

    return true
  }

  function finishHole() {

    if (
      matchFinished ||
      !hasActiveMatch
    ) {
      return
    }

    const courseSnapshot =
      createCourseSnapshot(
        currentCourse
      )

    const holeResult = {

      hole,

      par:
        currentPar,

      pot:
        currentPot,

      hasTie,

      winner:
        hasTie
          ? "Carryover"
          : winners[0]?.name,

      winningScore:
        lowestScore,

      course:
        {
          id:
            courseSnapshot.id,

          name:
            courseSnapshot.name,
        },

      players:
        players.map(
          (player) => ({

            name:
              player.name,

            score:
              player.score,

            result:
              getGolfResult(
                player.score,
                currentPar
              ),
          })
        ),
    }

    const updatedHistory = [
      ...history,
      holeResult,
    ]

    setHistory(
      updatedHistory
    )

    const updatedPlayers =
      players.map(
        (player) => {

          const isWinner =
            !hasTie &&
            player.name ===
              winners[0]?.name

          const toPar =
            player.score -
            currentPar

          return {

            ...player,

            total:
              player.total +
              player.score,

            totalToPar:
              (
                player.totalToPar ||
                0
              ) + toPar,

            skins:
              isWinner
                ? player.skins + 1
                : player.skins,

            winnings:
              isWinner
                ? player.winnings +
                  currentPot
                : player.winnings,

            holes: [

              ...player.holes,

              {
                hole,

                par:
                  currentPar,

                score:
                  player.score,

                toPar,

                courseId:
                  courseSnapshot.id,

                result:
                  getGolfResult(
                    player.score,
                    currentPar
                  ),
              },
            ],

            score:
              currentPars[hole] ||
              4,
          }
        }
      )

    setPlayers(
      updatedPlayers
    )

    const winningPlayer =
      winners[0]

    if (
      !hasTie &&
      winningPlayer
    ) {

      const winningResult =
        getGolfResult(
          winningPlayer.score,
          currentPar
        )

      setCelebration({

        player:
          winningPlayer.name,

        result:
          winningResult.label,

        color:
          winningResult.color,

        pot:
          currentPot,
      })

      setTimeout(() => {

        setCelebration(null)

      }, 2200)
    }

    if (hasTie) {

      setCarryover(
        carryover + stake
      )

    } else {

      setCarryover(0)
    }

    if (hole >= 18) {

      const finalPlayers =
        updatedPlayers.map(
          (player) => ({

            ...player,

            holes:
              player.holes.map(
                (hole) => ({
                  ...hole,
                })
              ),
          })
        )

      const sortedFinalPlayers =
        [...finalPlayers].sort(
          (a, b) =>
            b.winnings -
              a.winnings ||
            a.totalToPar -
              b.totalToPar
        )

      const champion =
        sortedFinalPlayers[0]

      const completedRound = {

        id:
          activeMatchId,

        date:
          new Date().toLocaleDateString(
            "de-DE"
          ),

        createdAt:
          Date.now(),

        course:
          courseSnapshot,

        winner:
          champion.name,

        winnings:
          champion.winnings,

        skins:
          champion.skins,

        totalToPar:
          champion.totalToPar,

        stake,

        history:
          updatedHistory,

        players:
          finalPlayers,
      }

      setCompletedRounds(
        (prev) => [
          completedRound,
          ...prev,
        ]
      )

      setMatchFinished(true)

      setHasActiveMatch(false)

      setActiveMatchId(
        createMatchId(
          matchCounter + 1
        )
      )

      return
    }

    setHole(
      hole + 1
    )
  }

  function resetGame() {

    setHole(1)

    setCarryover(0)

    setHistory([])

    setCelebration(null)

    setMatchFinished(false)

    setHasActiveMatch(false)

    setStake(2)

    setPlayers(
      defaultPlayers
    )

    setActiveMatchId(
      createMatchId(
        matchCounter + 1
      )
    )
  }

  const uniquePlayerNames =
    [
      ...new Set([

        ...completedRounds.flatMap(
          (round) =>
            round.players.map(
              (player) =>
                player.name
            )
        ),

        ...players.map(
          (player) =>
            player.name
        ),
      ]),
    ]

  const playerStats =
    uniquePlayerNames.map(
      (playerName) => {

        const playerRounds =
          completedRounds.filter(
            (round) =>
              round.players.some(
                (player) =>
                  player.name ===
                  playerName
              )
          )

        const wins =
          completedRounds.filter(
            (round) =>
              round.winner ===
              playerName
          ).length

        const birdies =
          completedRounds.reduce(
            (
              total,
              round
            ) => {

              const roundPlayer =
                round.players.find(
                  (player) =>
                    player.name ===
                    playerName
                )

              const count =
                roundPlayer?.holes?.filter(
                  (hole) =>
                    hole.result
                      ?.label ===
                    "Birdie"
                ).length || 0

              return (
                total + count
              )

            },
            0
          )

        const eagles =
          completedRounds.reduce(
            (
              total,
              round
            ) => {

              const roundPlayer =
                round.players.find(
                  (player) =>
                    player.name ===
                    playerName
                )

              const count =
                roundPlayer?.holes?.filter(
                  (hole) =>
                    hole.result
                      ?.label ===
                    "Eagle"
                ).length || 0

              return (
                total + count
              )

            },
            0
          )

        const totalWinnings =
          completedRounds.reduce(
            (
              total,
              round
            ) => {

              const roundPlayer =
                round.players.find(
                  (player) =>
                    player.name ===
                    playerName
                )

              return (
                total +
                (
                  roundPlayer?.winnings ||
                  0
                )
              )

            },
            0
          )

        const totalToPar =
          completedRounds.reduce(
            (
              total,
              round
            ) => {

              const roundPlayer =
                round.players.find(
                  (player) =>
                    player.name ===
                    playerName
                )

              return (
                total +
                (
                  roundPlayer?.totalToPar ||
                  0
                )
              )

            },
            0
          )

        const avgToPar =
          playerRounds.length > 0
            ? Number(
                (
                  totalToPar /
                  playerRounds.length
                ).toFixed(1)
              )
            : 0

        return {

          name:
            playerName,

          wins,

          birdies,

          eagles,

          totalWinnings,

          totalToPar,

          avgToPar,

          roundsPlayed:
            playerRounds.length,
        }
      }
    )

  return (

    <GameContext.Provider
      value={{

        courses,

        selectedCourseId,
        setSelectedCourseId,

        currentCourse,

        hole,
        setHole,

        currentPar,

        carryover,
        currentPot,

        players,
        setPlayers,

        stake,
        setStake,

        history,

        celebration,

        completedRounds,
        playerStats,

        activeMatchId,
        hasActiveMatch,

        matchFinished,
        setMatchFinished,

        lowestScore,
        winners,
        hasTie,

        updateScore,
        finishHole,

        startMatch,
        resetGame,

        getGolfResult,
      }}
    >

      {children}

    </GameContext.Provider>
  )
}

export function useGame() {

  return useContext(
    GameContext
  )
}