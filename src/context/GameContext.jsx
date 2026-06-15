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

const DEFAULT_COURSES = [
  {
    id: "westpfalz",
    name: "Erster Golfclub Westpfalz",
    location: "Westpfalz",
    par: 72,
    pars: [4, 4, 3, 5, 4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],
  },
  {
    id: "kronberg",
    name: "Golf- & Landclub Kronberg",
    location: "Kronberg",
    par: 68,
    pars: [4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 3, 4, 3, 5, 4],
  },
]

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

function normalizeStake(value) {
  const stake = roundMoney(value)
  return stake > 0 ? stake : DEFAULT_STAKE
}

function normalizePars(pars, fallbackPars = DEFAULT_COURSES[0].pars) {
  const sourcePars = Array.isArray(pars) && pars.length > 0 ? pars : fallbackPars
  const normalizedPars = sourcePars
    .slice(0, HOLE_COUNT)
    .map((par) => Math.max(toNumber(par, DEFAULT_SCORE), 1))

  while (normalizedPars.length < HOLE_COUNT) {
    normalizedPars.push(toNumber(fallbackPars[normalizedPars.length], DEFAULT_SCORE))
  }

  return normalizedPars
}

function createCourseId(value, fallback = "course") {
  const slug = String(value || fallback)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || fallback
}

function normalizeCourse(course, fallbackCourse = DEFAULT_COURSES[0]) {
  const fallbackPars = normalizePars(fallbackCourse?.pars)
  const pars = normalizePars(course?.pars, fallbackPars)
  const fallbackName = fallbackCourse?.name || "Golf Course"
  const name = String(course?.name || fallbackName).trim() || fallbackName
  const location = String(course?.location || fallbackCourse?.location || "").trim()
  const id = createCourseId(course?.id || name, fallbackCourse?.id || DEFAULT_COURSE_ID)
  const calculatedPar = pars.reduce((total, par) => total + toNumber(par, DEFAULT_SCORE), 0)

  return {
    id,
    name,
    location,
    par: toNumber(course?.par, calculatedPar),
    pars,
  }
}

function getCourseById(courseId, courseList = DEFAULT_COURSES) {
  const safeCourseList = Array.isArray(courseList) && courseList.length > 0 ? courseList : DEFAULT_COURSES
  const normalizedCourseId = String(courseId || "").trim().toLowerCase()

  return (
    safeCourseList.find((course) => String(course?.id || "").toLowerCase() === normalizedCourseId) ||
    safeCourseList[0] ||
    DEFAULT_COURSES[0]
  )
}

function normalizeCourseList(savedCourses) {
  const courseMap = new Map()

  DEFAULT_COURSES.forEach((course) => {
    const normalizedCourse = normalizeCourse(course, course)
    courseMap.set(normalizedCourse.id, normalizedCourse)
  })

  if (Array.isArray(savedCourses)) {
    savedCourses.forEach((course) => {
      const fallbackCourse = getCourseById(course?.id, Array.from(courseMap.values()))
      const normalizedCourse = normalizeCourse(course, fallbackCourse)
      courseMap.set(normalizedCourse.id, normalizedCourse)
    })
  }

  return Array.from(courseMap.values())
}

export function getGameModeLabel(gameMode) {
  if (gameMode === GAME_MODES.WOLFFN) return "Wolffn"
  if (gameMode === GAME_MODES.PROFESSIONAL) return "Skinz Professional"
  return "Classic Skinz"
}

function normalizeGameMode(value, specialScoringEnabled = false) {
  if (value === GAME_MODES.WOLFFN) return GAME_MODES.WOLFFN
  if (value === GAME_MODES.PROFESSIONAL) return GAME_MODES.PROFESSIONAL
  if (value === GAME_MODES.CLASSIC) return GAME_MODES.CLASSIC
  return specialScoringEnabled ? GAME_MODES.PROFESSIONAL : GAME_MODES.CLASSIC
}

function isProfessionalGameMode(gameMode) {
  return gameMode === GAME_MODES.PROFESSIONAL
}

function isWolffnGameMode(gameMode) {
  return gameMode === GAME_MODES.WOLFFN
}

function createCourseSnapshot(course) {
  const safeCourse = normalizeCourse(course || getCourseById(DEFAULT_COURSE_ID))

  return {
    id: safeCourse.id,
    name: safeCourse.name,
    location: safeCourse.location,
    par: safeCourse.par,
    pars: [...safeCourse.pars],
  }
}

function normalizeCourseSnapshot(course, courseList = DEFAULT_COURSES) {
  if (!course) return createCourseSnapshot(getCourseById(DEFAULT_COURSE_ID, courseList))

  const courseId = String(course.id || "").toLowerCase()
  const courseName = String(course.name || "").toLowerCase()

  const matchedCourse = courseList.find((availableCourse) => {
    const availableCourseId = String(availableCourse?.id || "").toLowerCase()
    const availableCourseName = String(availableCourse?.name || "").toLowerCase()

    return (
      availableCourseId === courseId ||
      (courseName && availableCourseName === courseName) ||
      (courseName && availableCourseName.includes(courseName)) ||
      (availableCourseName && courseName.includes(availableCourseName))
    )
  })

  if (matchedCourse) {
    return createCourseSnapshot(matchedCourse)
  }

  return createCourseSnapshot(normalizeCourse(course))
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
  return [createPlayer("Lucas", DEFAULT_SCORE), createPlayer("Ben", DEFAULT_SCORE)]
}

function normalizePlayer(player, fallbackScore = DEFAULT_SCORE) {
  return {
    name: String(player?.name || "Player").trim() || "Player",
    score: toNumber(player?.score, fallbackScore),
    total: toNumber(player?.total, 0),
    totalToPar: toNumber(player?.totalToPar, 0),
    skins: Math.max(toNumber(player?.skins, 0), 0),
    winnings: roundMoney(player?.winnings),
    holes: Array.isArray(player?.holes)
      ? player.holes.map((hole) => ({
          ...hole,
          skinDelta: Math.max(toNumber(hole?.skinDelta, 0), 0),
          winningsDelta:
            hole?.winningsDelta !== undefined
              ? roundMoney(hole.winningsDelta)
              : hole?.winningsDelta,
        }))
      : [],
  }
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
}

function normalizeHistory(history) {
  return Array.isArray(history)
    ? history.map((item) => ({
        ...item,
        pot: item?.pot !== undefined ? roundMoney(item.pot) : item?.pot,
      }))
    : []
}

function calculateSettlementWinnings(players, stake) {
  const safePlayers = Array.isArray(players) ? players : []
  const safeStake = normalizeStake(stake)

  return safePlayers.map((player) => {
    const playerSkins = toNumber(player?.skins, 0)
    const winnings = safePlayers.reduce((total, opponent) => {
      if (normalizeName(opponent?.name) === normalizeName(player?.name)) {
        return total
      }

      return total + (playerSkins - toNumber(opponent?.skins, 0)) * safeStake
    }, 0)

    return {
      ...player,
      winnings: roundMoney(winnings),
    }
  })
}

function applyLatestWinningsDelta(playersAfterSettlement, previousPlayers) {
  const safePreviousPlayers = Array.isArray(previousPlayers) ? previousPlayers : []

  return playersAfterSettlement.map((player) => {
    const previousPlayer = safePreviousPlayers.find(
      (item) => normalizeName(item?.name) === normalizeName(player?.name)
    )
    const winningsDelta = roundMoney(
      toNumber(player?.winnings, 0) - toNumber(previousPlayer?.winnings, 0)
    )
    const holes = Array.isArray(player?.holes) ? [...player.holes] : []

    if (holes.length === 0) return player

    const lastHole = holes[holes.length - 1]
    holes[holes.length - 1] = {
      ...lastHole,
      winningsDelta,
    }

    return {
      ...player,
      holes,
    }
  })
}

function settlePlayersAfterHole(playersAfterHole, previousPlayers, stake) {
  return applyLatestWinningsDelta(
    calculateSettlementWinnings(playersAfterHole, stake),
    previousPlayers
  )
}

function normalizeCompletedRounds(rounds, courseList = DEFAULT_COURSES) {
  if (!Array.isArray(rounds)) return []

  return rounds.map((round) => {
    const specialScoringEnabled = Boolean(
      round.specialScoringEnabled ||
        round.bonusSkinsEnabled ||
        round.eagleBonusEnabled
    )

    const gameMode = normalizeGameMode(round.gameMode, specialScoringEnabled)
    const normalizedSpecialScoringEnabled = isProfessionalGameMode(gameMode)
    const normalizedPlayers = getRoundPlayers(round).map((player) => normalizePlayer(player))
    const settledPlayers = calculateSettlementWinnings(normalizedPlayers, round.stake)
    const sortedPlayers = [...settledPlayers].sort(
      (a, b) =>
        toNumber(b.winnings, 0) - toNumber(a.winnings, 0) ||
        toNumber(b.skins, 0) - toNumber(a.skins, 0) ||
        toNumber(a.totalToPar, 0) - toNumber(b.totalToPar, 0) ||
        toNumber(a.total, 0) - toNumber(b.total, 0) ||
        String(a?.name || "").localeCompare(String(b?.name || ""))
    )
    const champion = sortedPlayers[0]

    return {
      ...round,
      gameMode,
      gameModeLabel: round.gameModeLabel || getGameModeLabel(gameMode),
      course: normalizeCourseSnapshot(round.course, courseList),
      players: settledPlayers,
      history: normalizeHistory(round.history),
      stake: normalizeStake(round.stake),
      winnings: roundMoney(champion?.winnings || round.winnings || 0),
      skins: toNumber(champion?.skins ?? round.skins, 0),
      winner: champion?.name || round.winner || "Unbekannt",
      totalToPar: toNumber(champion?.totalToPar ?? round.totalToPar, 0),
      specialScoringEnabled: normalizedSpecialScoringEnabled,
      bonusSkinsEnabled: normalizedSpecialScoringEnabled,
      eagleBonusEnabled: normalizedSpecialScoringEnabled,
    }
  })
}

function getGolfResult(score, par) {
  const difference = toNumber(score, DEFAULT_SCORE) - toNumber(par, DEFAULT_SCORE)

  if (difference === -3) return { label: "Albatross", color: "bg-yellow-400 text-black" }
  if (difference <= -2) return { label: "Eagle", color: "bg-orange-500 text-white" }
  if (difference === -1) return { label: "Birdie", color: "bg-red-500 text-white" }
  if (difference === 0) return { label: "Par", color: "bg-white text-slate-900 border border-slate-200" }
  if (difference === 1) return { label: "Bogey", color: "bg-blue-500 text-white" }
  if (difference === 2) return { label: "Double Bogey", color: "bg-blue-900 text-white" }

  return { label: "Triple+", color: "bg-purple-600 text-white" }
}

function getBaseSkinsForScore(score, par, isSpecialScoringEnabled = false) {
  if (!isSpecialScoringEnabled) return 1

  const difference = toNumber(score, DEFAULT_SCORE) - toNumber(par, DEFAULT_SCORE)

  if (difference <= -2) return 3
  if (difference === -1) return 2
  return 1
}

function getBonusSkinsForScore(score, par, isSpecialScoringEnabled = false) {
  return Math.max(getBaseSkinsForScore(score, par, isSpecialScoringEnabled) - 1, 0)
}

function getSpecialScoringLabel(score, par, isSpecialScoringEnabled = false) {
  if (!isSpecialScoringEnabled) return null

  const difference = toNumber(score, DEFAULT_SCORE) - toNumber(par, DEFAULT_SCORE)

  if (difference <= -2) return "Eagle 3 Skins"
  if (difference === -1) return "Birdie 2 Skins"
  return null
}

function getPlayerByName(players, playerName) {
  return players.find((player) => normalizeName(player.name) === normalizeName(playerName)) || null
}

function getTeamBestScore(team, players) {
  const teamPlayers = Array.isArray(team)
    ? team.map((playerName) => getPlayerByName(players, playerName)).filter(Boolean)
    : []

  if (teamPlayers.length === 0) return null

  return Math.min(...teamPlayers.map((player) => toNumber(player.score, DEFAULT_SCORE)))
}

function getWolffnScoreMultiplier(score, par) {
  const difference = toNumber(score, DEFAULT_SCORE) - toNumber(par, DEFAULT_SCORE)

  if (difference <= -2) return { multiplier: 4, label: "Eagle x4", resultLabel: "Eagle" }
  if (difference === -1) return { multiplier: 2, label: "Birdie x2", resultLabel: "Birdie" }
  return { multiplier: 1, label: null, resultLabel: getGolfResult(score, par).label }
}

function getWolffnSpecialScoringLabel({
  wolffnMultiplier,
  scoreMultiplier,
  resultLabel,
  basePotSkins,
  totalPotSkins,
}) {
  if (totalPotSkins <= basePotSkins && wolffnMultiplier <= 1 && scoreMultiplier <= 1) return null

  if (resultLabel === "Eagle" || resultLabel === "Albatross") {
    return `Eagle ${totalPotSkins} Skinz`
  }

  if (resultLabel === "Birdie") {
    return `Birdie ${totalPotSkins} Skinz`
  }

  if (wolffnMultiplier > 1 && scoreMultiplier === 1) {
    return `Wolffn ${totalPotSkins} Skinz`
  }

  return `${totalPotSkins} Skinz`
}

function getWolffnMultiplier(wolffnSetup, winningScore, par, basePotSkins = 1) {
  const wolffnMultiplier = wolffnSetup?.format === "1v3" ? 2 : 1
  const scoreMultiplier = getWolffnScoreMultiplier(winningScore, par)
  const totalMultiplier = wolffnMultiplier * scoreMultiplier.multiplier
  const totalPotSkins = basePotSkins * totalMultiplier
  const specialScoringLabel = getWolffnSpecialScoringLabel({
    wolffnMultiplier,
    scoreMultiplier: scoreMultiplier.multiplier,
    resultLabel: scoreMultiplier.resultLabel,
    basePotSkins,
    totalPotSkins,
  })

  return {
    wolffnMultiplier,
    scoreMultiplier: scoreMultiplier.multiplier,
    totalMultiplier,
    scoreMultiplierLabel: scoreMultiplier.label,
    resultLabel: scoreMultiplier.resultLabel,
    currentHoleValue: totalPotSkins,
    basePotSkins,
    totalPotSkins,
    specialScoringLabel,
  }
}

function calculateWolffnHole({ players, par, carryover, stake, wolffnSetup }) {
  if (
    !wolffnSetup ||
    !Array.isArray(wolffnSetup.teamA) ||
    !Array.isArray(wolffnSetup.teamB) ||
    wolffnSetup.teamA.length === 0 ||
    wolffnSetup.teamB.length === 0
  ) {
    return null
  }

  const teamAScore = getTeamBestScore(wolffnSetup.teamA, players)
  const teamBScore = getTeamBestScore(wolffnSetup.teamB, players)

  if (teamAScore === null || teamBScore === null) return null

  const hasTie = teamAScore === teamBScore
  const winningScore = Math.min(teamAScore, teamBScore)
  const basePotSkins = toNumber(carryover, 0) + 1
  const multiplierInfo = getWolffnMultiplier(wolffnSetup, winningScore, par, basePotSkins)
  const totalPotSkins = multiplierInfo.totalPotSkins
  const nextCarryover = hasTie ? totalPotSkins : 0
  const totalSkins = hasTie ? 0 : totalPotSkins
  const teamAWon = teamAScore < teamBScore

  const winningTeam = hasTie ? [] : teamAWon ? wolffnSetup.teamA : wolffnSetup.teamB
  const losingTeam = hasTie ? [] : teamAWon ? wolffnSetup.teamB : wolffnSetup.teamA
  const winnerLabel = hasTie ? "Carryover" : winningTeam.join(" + ")
  const teamPot = roundMoney((hasTie ? nextCarryover : totalSkins) * stake)

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
    basePotSkins,
    currentHoleValue: totalPotSkins,
    totalPotSkins,
    carryoverGrowth: hasTie ? Math.max(totalPotSkins - toNumber(carryover, 0), 0) : 0,
    teamPot,
    multiplierInfo,
  }
}

function getWolffnPlayerSkinDelta({ playerName, hasTie, totalSkins, winningTeam }) {
  if (hasTie) return 0

  const isOnWinningTeam = winningTeam.some(
    (teamPlayerName) => normalizeName(teamPlayerName) === normalizeName(playerName)
  )

  return isOnWinningTeam ? totalSkins : 0
}

function getSavedGame() {
  try {
    const savedGame = localStorage.getItem(STORAGE_KEY)
    if (!savedGame) return null
    return JSON.parse(savedGame)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function createInitialGameState() {
  const savedGame = getSavedGame()
  const normalizedCourses = normalizeCourseList(savedGame?.courses)
  const completedRounds = normalizeCompletedRounds(savedGame?.completedRounds || [], normalizedCourses)
  const matchCounter = toNumber(savedGame?.matchCounter, completedRounds.length || 0)
  const selectedCourseId = getCourseById(savedGame?.selectedCourseId || DEFAULT_COURSE_ID, normalizedCourses).id
  const currentCourse = getCourseById(selectedCourseId, normalizedCourses)
  const currentPars = currentCourse?.pars || DEFAULT_COURSES[0].pars

  const rawPlayers =
    Array.isArray(savedGame?.players) && savedGame.players.length > 0
      ? savedGame.players.map((player) => normalizePlayer(player, currentPars[0] || DEFAULT_SCORE))
      : createDefaultPlayers()
  const players = calculateSettlementWinnings(rawPlayers, savedGame?.stake ?? DEFAULT_STAKE)

  const savedSpecialScoringEnabled = Boolean(
    savedGame?.specialScoringEnabled || savedGame?.bonusSkinsEnabled || savedGame?.eagleBonusEnabled
  )
  const gameMode = normalizeGameMode(savedGame?.gameMode, savedSpecialScoringEnabled)
  const specialScoringEnabled = isProfessionalGameMode(gameMode)

  return {
    courses: normalizedCourses,
    selectedCourseId,
    hole: Math.min(Math.max(toNumber(savedGame?.hole, 1), 1), HOLE_COUNT),
    carryover: toNumber(savedGame?.carryover, 0),
    history: normalizeHistory(savedGame?.history),
    players,
    stake: normalizeStake(savedGame?.stake ?? DEFAULT_STAKE),
    completedRounds,
    activeMatchId: savedGame?.activeMatchId || createMatchId(matchCounter + 1),
    matchCounter,
    matchFinished: Boolean(savedGame?.matchFinished),
    hasActiveMatch: Boolean(savedGame?.hasActiveMatch),
    gameMode,
    specialScoringEnabled,
  }
}

function createCompletedRound({ activeMatchId, courseSnapshot, gameMode, gameModeLabel, finalPlayers, history, stake, specialScoringEnabled }) {
  const settledFinalPlayers = calculateSettlementWinnings(finalPlayers, stake)
  const sortedFinalPlayers = [...settledFinalPlayers].sort(
    (a, b) =>
      toNumber(b.winnings, 0) - toNumber(a.winnings, 0) ||
      toNumber(b.skins, 0) - toNumber(a.skins, 0) ||
      toNumber(a.totalToPar, 0) - toNumber(b.totalToPar, 0) ||
      toNumber(a.total, 0) - toNumber(b.total, 0) ||
      String(a?.name || "").localeCompare(String(b?.name || ""))
  )
  const champion = sortedFinalPlayers[0]

  return {
    id: activeMatchId,
    date: new Date().toLocaleDateString("de-DE"),
    createdAt: Date.now(),
    course: courseSnapshot,
    gameMode,
    gameModeLabel,
    winner: champion?.name || "Unbekannt",
    winnings: roundMoney(champion?.winnings || 0),
    skins: toNumber(champion?.skins, 0),
    totalToPar: toNumber(champion?.totalToPar, 0),
    stake: normalizeStake(stake),
    specialScoringEnabled,
    bonusSkinsEnabled: specialScoringEnabled,
    eagleBonusEnabled: specialScoringEnabled,
    history,
    players: settledFinalPlayers,
  }
}

export function GameProvider({ children }) {
  const initialState = useMemo(() => createInitialGameState(), [])

  const [courses, setCourses] = useState(initialState.courses)
  const [selectedCourseId, setSelectedCourseIdState] = useState(initialState.selectedCourseId)
  const [hole, setHole] = useState(initialState.hole)
  const [carryover, setCarryover] = useState(initialState.carryover)
  const [history, setHistory] = useState(initialState.history)
  const [players, setPlayers] = useState(initialState.players)
  const [stake, setStakeState] = useState(initialState.stake)
  const [completedRounds, setCompletedRounds] = useState(initialState.completedRounds)
  const [activeMatchId, setActiveMatchId] = useState(initialState.activeMatchId)
  const [matchCounter, setMatchCounter] = useState(initialState.matchCounter)
  const [celebration, setCelebration] = useState(null)
  const [matchFinished, setMatchFinished] = useState(initialState.matchFinished)
  const [hasActiveMatch, setHasActiveMatch] = useState(initialState.hasActiveMatch)
  const [gameMode, setGameModeState] = useState(initialState.gameMode)
  const [specialScoringEnabled, setSpecialScoringEnabledState] = useState(initialState.specialScoringEnabled)

  const currentCourse = getCourseById(selectedCourseId, courses)
  const currentPars = currentCourse?.pars || DEFAULT_COURSES[0].pars
  const currentPar = currentPars[hole - 1] || DEFAULT_SCORE
  const isWolffnMode = isWolffnGameMode(gameMode)
  const isProfessionalMode = isProfessionalGameMode(gameMode)
  const gameModeLabel = getGameModeLabel(gameMode)

  const setSelectedCourseId = useCallback((courseId) => {
    const selectedCourse = getCourseById(courseId, courses)
    setSelectedCourseIdState(selectedCourse.id)
  }, [courses])

  const addCourse = useCallback((course) => {
    let createdCourse = null
    setCourses((currentCourses) => {
      const normalizedCourses = normalizeCourseList(currentCourses)
      const baseCourse = normalizeCourse(course)
      const usedCourseIds = new Set(normalizedCourses.map((currentCourse) => currentCourse.id))
      let nextCourseId = baseCourse.id
      let suffix = 2
      while (usedCourseIds.has(nextCourseId)) {
        nextCourseId = `${baseCourse.id}-${suffix}`
        suffix += 1
      }
      createdCourse = { ...baseCourse, id: nextCourseId }
      return [...normalizedCourses, createdCourse]
    })
    return createdCourse
  }, [])

  const updateCourse = useCallback((courseId, updates) => {
    const normalizedCourseId = String(courseId || "").trim()
    let updatedCourse = null
    if (!normalizedCourseId) return null
    setCourses((currentCourses) => {
      const normalizedCourses = normalizeCourseList(currentCourses)
      return normalizedCourses.map((course) => {
        if (course.id !== normalizedCourseId) return course
        updatedCourse = normalizeCourse({ ...course, ...updates, id: course.id }, course)
        return updatedCourse
      })
    })
    return updatedCourse
  }, [])

  const deleteCourse = useCallback((courseId) => {
    const normalizedCourseId = String(courseId || "").trim()
    if (!normalizedCourseId || normalizedCourseId === DEFAULT_COURSE_ID) return false
    if (selectedCourseId === normalizedCourseId) return false
    setCourses((currentCourses) => {
      const normalizedCourses = normalizeCourseList(currentCourses)
      if (normalizedCourses.length <= 1) return normalizedCourses
      return normalizedCourses.filter((course) => course.id !== normalizedCourseId)
    })
    return true
  }, [selectedCourseId])

  const setStake = useCallback((value) => {
    setStakeState((currentStake) => normalizeStake(typeof value === "function" ? value(currentStake) : value))
  }, [])

  const setGameMode = useCallback((nextGameMode) => {
    const normalizedGameMode = normalizeGameMode(nextGameMode)
    setGameModeState(normalizedGameMode)
    setSpecialScoringEnabledState(isProfessionalGameMode(normalizedGameMode))
  }, [])

  const setSpecialScoringEnabled = useCallback((value) => {
    setSpecialScoringEnabledState((currentValue) => {
      const nextValue = typeof value === "function" ? Boolean(value(currentValue)) : Boolean(value)
      setGameModeState(nextValue ? GAME_MODES.PROFESSIONAL : GAME_MODES.CLASSIC)
      return nextValue
    })
  }, [])

  const lowestScore = players.length > 0 ? Math.min(...players.map((player) => toNumber(player.score, 0))) : 0
  const winners = players.filter((player) => toNumber(player.score, 0) === lowestScore)
  const hasTie = winners.length > 1
  const currentBaseSkins = players.length > 0 ? getBaseSkinsForScore(lowestScore, currentPar, specialScoringEnabled) : 1
  const currentBonusSkins = !hasTie && winners[0] ? getBonusSkinsForScore(winners[0].score, currentPar, specialScoringEnabled) : 0
  const currentSkinsAtStake = carryover + currentBaseSkins
  const currentPot = roundMoney(currentSkinsAtStake * stake * Math.max(players.length - 1, 1))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        courses,
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
        eagleBonusEnabled: specialScoringEnabled,
      }))
    } catch {
      // localStorage kann z. B. im Private Mode oder bei vollem Speicher fehlschlagen.
    }
  }, [courses, hole, carryover, history, players, stake, matchFinished, hasActiveMatch, completedRounds, activeMatchId, matchCounter, selectedCourseId, gameMode, gameModeLabel, specialScoringEnabled])

  const updateScore = useCallback((index, value) => {
    if (matchFinished || !hasActiveMatch) return
    setPlayers((currentPlayers) => currentPlayers.map((player, playerIndex) => playerIndex !== index ? player : { ...player, score: toNumber(value, currentPar) }))
  }, [matchFinished, hasActiveMatch, currentPar])

  const startMatch = useCallback((playerNames, selectedStake = DEFAULT_STAKE, courseId = selectedCourseId, selectedSpecialScoringEnabledOrGameMode = false, selectedGameMode) => {
    const cleanedNames = Array.isArray(playerNames) ? playerNames.map((name) => String(name || "").trim()).filter(Boolean) : []
    const uniqueNameMap = new Map()
    cleanedNames.forEach((name) => {
      const key = normalizeName(name)
      if (!uniqueNameMap.has(key)) uniqueNameMap.set(key, name)
    })
    const uniqueNames = Array.from(uniqueNameMap.values())
    if (uniqueNames.length < 2) return false

    const requestedGameMode = selectedGameMode !== undefined
      ? selectedGameMode
      : typeof selectedSpecialScoringEnabledOrGameMode === "string"
        ? selectedSpecialScoringEnabledOrGameMode
        : null
    const requestedSpecialScoringEnabled = typeof selectedSpecialScoringEnabledOrGameMode === "boolean" ? selectedSpecialScoringEnabledOrGameMode : false
    const nextGameMode = normalizeGameMode(requestedGameMode, requestedSpecialScoringEnabled)
    if (isWolffnGameMode(nextGameMode) && uniqueNames.length !== 4) return false

    const matchCourse = getCourseById(courseId, courses)
    const matchPars = matchCourse?.pars || DEFAULT_COURSES[0].pars
    const nextCounter = matchCounter + 1
    const newMatchId = createMatchId(nextCounter)
    const formattedPlayers = uniqueNames.map((name) => createPlayer(name, matchPars[0] || DEFAULT_SCORE))

    setSelectedCourseIdState(matchCourse.id)
    setPlayers(formattedPlayers)
    setStakeState(normalizeStake(selectedStake))
    setHole(1)
    setCarryover(0)
    setHistory([])
    setCelebration(null)
    setMatchFinished(false)
    setHasActiveMatch(true)
    setGameModeState(nextGameMode)
    setSpecialScoringEnabledState(isProfessionalGameMode(nextGameMode))
    setActiveMatchId(newMatchId)
    setMatchCounter(nextCounter)
    return true
  }, [selectedCourseId, matchCounter, courses])

  const finishHole = useCallback((wolffnSetup = null) => {
    if (matchFinished || !hasActiveMatch) return
    const courseSnapshot = createCourseSnapshot(currentCourse)

    if (isWolffnMode) {
      const wolffnResult = calculateWolffnHole({ players, par: currentPar, carryover, stake, wolffnSetup })
      if (!wolffnResult) return

      const winningResult = getGolfResult(wolffnResult.winningScore, currentPar)
      const totalSkins = wolffnResult.totalSkins
      const nextCarryover = wolffnResult.nextCarryover
      const wolffnSpecialScoringLabel = wolffnResult.multiplierInfo.specialScoringLabel
      const wolffnSpecialScoringApplied = Boolean(wolffnSpecialScoringLabel)

      const holeResult = {
        hole,
        par: currentPar,
        gameMode,
        gameModeLabel,
        wolffnSetup,
        wolffnFormat: wolffnSetup.format,
        wolffnPlayer: wolffnSetup.wolffnPlayer || null,
        wolffnTeamA: wolffnSetup.teamA,
        wolffnTeamB: wolffnSetup.teamB,
        pot: roundMoney(wolffnResult.teamPot),
        skins: wolffnResult.hasTie ? nextCarryover : totalSkins,
        baseSkins: 1,
        basePotSkins: wolffnResult.basePotSkins,
        currentHoleValue: wolffnResult.currentHoleValue,
        totalPotSkins: wolffnResult.totalPotSkins,
        totalMultiplier: wolffnResult.multiplierInfo.totalMultiplier,
        wolffnMultiplier: wolffnResult.multiplierInfo.wolffnMultiplier,
        scoreMultiplier: wolffnResult.multiplierInfo.scoreMultiplier,
        scoreMultiplierLabel: wolffnResult.multiplierInfo.scoreMultiplierLabel,
        bonusSkins: Math.max(wolffnResult.currentHoleValue - wolffnResult.basePotSkins, 0),
        carryoverSkins: carryover,
        carryoverAdded: wolffnResult.hasTie ? wolffnResult.carryoverGrowth : 0,
        hasTie: wolffnResult.hasTie,
        specialScoringEnabled: wolffnSpecialScoringApplied,
        specialScoringApplied: wolffnSpecialScoringApplied,
        specialScoringLabel: wolffnSpecialScoringLabel,
        bonusSkinsEnabled: wolffnSpecialScoringApplied,
        bonusResult: wolffnSpecialScoringLabel,
        winningResult: winningResult.label,
        eagleBonusApplied: wolffnResult.multiplierInfo.resultLabel === "Eagle",
        winner: wolffnResult.winnerLabel,
        winningScore: wolffnResult.winningScore,
        course: { id: courseSnapshot.id, name: courseSnapshot.name },
        players: players.map((player) => ({ name: player.name, score: player.score, result: getGolfResult(player.score, currentPar) })),
      }

      const updatedHistory = [...history, holeResult]
      const playersAfterHole = players.map((player) => {
        const playerScore = toNumber(player.score, currentPar)
        const toPar = playerScore - currentPar
        const skinDelta = getWolffnPlayerSkinDelta({ playerName: player.name, hasTie: wolffnResult.hasTie, totalSkins, winningTeam: wolffnResult.winningTeam })

        return {
          ...player,
          total: toNumber(player.total, 0) + playerScore,
          totalToPar: toNumber(player.totalToPar, 0) + toPar,
          skins: toNumber(player.skins, 0) + skinDelta,
          holes: [...(Array.isArray(player.holes) ? player.holes : []), {
            hole,
            par: currentPar,
            score: playerScore,
            toPar,
            courseId: courseSnapshot.id,
            gameMode,
            gameModeLabel,
            wolffnSetup,
            wolffnFormat: wolffnSetup.format,
            wolffnPlayer: wolffnSetup.wolffnPlayer || null,
            wolffnTeamA: wolffnSetup.teamA,
            wolffnTeamB: wolffnSetup.teamB,
            result: getGolfResult(playerScore, currentPar),
            skinDelta,
            winningsDelta: 0,
            totalSkins: wolffnResult.hasTie ? 0 : totalSkins,
            baseSkins: 1,
            basePotSkins: wolffnResult.basePotSkins,
            currentHoleValue: wolffnResult.currentHoleValue,
            totalPotSkins: wolffnResult.totalPotSkins,
            totalMultiplier: wolffnResult.multiplierInfo.totalMultiplier,
            wolffnMultiplier: wolffnResult.multiplierInfo.wolffnMultiplier,
            scoreMultiplier: wolffnResult.multiplierInfo.scoreMultiplier,
            scoreMultiplierLabel: wolffnResult.multiplierInfo.scoreMultiplierLabel,
            carryoverAdded: wolffnResult.hasTie ? wolffnResult.carryoverGrowth : 0,
            specialScoringEnabled: wolffnSpecialScoringApplied,
            specialScoringApplied: wolffnSpecialScoringApplied,
            specialScoringLabel: wolffnSpecialScoringLabel,
            bonusSkinsEnabled: wolffnSpecialScoringApplied,
            bonusResult: wolffnSpecialScoringLabel,
            winningResult: winningResult.label,
            eagleBonusApplied: wolffnResult.multiplierInfo.resultLabel === "Eagle",
          }],
          score: currentPars[hole] || DEFAULT_SCORE,
        }
      })
      const updatedPlayers = settlePlayersAfterHole(playersAfterHole, players, stake)

      setHistory(updatedHistory)
      setPlayers(updatedPlayers)

      if (wolffnResult.hasTie) {
        setCarryover(nextCarryover)
      } else {
        setCarryover(0)
        setCelebration({
          player: wolffnResult.winnerLabel,
          result: winningResult.label,
          color: winningResult.color,
          pot: roundMoney(wolffnResult.teamPot),
          skins: totalSkins,
          baseSkins: 1,
          basePotSkins: wolffnResult.basePotSkins,
          currentHoleValue: wolffnResult.currentHoleValue,
          totalPotSkins: wolffnResult.totalPotSkins,
          totalMultiplier: wolffnResult.multiplierInfo.totalMultiplier,
          bonusSkins: Math.max(wolffnResult.currentHoleValue - wolffnResult.basePotSkins, 0),
          gameMode,
          gameModeLabel,
          wolffnSetup,
          wolffnFormat: wolffnSetup.format,
          wolffnPlayer: wolffnSetup.wolffnPlayer || null,
          specialScoringEnabled: wolffnSpecialScoringApplied,
          specialScoringApplied: wolffnSpecialScoringApplied,
          specialScoringLabel: wolffnSpecialScoringLabel,
          bonusSkinsEnabled: wolffnSpecialScoringApplied,
          bonusResult: wolffnSpecialScoringLabel,
          winningResult: winningResult.label,
          eagleBonusApplied: wolffnResult.multiplierInfo.resultLabel === "Eagle",
        })
        window.setTimeout(() => setCelebration(null), 2200)
      }

      if (hole >= HOLE_COUNT) {
        const finalPlayers = updatedPlayers.map((player) => ({ ...player, holes: Array.isArray(player.holes) ? player.holes.map((playedHole) => ({ ...playedHole })) : [] }))
        const completedRound = createCompletedRound({ activeMatchId, courseSnapshot, gameMode, gameModeLabel, finalPlayers, history: updatedHistory, stake, specialScoringEnabled: false })
        setCompletedRounds((previousRounds) => [completedRound, ...previousRounds])
        setMatchFinished(true)
        setHasActiveMatch(false)
        setActiveMatchId(createMatchId(matchCounter + 1))
        return
      }

      setHole(hole + 1)
      return
    }

    const winner = !hasTie ? winners[0] : null
    const winningResult = getGolfResult(lowestScore, currentPar)
    const tieBaseSkins = getBaseSkinsForScore(lowestScore, currentPar, specialScoringEnabled)
    const winnerBaseSkins = winner ? getBaseSkinsForScore(winner.score, currentPar, specialScoringEnabled) : 1
    const baseSkins = hasTie ? tieBaseSkins : winnerBaseSkins
    const bonusSkins = winner ? getBonusSkinsForScore(winner.score, currentPar, specialScoringEnabled) : 0
    const specialScoringLabel = getSpecialScoringLabel(lowestScore, currentPar, specialScoringEnabled)
    const specialScoringApplied = Boolean(specialScoringEnabled && !hasTie && specialScoringLabel && bonusSkins > 0)
    const nextCarryover = hasTie ? carryover + baseSkins : 0
    const totalSkins = hasTie ? 0 : winnerBaseSkins + carryover
    const opponentCount = Math.max(players.length - 1, 1)
    const totalWinnerPot = roundMoney(totalSkins * stake * opponentCount)
    const carryoverPot = roundMoney(nextCarryover * stake * opponentCount)

    const holeResult = {
      hole,
      par: currentPar,
      gameMode,
      gameModeLabel,
      pot: hasTie ? carryoverPot : totalWinnerPot,
      skins: hasTie ? nextCarryover : totalSkins,
      baseSkins,
      bonusSkins: hasTie ? 0 : bonusSkins,
      carryoverSkins: carryover,
      carryoverAdded: hasTie ? baseSkins : 0,
      hasTie,
      specialScoringEnabled,
      specialScoringApplied,
      specialScoringLabel,
      bonusSkinsEnabled: specialScoringEnabled,
      bonusResult: specialScoringLabel,
      winningResult: winningResult.label,
      eagleBonusApplied: specialScoringApplied && specialScoringLabel === "Eagle 3 Skins",
      winner: hasTie ? "Carryover" : winner?.name,
      winningScore: lowestScore,
      course: { id: courseSnapshot.id, name: courseSnapshot.name },
      players: players.map((player) => ({ name: player.name, score: player.score, result: getGolfResult(player.score, currentPar) })),
    }

    const updatedHistory = [...history, holeResult]
    const playersAfterHole = players.map((player) => {
      const playerScore = toNumber(player.score, currentPar)
      const toPar = playerScore - currentPar
      const isWinner = !hasTie && winner && normalizeName(player.name) === normalizeName(winner.name)
      const skinDelta = isWinner ? totalSkins : 0
      const playerSpecialScoringApplied = Boolean(isWinner && specialScoringApplied)
      const playerSpecialScoringLabel = playerSpecialScoringApplied ? specialScoringLabel : null
      const playerBonusSkins = playerSpecialScoringApplied ? bonusSkins : 0

      return {
        ...player,
        total: toNumber(player.total, 0) + playerScore,
        totalToPar: toNumber(player.totalToPar, 0) + toPar,
        skins: toNumber(player.skins, 0) + skinDelta,
        holes: [...(Array.isArray(player.holes) ? player.holes : []), {
          hole,
          par: currentPar,
          score: playerScore,
          toPar,
          courseId: courseSnapshot.id,
          gameMode,
          gameModeLabel,
          result: getGolfResult(playerScore, currentPar),
          skinDelta,
          winningsDelta: 0,
          totalSkins: hasTie ? 0 : totalSkins,
          baseSkins,
          bonusSkins: playerBonusSkins,
          carryoverAdded: hasTie ? baseSkins : 0,
          specialScoringEnabled,
          specialScoringApplied: playerSpecialScoringApplied,
          specialScoringLabel: playerSpecialScoringLabel,
          bonusSkinsEnabled: specialScoringEnabled,
          bonusResult: playerSpecialScoringLabel,
          winningResult: winningResult.label,
          eagleBonusApplied: playerSpecialScoringApplied && playerSpecialScoringLabel === "Eagle 3 Skins",
        }],
        score: currentPars[hole] || DEFAULT_SCORE,
      }
    })
    const updatedPlayers = settlePlayersAfterHole(playersAfterHole, players, stake)

    setHistory(updatedHistory)
    setPlayers(updatedPlayers)

    if (hasTie) {
      setCarryover(nextCarryover)
    } else {
      setCarryover(0)
      if (winner) {
        const winnerResult = getGolfResult(winner.score, currentPar)
        const winnerSpecialScoringLabel = getSpecialScoringLabel(winner.score, currentPar, specialScoringEnabled)
        const winnerBonusSkins = getBonusSkinsForScore(winner.score, currentPar, specialScoringEnabled)
        const winnerSpecialScoringApplied = Boolean(specialScoringEnabled && winnerSpecialScoringLabel && winnerBonusSkins > 0)
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
          specialScoringApplied: winnerSpecialScoringApplied,
          specialScoringLabel: winnerSpecialScoringApplied ? winnerSpecialScoringLabel : null,
          bonusSkinsEnabled: specialScoringEnabled,
          bonusResult: winnerSpecialScoringApplied ? winnerSpecialScoringLabel : null,
          winningResult: winnerResult.label,
          eagleBonusApplied: winnerSpecialScoringApplied && winnerSpecialScoringLabel === "Eagle 3 Skins",
        })
        window.setTimeout(() => setCelebration(null), 2200)
      }
    }

    if (hole >= HOLE_COUNT) {
      const finalPlayers = updatedPlayers.map((player) => ({ ...player, holes: Array.isArray(player.holes) ? player.holes.map((playedHole) => ({ ...playedHole })) : [] }))
      const completedRound = createCompletedRound({ activeMatchId, courseSnapshot, gameMode, gameModeLabel, finalPlayers, history: updatedHistory, stake, specialScoringEnabled })
      setCompletedRounds((previousRounds) => [completedRound, ...previousRounds])
      setMatchFinished(true)
      setHasActiveMatch(false)
      setActiveMatchId(createMatchId(matchCounter + 1))
      return
    }

    setHole(hole + 1)
  }, [matchFinished, hasActiveMatch, currentCourse, isWolffnMode, players, currentPar, carryover, stake, hole, gameMode, gameModeLabel, history, currentPars, activeMatchId, matchCounter, hasTie, winners, specialScoringEnabled, lowestScore])

  const resetGame = useCallback(() => {
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
    setActiveMatchId(createMatchId(matchCounter + 1))
  }, [matchCounter])

  const deleteCompletedRound = useCallback((roundId) => {
    const normalizedRoundId = String(roundId || "").trim()
    if (!normalizedRoundId) return false
    setCompletedRounds((previousRounds) => previousRounds.filter((round) => String(round?.id || "").trim() !== normalizedRoundId))
    return true
  }, [])

  const uniquePlayerNames = useMemo(() => {
    const playerMap = new Map()
    completedRounds.forEach((round) => {
      getRoundPlayers(round).forEach((player) => {
        const name = String(player?.name || "").trim()
        const key = normalizeName(name)
        if (name && !playerMap.has(key)) playerMap.set(key, name)
      })
    })
    players.forEach((player) => {
      const name = String(player?.name || "").trim()
      const key = normalizeName(name)
      if (name && !playerMap.has(key)) playerMap.set(key, name)
    })
    return Array.from(playerMap.values())
  }, [completedRounds, players])

  const playerStats = useMemo(() => {
    return uniquePlayerNames.map((playerName) => {
      const playerKey = normalizeName(playerName)
      const playerRounds = completedRounds.filter((round) => getRoundPlayers(round).some((player) => normalizeName(player.name) === playerKey))
      const wins = completedRounds.filter((round) => normalizeName(round.winner) === playerKey).length
      const birdies = completedRounds.reduce((total, round) => {
        const roundPlayer = getRoundPlayers(round).find((player) => normalizeName(player.name) === playerKey)
        return total + (roundPlayer?.holes?.filter((playedHole) => playedHole.result?.label === "Birdie").length || 0)
      }, 0)
      const eagles = completedRounds.reduce((total, round) => {
        const roundPlayer = getRoundPlayers(round).find((player) => normalizeName(player.name) === playerKey)
        return total + (roundPlayer?.holes?.filter((playedHole) => playedHole.result?.label === "Eagle" || playedHole.result?.label === "Albatross").length || 0)
      }, 0)
      const totalWinnings = roundMoney(completedRounds.reduce((total, round) => {
        const roundPlayer = getRoundPlayers(round).find((player) => normalizeName(player.name) === playerKey)
        return total + toNumber(roundPlayer?.winnings, 0)
      }, 0))
      const totalToPar = completedRounds.reduce((total, round) => {
        const roundPlayer = getRoundPlayers(round).find((player) => normalizeName(player.name) === playerKey)
        return total + toNumber(roundPlayer?.totalToPar, 0)
      }, 0)
      const totalStrokes = completedRounds.reduce((total, round) => {
        const roundPlayer = getRoundPlayers(round).find((player) => normalizeName(player.name) === playerKey)
        return total + toNumber(roundPlayer?.total, 0)
      }, 0)
      const avgToPar = playerRounds.length > 0 ? Number((totalToPar / playerRounds.length).toFixed(1)) : 0
      const averageScore = playerRounds.length > 0 ? Number((totalStrokes / playerRounds.length).toFixed(1)) : 0
      return { name: playerName, wins, birdies, eagles, totalWinnings, totalToPar, totalStrokes, avgToPar, averageScore, roundsPlayed: playerRounds.length }
    })
  }, [completedRounds, uniquePlayerNames])

  const value = useMemo(() => ({
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
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
    deleteCompletedRound,
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
    bonusSkinsEnabled: specialScoringEnabled,
    setBonusSkinsEnabled: setSpecialScoringEnabled,
    eagleBonusEnabled: specialScoringEnabled,
    setEagleBonusEnabled: setSpecialScoringEnabled,
    eagleBonusAvailable: false,
    updateScore,
    finishHole,
    startMatch,
    resetGame,
    getGolfResult,
  }), [courses, addCourse, updateCourse, deleteCourse, gameMode, setGameMode, gameModeLabel, isWolffnMode, isProfessionalMode, selectedCourseId, setSelectedCourseId, currentCourse, hole, currentPar, carryover, currentBaseSkins, currentBonusSkins, currentSkinsAtStake, currentPot, players, stake, setStake, history, celebration, completedRounds, deleteCompletedRound, playerStats, activeMatchId, hasActiveMatch, matchFinished, lowestScore, winners, hasTie, specialScoringEnabled, setSpecialScoringEnabled, updateScore, finishHole, startMatch, resetGame])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider.")
  }
  return context
}