import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const GameContext = createContext(null)

const STORAGE_KEY = "skinz-game"
const DEFAULT_COURSE_ID = "westpfalz"
const DEFAULT_STAKE = 2
const DEFAULT_SCORE = 4
const HOLE_COUNT = 18

export const GAME_MODES = {
  CLASSIC: "classic",
  PROFESSIONAL: "professional",
  WOLFFN: "wolffn",
}

const courses = [
  {
    id: "westpfalz",
    name: "Erster Golfclub Westpfalz",
    location: "Westpfalz",
    par: 72,
    pars: [
      4, 4, 3, 5, 4, 5, 4, 3, 4,
      4, 3, 5, 4, 4, 3, 5, 4, 4,
    ],
  },
  {
    id: "kronberg",
    name: "Golf- & Landclub Kronberg",
    location: "Kronberg",
    par: 68,
    pars: [
      4, 3, 4, 4, 4, 3, 4, 4, 4,
      4, 3, 4, 4, 3, 4, 3, 5, 4,
    ],
  },
]

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function normalizeStake(value) {
  const stake =
    roundMoney(value)

  return stake > 0
    ? stake
    : DEFAULT_STAKE
}

export function getGameModeLabel(gameMode) {
  if (gameMode === GAME_MODES.WOLFFN) {
    return "Wolffn"
  }

  if (gameMode === GAME_MODES.PROFESSIONAL) {
    return "Skinz Professional"
  }

  return "Classic Skinz"
}

function normalizeGameMode(value, specialScoringEnabled = false) {
  if (value === GAME_MODES.WOLFFN) {
    return GAME_MODES.WOLFFN
  }

  if (value === GAME_MODES.PROFESSIONAL) {
    return GAME_MODES.PROFESSIONAL
  }

  if (value === GAME_MODES.CLASSIC) {
    return GAME_MODES.CLASSIC
  }

  if (specialScoringEnabled) {
    return GAME_MODES.PROFESSIONAL
  }

  return GAME_MODES.CLASSIC
}

function isProfessionalGameMode(gameMode) {
  return gameMode === GAME_MODES.PROFESSIONAL
}

function isWolffnGameMode(gameMode) {
  return gameMode === GAME_MODES.WOLFFN
}

function getCourseById(courseId) {
  return (
    courses.find((course) => course.id === courseId) ||
    courses[0]
  )
}

function createCourseSnapshot(course) {
  const fallbackCourse =
    getCourseById(DEFAULT_COURSE_ID)

  const safeCourse =
    course || fallbackCourse

  return {
    id: safeCourse.id,
    name: safeCourse.name,
    location: safeCourse.location,
    par: safeCourse.par,
    pars: [...safeCourse.pars],
  }
}

function normalizeCourseSnapshot(course) {
  if (!course) {
    return createCourseSnapshot(
      getCourseById(DEFAULT_COURSE_ID)
    )
  }

  const courseId =
    String(course.id || "").toLowerCase()

  const courseName =
    String(course.name || "").toLowerCase()

  if (
    courseId === "kronberg" ||
    courseName.includes("kronberg")
  ) {
    return createCourseSnapshot(
      getCourseById("kronberg")
    )
  }

  if (
    courseId === "westpfalz" ||
    courseName.includes("westpfalz")
  ) {
    return createCourseSnapshot(
      getCourseById("westpfalz")
    )
  }

  return createCourseSnapshot(
    getCourseById(DEFAULT_COURSE_ID)
  )
}

function createMatchId(number) {
  return `SKZ-${String(number).padStart(4, "0")}`
}

function createPlayer(name, initialScore = DEFAULT_SCORE) {
  return {
    name: String(name || "Player").trim() || "Player",
    score: toNumber(initialScore, DEFAULT_SCORE),
    total: 0,
    totalToPar: 0,
    skins: 0,
    winnings: 0,
    holes: [],
  }
}

function createDefaultPlayers() {
  return [
    createPlayer("Lucas", DEFAULT_SCORE),
    createPlayer("Ben", DEFAULT_SCORE),
  ]
}

function normalizePlayer(player, fallbackScore = DEFAULT_SCORE) {
  return {
    name:
      String(player?.name || "Player").trim() ||
      "Player",

    score:
      toNumber(player?.score, fallbackScore),

    total:
      toNumber(player?.total, 0),

    totalToPar:
      toNumber(player?.totalToPar, 0),

    skins:
      toNumber(player?.skins, 0),

    winnings:
      roundMoney(player?.winnings),

    holes:
      Array.isArray(player?.holes)
        ? player.holes.map((hole) => ({
            ...hole,
            winningsDelta:
              hole?.winningsDelta !== undefined
                ? roundMoney(hole.winningsDelta)
                : hole?.winningsDelta,
          }))
        : [],
  }
}

function normalizeCompletedRounds(rounds) {
  if (!Array.isArray(rounds)) {
    return []
  }

  return rounds.map((round) => {
    const specialScoringEnabled =
      Boolean(
        round.specialScoringEnabled ||
        round.bonusSkinsEnabled ||
        round.eagleBonusEnabled
      )

    const gameMode =
      normalizeGameMode(
        round.gameMode,
        specialScoringEnabled
      )

    const normalizedSpecialScoringEnabled =
      isProfessionalGameMode(gameMode)

    return {
      ...round,

      gameMode,
      gameModeLabel:
        round.gameModeLabel ||
        getGameModeLabel(gameMode),

      course:
        normalizeCourseSnapshot(round.course),

      players:
        Array.isArray(round.players)
          ? round.players.map((player) =>
              normalizePlayer(player)
            )
          : [],

      history:
        Array.isArray(round.history)
          ? round.history.map((item) => ({
              ...item,
              pot:
                item?.pot !== undefined
                  ? roundMoney(item.pot)
                  : item?.pot,
            }))
          : [],

      stake:
        normalizeStake(round.stake),

      winnings:
        roundMoney(round.winnings),

      skins:
        toNumber(round.skins, 0),

      totalToPar:
        toNumber(round.totalToPar, 0),

      specialScoringEnabled:
        normalizedSpecialScoringEnabled,

      bonusSkinsEnabled:
        normalizedSpecialScoringEnabled,
    }
  })
}

function getGolfResult(score, par) {
  const difference =
    toNumber(score, DEFAULT_SCORE) -
    toNumber(par, DEFAULT_SCORE)

  if (difference === -3) {
    return {
      label: "Albatross",
      color: "bg-yellow-400 text-black",
    }
  }

  if (difference <= -2) {
    return {
      label: "Eagle",
      color: "bg-orange-500 text-white",
    }
  }

  if (difference === -1) {
    return {
      label: "Birdie",
      color: "bg-red-500 text-white",
    }
  }

  if (difference === 0) {
    return {
      label: "Par",
      color: "bg-white text-slate-900 border border-slate-200",
    }
  }

  if (difference === 1) {
    return {
      label: "Bogey",
      color: "bg-blue-500 text-white",
    }
  }

  if (difference === 2) {
    return {
      label: "Double Bogey",
      color: "bg-blue-900 text-white",
    }
  }

  return {
    label: "Triple+",
    color: "bg-purple-600 text-white",
  }
}

function getBaseSkinsForScore(
  score,
  par,
  isSpecialScoringEnabled = false
) {
  if (!isSpecialScoringEnabled) {
    return 1
  }

  const difference =
    toNumber(score, DEFAULT_SCORE) -
    toNumber(par, DEFAULT_SCORE)

  if (difference <= -2) {
    return 3
  }

  if (difference === -1) {
    return 2
  }

  return 1
}

function getBonusSkinsForScore(
  score,
  par,
  isSpecialScoringEnabled = false
) {
  const baseSkins =
    getBaseSkinsForScore(
      score,
      par,
      isSpecialScoringEnabled
    )

  return Math.max(baseSkins - 1, 0)
}

function getSpecialScoringLabel(
  score,
  par,
  isSpecialScoringEnabled = false
) {
  if (!isSpecialScoringEnabled) {
    return null
  }

  const difference =
    toNumber(score, DEFAULT_SCORE) -
    toNumber(par, DEFAULT_SCORE)

  if (difference <= -2) {
    return "Eagle 3 Skins"
  }

  if (difference === -1) {
    return "Birdie 2 Skins"
  }

  return null
}

function getPlayerByName(players, playerName) {
  return (
    players.find(
      (player) => player.name === playerName
    ) || null
  )
}

function getTeamBestScore(team, players) {
  const teamPlayers =
    Array.isArray(team)
      ? team
          .map((playerName) =>
            getPlayerByName(players, playerName)
          )
          .filter(Boolean)
      : []

  if (teamPlayers.length === 0) {
    return null
  }

  return Math.min(
    ...teamPlayers.map((player) =>
      toNumber(player.score, DEFAULT_SCORE)
    )
  )
}

function getWolffnScoreMultiplier(score, par) {
  const difference =
    toNumber(score, DEFAULT_SCORE) -
    toNumber(par, DEFAULT_SCORE)

  if (difference <= -2) {
    return {
      multiplier: 4,
      label: "Eagle x4",
      resultLabel: "Eagle",
    }
  }

  if (difference === -1) {
    return {
      multiplier: 2,
      label: "Birdie x2",
      resultLabel: "Birdie",
    }
  }

  return {
    multiplier: 1,
    label: null,
    resultLabel: getGolfResult(score, par).label,
  }
}

function getWolffnMultiplier(wolffnSetup, winningScore, par) {
  const isOneVsThree =
    wolffnSetup?.format === "1v3"

  const wolffnMultiplier =
    isOneVsThree ? 2 : 1

  const scoreMultiplier =
    getWolffnScoreMultiplier(
      winningScore,
      par
    )

  return {
    wolffnMultiplier,
    scoreMultiplier:
      scoreMultiplier.multiplier,
    scoreMultiplierLabel:
      scoreMultiplier.label,
    resultLabel:
      scoreMultiplier.resultLabel,
    currentHoleValue:
      wolffnMultiplier *
      scoreMultiplier.multiplier,
  }
}

function calculateWolffnHole({
  players,
  par,
  carryover,
  stake,
  wolffnSetup,
}) {
  if (
    !wolffnSetup ||
    !Array.isArray(wolffnSetup.teamA) ||
    !Array.isArray(wolffnSetup.teamB) ||
    wolffnSetup.teamA.length === 0 ||
    wolffnSetup.teamB.length === 0
  ) {
    return null
  }

  const teamAScore =
    getTeamBestScore(
      wolffnSetup.teamA,
      players
    )

  const teamBScore =
    getTeamBestScore(
      wolffnSetup.teamB,
      players
    )

  if (
    teamAScore === null ||
    teamBScore === null
  ) {
    return null
  }

  const hasTie =
    teamAScore === teamBScore

  const winningScore =
    Math.min(teamAScore, teamBScore)

  const multiplierInfo =
    getWolffnMultiplier(
      wolffnSetup,
      winningScore,
      par
    )

  const currentHoleValue =
    multiplierInfo.currentHoleValue

  const nextCarryover =
    hasTie
      ? carryover + currentHoleValue
      : 0

  const totalSkins =
    hasTie
      ? 0
      : carryover + currentHoleValue

  const winningTeam =
    hasTie
      ? []
      : teamAScore < teamBScore
      ? wolffnSetup.teamA
      : wolffnSetup.teamB

  const losingTeam =
    hasTie
      ? []
      : teamAScore < teamBScore
      ? wolffnSetup.teamB
      : wolffnSetup.teamA

  const winnerLabel =
    hasTie
      ? "Carryover"
      : winningTeam.join(" + ")

  const teamPot =
    hasTie
      ? roundMoney(
          nextCarryover *
            stake *
            Math.max(players.length - 1, 1)
        )
      : roundMoney(
          totalSkins *
            stake *
            winningTeam.length *
            losingTeam.length
        )

  return {
    hasTie,
    teamAScore,
    teamBScore,
    winningScore,
    winningTeam,
    losingTeam,
    winnerLabel,
    nextCarryover,
    totalSkins,
    currentHoleValue,
    teamPot,
    multiplierInfo,
  }
}

function getSavedGame() {
  try {
    const savedGame =
      localStorage.getItem(STORAGE_KEY)

    if (!savedGame) {
      return null
    }

    return JSON.parse(savedGame)
  } catch {
    localStorage.removeItem(STORAGE_KEY)

    return null
  }
}

function createInitialGameState() {
  const savedGame = getSavedGame()

  const completedRounds =
    normalizeCompletedRounds(
      savedGame?.completedRounds || []
    )

  const matchCounter =
    toNumber(
      savedGame?.matchCounter,
      completedRounds.length || 0
    )

  const selectedCourseId =
    getCourseById(
      savedGame?.selectedCourseId || DEFAULT_COURSE_ID
    ).id

  const currentCourse =
    getCourseById(selectedCourseId)

  const currentPars =
    currentCourse?.pars || courses[0].pars

  const players =
    Array.isArray(savedGame?.players) &&
    savedGame.players.length > 0
      ? savedGame.players.map((player) =>
          normalizePlayer(
            player,
            currentPars[0] || DEFAULT_SCORE
          )
        )
      : createDefaultPlayers()

  const savedSpecialScoringEnabled =
    Boolean(
      savedGame?.specialScoringEnabled ||
      savedGame?.bonusSkinsEnabled ||
      savedGame?.eagleBonusEnabled
    )

  const gameMode =
    normalizeGameMode(
      savedGame?.gameMode,
      savedSpecialScoringEnabled
    )

  const specialScoringEnabled =
    isProfessionalGameMode(gameMode)

  return {
    selectedCourseId,

    hole:
      Math.min(
        Math.max(toNumber(savedGame?.hole, 1), 1),
        HOLE_COUNT
      ),

    carryover:
      toNumber(savedGame?.carryover, 0),

    history:
      Array.isArray(savedGame?.history)
        ? savedGame.history.map((item) => ({
            ...item,
            pot:
              item?.pot !== undefined
                ? roundMoney(item.pot)
                : item?.pot,
          }))
        : [],

    players,

    stake:
      normalizeStake(savedGame?.stake ?? DEFAULT_STAKE),

    completedRounds,

    activeMatchId:
      savedGame?.activeMatchId ||
      createMatchId(matchCounter + 1),

    matchCounter,

    matchFinished:
      Boolean(savedGame?.matchFinished),

    hasActiveMatch:
      Boolean(savedGame?.hasActiveMatch),

    gameMode,

    specialScoringEnabled,
  }
}

export function GameProvider({ children }) {
  const initialState =
    useMemo(
      () => createInitialGameState(),
      []
    )

  const [selectedCourseId, setSelectedCourseId] =
    useState(initialState.selectedCourseId)

  const [hole, setHole] =
    useState(initialState.hole)

  const [carryover, setCarryover] =
    useState(initialState.carryover)

  const [history, setHistory] =
    useState(initialState.history)

  const [players, setPlayers] =
    useState(initialState.players)

  const [stake, setStakeState] =
    useState(initialState.stake)

  const [completedRounds, setCompletedRounds] =
    useState(initialState.completedRounds)

  const [activeMatchId, setActiveMatchId] =
    useState(initialState.activeMatchId)

  const [matchCounter, setMatchCounter] =
    useState(initialState.matchCounter)

  const [celebration, setCelebration] =
    useState(null)

  const [matchFinished, setMatchFinished] =
    useState(initialState.matchFinished)

  const [hasActiveMatch, setHasActiveMatch] =
    useState(initialState.hasActiveMatch)

  const [gameMode, setGameModeState] =
    useState(initialState.gameMode)

  const [
    specialScoringEnabled,
    setSpecialScoringEnabledState,
  ] = useState(initialState.specialScoringEnabled)

  const currentCourse =
    getCourseById(selectedCourseId)

  const currentPars =
    currentCourse?.pars || courses[0].pars

  const currentPar =
    currentPars[hole - 1] || DEFAULT_SCORE

  const isWolffnMode =
    isWolffnGameMode(gameMode)

  const isProfessionalMode =
    isProfessionalGameMode(gameMode)

  const gameModeLabel =
    getGameModeLabel(gameMode)

  const setStake = useCallback((value) => {
    setStakeState((currentStake) => {
      const nextStake =
        typeof value === "function"
          ? value(currentStake)
          : value

      return normalizeStake(nextStake)
    })
  }, [])

  const setGameMode = useCallback((nextGameMode) => {
    const normalizedGameMode =
      normalizeGameMode(nextGameMode)

    setGameModeState(normalizedGameMode)
    setSpecialScoringEnabledState(
      isProfessionalGameMode(normalizedGameMode)
    )
  }, [])

  const setSpecialScoringEnabled = useCallback((value) => {
    setSpecialScoringEnabledState((currentValue) => {
      const nextValue =
        typeof value === "function"
          ? Boolean(value(currentValue))
          : Boolean(value)

      setGameModeState(
        nextValue
          ? GAME_MODES.PROFESSIONAL
          : GAME_MODES.CLASSIC
      )

      return nextValue
    })
  }, [])

  const lowestScore =
    players.length > 0
      ? Math.min(
          ...players.map((player) =>
            toNumber(player.score, 0)
          )
        )
      : 0

  const winners =
    players.filter(
      (player) =>
        toNumber(player.score, 0) === lowestScore
    )

  const hasTie =
    winners.length > 1

  const currentBaseSkins =
    players.length > 0
      ? getBaseSkinsForScore(
          lowestScore,
          currentPar,
          specialScoringEnabled
        )
      : 1

  const currentBonusSkins =
    !hasTie && winners[0]
      ? getBonusSkinsForScore(
          winners[0].score,
          currentPar,
          specialScoringEnabled
        )
      : 0

  const currentSkinsAtStake =
    carryover + currentBaseSkins

  const currentPot =
    roundMoney(
      currentSkinsAtStake *
        stake *
        Math.max(players.length - 1, 1)
    )

  useEffect(() => {
    try {
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
          gameMode,
          gameModeLabel,
          specialScoringEnabled,
          bonusSkinsEnabled: specialScoringEnabled,
        })
      )
    } catch {
      // localStorage kann z. B. im Private Mode oder bei vollem Speicher fehlschlagen.
    }
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
    gameMode,
    gameModeLabel,
    specialScoringEnabled,
  ])

  const updateScore = useCallback(
    (index, value) => {
      if (matchFinished || !hasActiveMatch) {
        return
      }

      setPlayers((currentPlayers) =>
        currentPlayers.map((player, playerIndex) => {
          if (playerIndex !== index) {
            return player
          }

          return {
            ...player,
            score: toNumber(value, currentPar),
          }
        })
      )
    },
    [
      matchFinished,
      hasActiveMatch,
      currentPar,
    ]
  )

  const startMatch = useCallback(
    (
      playerNames,
      selectedStake = DEFAULT_STAKE,
      courseId = selectedCourseId,
      selectedSpecialScoringEnabledOrGameMode = false,
      selectedGameMode
    ) => {
      const cleanedNames =
        Array.isArray(playerNames)
          ? playerNames
              .map((name) => String(name || "").trim())
              .filter(Boolean)
          : []

      const uniqueNames =
        [...new Set(cleanedNames)]

      if (uniqueNames.length < 2) {
        return false
      }

      const requestedGameMode =
        selectedGameMode !== undefined
          ? selectedGameMode
          : typeof selectedSpecialScoringEnabledOrGameMode === "string"
          ? selectedSpecialScoringEnabledOrGameMode
          : null

      const requestedSpecialScoringEnabled =
        typeof selectedSpecialScoringEnabledOrGameMode === "boolean"
          ? selectedSpecialScoringEnabledOrGameMode
          : false

      const nextGameMode =
        normalizeGameMode(
          requestedGameMode,
          requestedSpecialScoringEnabled
        )

      if (
        isWolffnGameMode(nextGameMode) &&
        uniqueNames.length !== 4
      ) {
        return false
      }

      const nextSpecialScoringEnabled =
        isProfessionalGameMode(nextGameMode)

      const matchCourse =
        getCourseById(courseId)

      const matchPars =
        matchCourse?.pars || courses[0].pars

      const nextCounter =
        matchCounter + 1

      const newMatchId =
        createMatchId(nextCounter)

      const formattedPlayers =
        uniqueNames.map((name) =>
          createPlayer(
            name,
            matchPars[0] || DEFAULT_SCORE
          )
        )

      setSelectedCourseId(matchCourse.id)
      setPlayers(formattedPlayers)
      setStakeState(normalizeStake(selectedStake))
      setHole(1)
      setCarryover(0)
      setHistory([])
      setCelebration(null)
      setMatchFinished(false)
      setHasActiveMatch(true)
      setGameModeState(nextGameMode)
      setSpecialScoringEnabledState(nextSpecialScoringEnabled)
      setActiveMatchId(newMatchId)
      setMatchCounter(nextCounter)

      return true
    },
    [
      selectedCourseId,
      matchCounter,
    ]
  )

  const finishHole = useCallback(
    (wolffnSetup = null) => {
      if (matchFinished || !hasActiveMatch) {
        return
      }

      const courseSnapshot =
        createCourseSnapshot(currentCourse)

      if (isWolffnMode) {
        const wolffnResult =
          calculateWolffnHole({
            players,
            par: currentPar,
            carryover,
            stake,
            wolffnSetup,
          })

        if (!wolffnResult) {
          return
        }

        const winningResult =
          getGolfResult(
            wolffnResult.winningScore,
            currentPar
          )

        const nextCarryover =
          wolffnResult.nextCarryover

        const totalSkins =
          wolffnResult.totalSkins

        const holeResult = {
          hole,
          par: currentPar,

          gameMode,
          gameModeLabel,

          wolffnSetup,
          wolffnFormat:
            wolffnSetup.format,
          wolffnPlayer:
            wolffnSetup.wolffnPlayer || null,
          wolffnTeamA:
            wolffnSetup.teamA,
          wolffnTeamB:
            wolffnSetup.teamB,

          pot:
            roundMoney(wolffnResult.teamPot),

          skins:
            wolffnResult.hasTie
              ? nextCarryover
              : totalSkins,

          baseSkins: 1,

          currentHoleValue:
            wolffnResult.currentHoleValue,

          wolffnMultiplier:
            wolffnResult.multiplierInfo.wolffnMultiplier,

          scoreMultiplier:
            wolffnResult.multiplierInfo.scoreMultiplier,

          scoreMultiplierLabel:
            wolffnResult.multiplierInfo.scoreMultiplierLabel,

          bonusSkins:
            Math.max(
              wolffnResult.currentHoleValue - 1,
              0
            ),

          carryoverSkins:
            carryover,

          carryoverAdded:
            wolffnResult.hasTie
              ? wolffnResult.currentHoleValue
              : 0,

          hasTie:
            wolffnResult.hasTie,

          specialScoringEnabled: false,
          specialScoringApplied: false,
          specialScoringLabel: null,
          bonusSkinsEnabled: false,
          bonusResult:
            wolffnResult.multiplierInfo.scoreMultiplierLabel,

          winningResult:
            winningResult.label,

          eagleBonusApplied: false,

          winner:
            wolffnResult.winnerLabel,

          winningScore:
            wolffnResult.winningScore,

          course: {
            id: courseSnapshot.id,
            name: courseSnapshot.name,
          },

          players:
            players.map((player) => ({
              name: player.name,
              score: player.score,
              result: getGolfResult(
                player.score,
                currentPar
              ),
            })),
        }

        const updatedHistory = [
          ...history,
          holeResult,
        ]

        const updatedPlayers =
          players.map((player) => {
            const playerScore =
              toNumber(player.score, currentPar)

            const toPar =
              playerScore - currentPar

            const isOnWinningTeam =
              wolffnResult.winningTeam.includes(player.name)

            const isOnLosingTeam =
              wolffnResult.losingTeam.includes(player.name)

            const skinDelta =
              wolffnResult.hasTie
                ? 0
                : isOnWinningTeam
                ? totalSkins * wolffnResult.losingTeam.length
                : isOnLosingTeam
                ? -totalSkins * wolffnResult.winningTeam.length
                : 0

            const winningsDelta =
              roundMoney(skinDelta * stake)

            return {
              ...player,

              total:
                toNumber(player.total, 0) + playerScore,

              totalToPar:
                toNumber(player.totalToPar, 0) + toPar,

              skins:
                toNumber(player.skins, 0) + skinDelta,

              winnings:
                roundMoney(
                  toNumber(player.winnings, 0) +
                  winningsDelta
                ),

              holes: [
                ...(Array.isArray(player.holes)
                  ? player.holes
                  : []),

                {
                  hole,
                  par: currentPar,
                  score: playerScore,
                  toPar,
                  courseId: courseSnapshot.id,

                  gameMode,
                  gameModeLabel,

                  wolffnSetup,
                  wolffnFormat:
                    wolffnSetup.format,
                  wolffnPlayer:
                    wolffnSetup.wolffnPlayer || null,
                  wolffnTeamA:
                    wolffnSetup.teamA,
                  wolffnTeamB:
                    wolffnSetup.teamB,

                  result:
                    getGolfResult(
                      playerScore,
                      currentPar
                    ),

                  skinDelta,
                  winningsDelta,

                  totalSkins:
                    wolffnResult.hasTie
                      ? 0
                      : totalSkins,

                  baseSkins: 1,

                  currentHoleValue:
                    wolffnResult.currentHoleValue,

                  carryoverAdded:
                    wolffnResult.hasTie
                      ? wolffnResult.currentHoleValue
                      : 0,

                  specialScoringEnabled: false,
                  specialScoringApplied: false,
                  specialScoringLabel: null,
                  bonusSkinsEnabled: false,
                  bonusResult:
                    wolffnResult.multiplierInfo.scoreMultiplierLabel,

                  winningResult:
                    winningResult.label,

                  eagleBonusApplied: false,
                },
              ],

              score:
                currentPars[hole] || DEFAULT_SCORE,
            }
          })

        setHistory(updatedHistory)
        setPlayers(updatedPlayers)

        if (wolffnResult.hasTie) {
          setCarryover(nextCarryover)
        } else {
          setCarryover(0)

          setCelebration({
            player:
              wolffnResult.winnerLabel,
            result:
              winningResult.label,
            color:
              winningResult.color,
            pot:
              roundMoney(wolffnResult.teamPot),
            skins:
              totalSkins,
            baseSkins: 1,
            bonusSkins:
              Math.max(
                wolffnResult.currentHoleValue - 1,
                0
              ),

            gameMode,
            gameModeLabel,

            wolffnSetup,
            wolffnFormat:
              wolffnSetup.format,
            wolffnPlayer:
              wolffnSetup.wolffnPlayer || null,

            specialScoringEnabled: false,
            specialScoringApplied: false,
            specialScoringLabel: null,
            bonusSkinsEnabled: false,
            bonusResult:
              wolffnResult.multiplierInfo.scoreMultiplierLabel,
            winningResult:
              winningResult.label,
            eagleBonusApplied: false,
          })

          window.setTimeout(() => {
            setCelebration(null)
          }, 2200)
        }

        if (hole >= HOLE_COUNT) {
          const finalPlayers =
            updatedPlayers.map((player) => ({
              ...player,
              holes:
                Array.isArray(player.holes)
                  ? player.holes.map((playedHole) => ({
                      ...playedHole,
                    }))
                  : [],
            }))

          const sortedFinalPlayers =
            [...finalPlayers].sort(
              (a, b) =>
                b.winnings - a.winnings ||
                a.totalToPar - b.totalToPar
            )

          const champion =
            sortedFinalPlayers[0]

          const completedRound = {
            id: activeMatchId,
            date:
              new Date().toLocaleDateString("de-DE"),
            createdAt:
              Date.now(),
            course:
              courseSnapshot,
            gameMode,
            gameModeLabel,
            winner:
              champion?.name || "Unbekannt",
            winnings:
              roundMoney(champion?.winnings || 0),
            skins:
              champion?.skins || 0,
            totalToPar:
              champion?.totalToPar || 0,
            stake:
              normalizeStake(stake),
            specialScoringEnabled: false,
            bonusSkinsEnabled: false,
            history: updatedHistory,
            players: finalPlayers,
          }

          setCompletedRounds((previousRounds) => [
            completedRound,
            ...previousRounds,
          ])

          setMatchFinished(true)
          setHasActiveMatch(false)

          setActiveMatchId(
            createMatchId(matchCounter + 1)
          )

          return
        }

        setHole(hole + 1)
        return
      }

      const winner =
        !hasTie ? winners[0] : null

      const winningResult =
        getGolfResult(
          lowestScore,
          currentPar
        )

      const tieBaseSkins =
        getBaseSkinsForScore(
          lowestScore,
          currentPar,
          specialScoringEnabled
        )

      const winnerBaseSkins =
        winner
          ? getBaseSkinsForScore(
              winner.score,
              currentPar,
              specialScoringEnabled
            )
          : 1

      const baseSkins =
        hasTie
          ? tieBaseSkins
          : winnerBaseSkins

      const bonusSkins =
        !hasTie && winner
          ? getBonusSkinsForScore(
              winner.score,
              currentPar,
              specialScoringEnabled
            )
          : 0

      const specialScoringLabel =
        getSpecialScoringLabel(
          lowestScore,
          currentPar,
          specialScoringEnabled
        )

      const bonusResult =
        specialScoringLabel

      const specialScoringApplied =
        Boolean(
          specialScoringEnabled &&
            !hasTie &&
            specialScoringLabel &&
            bonusSkins > 0
        )

      const nextCarryover =
        hasTie
          ? carryover + baseSkins
          : 0

      const totalSkins =
        hasTie
          ? 0
          : winnerBaseSkins + carryover

      const opponentCount =
        Math.max(players.length - 1, 1)

      const totalWinnerPot =
        roundMoney(totalSkins * stake * opponentCount)

      const carryoverPot =
        roundMoney(nextCarryover * stake * opponentCount)

      const holeResult = {
        hole,
        par: currentPar,

        gameMode,
        gameModeLabel,

        pot:
          hasTie
            ? carryoverPot
            : totalWinnerPot,

        skins:
          hasTie
            ? nextCarryover
            : totalSkins,

        baseSkins,

        bonusSkins:
          hasTie
            ? 0
            : bonusSkins,

        carryoverSkins:
          carryover,

        carryoverAdded:
          hasTie
            ? baseSkins
            : 0,

        hasTie,

        specialScoringEnabled,
        specialScoringApplied,
        specialScoringLabel,

        bonusSkinsEnabled:
          specialScoringEnabled,

        bonusResult,

        winningResult:
          winningResult.label,

        eagleBonusApplied:
          specialScoringApplied &&
          specialScoringLabel === "Eagle 3 Skins",

        winner:
          hasTie
            ? "Carryover"
            : winner?.name,

        winningScore:
          lowestScore,

        course: {
          id: courseSnapshot.id,
          name: courseSnapshot.name,
        },

        players:
          players.map((player) => ({
            name: player.name,
            score: player.score,
            result: getGolfResult(
              player.score,
              currentPar
            ),
          })),
      }

      const updatedHistory = [
        ...history,
        holeResult,
      ]

      const updatedPlayers =
        players.map((player) => {
          const playerScore =
            toNumber(player.score, currentPar)

          const toPar =
            playerScore - currentPar

          const isWinner =
            !hasTie &&
            winner &&
            player.name === winner.name

          const skinDelta =
            hasTie
              ? 0
              : isWinner
              ? totalSkins * opponentCount
              : -totalSkins

          const winningsDelta =
            roundMoney(skinDelta * stake)

          const playerSpecialScoringApplied =
            Boolean(isWinner && specialScoringApplied)

          const playerSpecialScoringLabel =
            playerSpecialScoringApplied
              ? specialScoringLabel
              : null

          const playerBonusSkins =
            playerSpecialScoringApplied
              ? bonusSkins
              : 0

          return {
            ...player,

            total:
              toNumber(player.total, 0) + playerScore,

            totalToPar:
              toNumber(player.totalToPar, 0) + toPar,

            skins:
              toNumber(player.skins, 0) + skinDelta,

            winnings:
              roundMoney(
                toNumber(player.winnings, 0) +
                winningsDelta
              ),

            holes: [
              ...(Array.isArray(player.holes)
                ? player.holes
                : []),

              {
                hole,
                par: currentPar,
                score: playerScore,
                toPar,
                courseId: courseSnapshot.id,

                gameMode,
                gameModeLabel,

                result:
                  getGolfResult(
                    playerScore,
                    currentPar
                  ),

                skinDelta,
                winningsDelta,

                totalSkins:
                  hasTie
                    ? 0
                    : totalSkins,

                baseSkins,

                bonusSkins:
                  playerBonusSkins,

                carryoverAdded:
                  hasTie
                    ? baseSkins
                    : 0,

                specialScoringEnabled,

                specialScoringApplied:
                  playerSpecialScoringApplied,

                specialScoringLabel:
                  playerSpecialScoringLabel,

                bonusSkinsEnabled:
                  specialScoringEnabled,

                bonusResult:
                  playerSpecialScoringLabel,

                winningResult:
                  winningResult.label,

                eagleBonusApplied:
                  playerSpecialScoringApplied &&
                  playerSpecialScoringLabel === "Eagle 3 Skins",
              },
            ],

            score:
              currentPars[hole] || DEFAULT_SCORE,
          }
        })

      setHistory(updatedHistory)
      setPlayers(updatedPlayers)

      if (hasTie) {
        setCarryover(nextCarryover)
      } else {
        setCarryover(0)

        if (winner) {
          const winnerResult =
            getGolfResult(
              winner.score,
              currentPar
            )

          const winnerSpecialScoringLabel =
            getSpecialScoringLabel(
              winner.score,
              currentPar,
              specialScoringEnabled
            )

          const winnerBonusSkins =
            getBonusSkinsForScore(
              winner.score,
              currentPar,
              specialScoringEnabled
            )

          const winnerSpecialScoringApplied =
            Boolean(
              specialScoringEnabled &&
                winnerSpecialScoringLabel &&
                winnerBonusSkins > 0
            )

          setCelebration({
            player: winner.name,
            result: winnerResult.label,
            color: winnerResult.color,
            pot: totalWinnerPot,
            skins: totalSkins,
            baseSkins: winnerBaseSkins,
            bonusSkins: winnerBonusSkins,

            gameMode,
            gameModeLabel,

            specialScoringEnabled,
            specialScoringApplied:
              winnerSpecialScoringApplied,
            specialScoringLabel:
              winnerSpecialScoringApplied
                ? winnerSpecialScoringLabel
                : null,
            bonusSkinsEnabled:
              specialScoringEnabled,
            bonusResult:
              winnerSpecialScoringApplied
                ? winnerSpecialScoringLabel
                : null,
            winningResult:
              winnerResult.label,
            eagleBonusApplied:
              winnerSpecialScoringApplied &&
              winnerSpecialScoringLabel === "Eagle 3 Skins",
          })

          window.setTimeout(() => {
            setCelebration(null)
          }, 2200)
        }
      }

      if (hole >= HOLE_COUNT) {
        const finalPlayers =
          updatedPlayers.map((player) => ({
            ...player,
            holes:
              Array.isArray(player.holes)
                ? player.holes.map((playedHole) => ({
                    ...playedHole,
                  }))
                : [],
          }))

        const sortedFinalPlayers =
          [...finalPlayers].sort(
            (a, b) =>
              b.winnings - a.winnings ||
              a.totalToPar - b.totalToPar
          )

        const champion =
          sortedFinalPlayers[0]

        const completedRound = {
          id: activeMatchId,
          date:
            new Date().toLocaleDateString("de-DE"),
          createdAt:
            Date.now(),
          course:
            courseSnapshot,
          gameMode,
          gameModeLabel,
          winner:
            champion?.name || "Unbekannt",
          winnings:
            roundMoney(champion?.winnings || 0),
          skins:
            champion?.skins || 0,
          totalToPar:
            champion?.totalToPar || 0,
          stake:
            normalizeStake(stake),
          specialScoringEnabled,
          bonusSkinsEnabled: specialScoringEnabled,
          history: updatedHistory,
          players: finalPlayers,
        }

        setCompletedRounds((previousRounds) => [
          completedRound,
          ...previousRounds,
        ])

        setMatchFinished(true)
        setHasActiveMatch(false)

        setActiveMatchId(
          createMatchId(matchCounter + 1)
        )

        return
      }

      setHole(hole + 1)
    },
    [
      matchFinished,
      hasActiveMatch,
      currentCourse,
      isWolffnMode,
      players,
      currentPar,
      carryover,
      stake,
      hole,
      gameMode,
      gameModeLabel,
      history,
      currentPars,
      activeMatchId,
      matchCounter,
      hasTie,
      winners,
      specialScoringEnabled,
      lowestScore,
    ]
  )

  const resetGame = useCallback(
    () => {
      setHole(1)
      setCarryover(0)
      setHistory([])
      setCelebration(null)
      setMatchFinished(false)
      setHasActiveMatch(false)
      setGameModeState(GAME_MODES.CLASSIC)
      setSpecialScoringEnabledState(false)
      setStakeState(DEFAULT_STAKE)
      setPlayers(createDefaultPlayers())

      setActiveMatchId(
        createMatchId(matchCounter + 1)
      )
    },
    [
      matchCounter,
    ]
  )

  const uniquePlayerNames =
    useMemo(() => {
      return [
        ...new Set([
          ...completedRounds.flatMap((round) =>
            Array.isArray(round.players)
              ? round.players.map((player) => player.name)
              : []
          ),

          ...players.map((player) => player.name),
        ]),
      ].filter(Boolean)
    }, [completedRounds, players])

  const playerStats =
    useMemo(() => {
      return uniquePlayerNames.map((playerName) => {
        const playerRounds =
          completedRounds.filter((round) =>
            round.players?.some(
              (player) => player.name === playerName
            )
          )

        const wins =
          completedRounds.filter(
            (round) => round.winner === playerName
          ).length

        const birdies =
          completedRounds.reduce((total, round) => {
            const roundPlayer =
              round.players?.find(
                (player) => player.name === playerName
              )

            const count =
              roundPlayer?.holes?.filter(
                (playedHole) =>
                  playedHole.result?.label === "Birdie"
              ).length || 0

            return total + count
          }, 0)

        const eagles =
          completedRounds.reduce((total, round) => {
            const roundPlayer =
              round.players?.find(
                (player) => player.name === playerName
              )

            const count =
              roundPlayer?.holes?.filter(
                (playedHole) =>
                  playedHole.result?.label === "Eagle"
              ).length || 0

            return total + count
          }, 0)

        const totalWinnings =
          roundMoney(
            completedRounds.reduce((total, round) => {
              const roundPlayer =
                round.players?.find(
                  (player) => player.name === playerName
                )

              return (
                total +
                toNumber(roundPlayer?.winnings, 0)
              )
            }, 0)
          )

        const totalToPar =
          completedRounds.reduce((total, round) => {
            const roundPlayer =
              round.players?.find(
                (player) => player.name === playerName
              )

            return (
              total +
              toNumber(roundPlayer?.totalToPar, 0)
            )
          }, 0)

        const avgToPar =
          playerRounds.length > 0
            ? Number(
                (
                  totalToPar / playerRounds.length
                ).toFixed(1)
              )
            : 0

        return {
          name: playerName,
          wins,
          birdies,
          eagles,
          totalWinnings,
          totalToPar,
          avgToPar,
          roundsPlayed: playerRounds.length,
        }
      })
    }, [completedRounds, uniquePlayerNames])

  const value =
    useMemo(
      () => ({
        courses,

        GAME_MODES,

        gameMode,
        setGameMode,
        gameModeLabel,

        isWolffnMode,
        isProfessionalMode,

        getGameModeLabel,

        selectedCourseId,
        setSelectedCourseId,

        currentCourse,

        hole,
        setHole,

        currentPar,

        carryover,
        currentBaseSkins,
        currentBonusSkins,
        currentSkinsAtStake,
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

        specialScoringEnabled,
        setSpecialScoringEnabled,

        bonusSkinsEnabled:
          specialScoringEnabled,

        setBonusSkinsEnabled:
          setSpecialScoringEnabled,

        eagleBonusEnabled:
          specialScoringEnabled,

        setEagleBonusEnabled:
          setSpecialScoringEnabled,

        eagleBonusAvailable:
          false,

        updateScore,
        finishHole,

        startMatch,
        resetGame,

        getGolfResult,
      }),
      [
        gameMode,
        setGameMode,
        gameModeLabel,
        isWolffnMode,
        isProfessionalMode,
        selectedCourseId,
        currentCourse,
        hole,
        currentPar,
        carryover,
        currentBaseSkins,
        currentBonusSkins,
        currentSkinsAtStake,
        currentPot,
        players,
        stake,
        setStake,
        history,
        celebration,
        completedRounds,
        playerStats,
        activeMatchId,
        hasActiveMatch,
        matchFinished,
        lowestScore,
        winners,
        hasTie,
        specialScoringEnabled,
        setSpecialScoringEnabled,
        updateScore,
        finishHole,
        startMatch,
        resetGame,
      ]
    )

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)

  if (!context) {
    throw new Error("useGame must be used within a GameProvider.")
  }

  return context
}