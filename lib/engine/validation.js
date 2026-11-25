import {
  GAME_MODES,
  MAXIMUM_OOZLE_PUTTS,
  MAXIMUM_PAR,
  MAXIMUM_PLAYERS,
  MAXIMUM_SCORE,
  MAXIMUM_STAKE_CENTS,
  MINIMUM_PAR,
  MINIMUM_PLAYERS,
  MINIMUM_SCORE,
  SCORING_MODES,
  SUPPORTED_HOLE_COUNTS,
  WOLFFN_DECISIONS,
  WOLFFN_PLAYERS,
} from "./constants.js"
import { fail } from "./errors.js"

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isPresent(value) {
  return value !== undefined && value !== null
}

function normalizeOozleConfig(rawOozle, gameMode) {
  const oozle = isPlainObject(rawOozle) ? rawOozle : {}
  const enabled = oozle.enabled === true

  if (!enabled) {
    return { enabled: false, valueCents: 0, carryoverEnabled: true }
  }

  if (gameMode === GAME_MODES.WOLFFN) {
    fail("OOZLE_NOT_ALLOWED", "Oozle ist bei Wolffn nicht verfügbar.")
  }

  if (
    !Number.isInteger(oozle.valueCents) ||
    oozle.valueCents < 1 ||
    oozle.valueCents > MAXIMUM_STAKE_CENTS
  ) {
    fail("INVALID_OOZLE_VALUE", "Der Oozle-Einsatz ist ungültig.")
  }

  return {
    enabled: true,
    valueCents: oozle.valueCents,
    carryoverEnabled: oozle.carryoverEnabled !== false,
  }
}

export function normalizeConfig(rawConfig) {
  if (!isPlainObject(rawConfig)) {
    fail("INVALID_CONFIG", "Die Match-Konfiguration fehlt.")
  }

  const { gameMode } = rawConfig

  if (!Object.values(GAME_MODES).includes(gameMode)) {
    fail("INVALID_GAME_MODE", "Der Spielmodus ist ungültig.")
  }

  const scoringMode = rawConfig.scoringMode ?? SCORING_MODES.GROSS

  if (scoringMode !== SCORING_MODES.GROSS) {
    fail(
      "UNSUPPORTED_SCORING_MODE",
      "Die Netto-Wertung wird noch nicht unterstützt."
    )
  }

  const { stakeCents, holeCount, pars } = rawConfig

  if (
    !Number.isInteger(stakeCents) ||
    stakeCents < 1 ||
    stakeCents > MAXIMUM_STAKE_CENTS
  ) {
    fail("INVALID_STAKE", "Der Einsatz pro Skin ist ungültig.")
  }

  if (!SUPPORTED_HOLE_COUNTS.includes(holeCount)) {
    fail("INVALID_HOLE_COUNT", "Ein Platz hat 9 oder 18 Löcher.")
  }

  if (
    !Array.isArray(pars) ||
    pars.length !== holeCount ||
    pars.some(
      (par) => !Number.isInteger(par) || par < MINIMUM_PAR || par > MAXIMUM_PAR
    )
  ) {
    fail("INVALID_PARS", "Die Par-Werte passen nicht zum Platz.")
  }

  return {
    gameMode,
    scoringMode,
    stakeCents,
    holeCount,
    pars: [...pars],
    oozle: normalizeOozleConfig(rawConfig.oozle, gameMode),
  }
}

export function normalizePlayerIds(rawPlayerIds, gameMode) {
  if (
    !Array.isArray(rawPlayerIds) ||
    rawPlayerIds.some((playerId) => typeof playerId !== "string" || playerId === "")
  ) {
    fail("INVALID_PLAYERS", "Die Spielerliste ist ungültig.")
  }

  if (new Set(rawPlayerIds).size !== rawPlayerIds.length) {
    fail("DUPLICATE_PLAYERS", "Ein Spieler darf nur einmal teilnehmen.")
  }

  if (rawPlayerIds.length < MINIMUM_PLAYERS || rawPlayerIds.length > MAXIMUM_PLAYERS) {
    fail("INVALID_PLAYER_COUNT", "Ein Match braucht zwei bis vier Spieler.")
  }

  if (gameMode === GAME_MODES.WOLFFN && rawPlayerIds.length !== WOLFFN_PLAYERS) {
    fail("INVALID_PLAYER_COUNT", "Wolffn braucht genau vier Spieler.")
  }

  return [...rawPlayerIds]
}

function normalizeScores(rawScores, playerIds, holeNumber) {
  if (!isPlainObject(rawScores)) {
    fail("INVALID_SCORES", `Für Loch ${holeNumber} fehlen die Scores.`)
  }

  const scoreKeys = Object.keys(rawScores)

  if (
    scoreKeys.length !== playerIds.length ||
    !playerIds.every((playerId) => Object.hasOwn(rawScores, playerId))
  ) {
    fail(
      "INVALID_SCORES",
      `Die Scores von Loch ${holeNumber} passen nicht zu den Spielern.`
    )
  }

  const scores = new Map()

  playerIds.forEach((playerId) => {
    const score = rawScores[playerId]

    if (!Number.isInteger(score) || score < MINIMUM_SCORE || score > MAXIMUM_SCORE) {
      fail(
        "INVALID_SCORE",
        `Der Score von Loch ${holeNumber} muss zwischen ${MINIMUM_SCORE} und ${MAXIMUM_SCORE} liegen.`
      )
    }

    scores.set(playerId, score)
  })

  return scores
}

function normalizeWolffnInput(rawWolffn, holeNumber) {
  if (!isPlainObject(rawWolffn)) {
    fail("MISSING_WOLFFN_DECISION", `Für Loch ${holeNumber} fehlt die Wolffn-Entscheidung.`)
  }

  if (!Object.values(WOLFFN_DECISIONS).includes(rawWolffn.decision)) {
    fail("INVALID_WOLFFN_DECISION", `Die Wolffn-Entscheidung von Loch ${holeNumber} ist ungültig.`)
  }

  return {
    decision: rawWolffn.decision,
    askedPlayerId: isPresent(rawWolffn.askedPlayerId) ? rawWolffn.askedPlayerId : null,
  }
}

function normalizeOozleInput(rawOozle, playerIds, holeNumber) {
  if (!isPlainObject(rawOozle)) {
    fail("MISSING_OOZLE", `Für Loch ${holeNumber} fehlt die Oozle-Eingabe.`)
  }

  if (rawOozle.noGreen === true) {
    if (isPresent(rawOozle.playerId) || isPresent(rawOozle.putts)) {
      fail("INVALID_OOZLE", `Die Oozle-Eingabe von Loch ${holeNumber} ist widersprüchlich.`)
    }

    return { noGreen: true, playerId: null, putts: null }
  }

  if (
    !playerIds.includes(rawOozle.playerId) ||
    !Number.isInteger(rawOozle.putts) ||
    rawOozle.putts < 1 ||
    rawOozle.putts > MAXIMUM_OOZLE_PUTTS
  ) {
    fail("INVALID_OOZLE", `Die Oozle-Eingabe von Loch ${holeNumber} ist ungültig.`)
  }

  return { noGreen: false, playerId: rawOozle.playerId, putts: rawOozle.putts }
}

export function normalizeHoles(rawHoles, config, playerIds) {
  if (!Array.isArray(rawHoles) || rawHoles.length > config.holeCount) {
    fail("INVALID_HOLES", "Die Lochliste ist ungültig.")
  }

  return rawHoles.map((rawHole, index) => {
    const holeNumber = index + 1

    if (!isPlainObject(rawHole) || (isPresent(rawHole.holeNumber) && rawHole.holeNumber !== holeNumber)) {
      fail("INVALID_HOLES", "Die Löcher müssen lückenlos ab Loch 1 geliefert werden.")
    }

    const isWolffn = config.gameMode === GAME_MODES.WOLFFN
    const oozleRequired = config.oozle.enabled && config.pars[index] === 3

    if (isWolffn && isPresent(rawHole.oozle)) {
      fail("OOZLE_NOT_ALLOWED", "Oozle ist bei Wolffn nicht verfügbar.")
    }

    if (!isWolffn && isPresent(rawHole.wolffn)) {
      fail("WOLFFN_NOT_ALLOWED", "Wolffn-Daten gibt es nur im Modus Wolffn.")
    }

    if (!isWolffn && !oozleRequired && isPresent(rawHole.oozle)) {
      fail("OOZLE_NOT_ALLOWED", `Loch ${holeNumber} ist kein Oozle-Loch.`)
    }

    return {
      holeNumber,
      scores: normalizeScores(rawHole.scores, playerIds, holeNumber),
      wolffn: isWolffn ? normalizeWolffnInput(rawHole.wolffn, holeNumber) : null,
      oozle: oozleRequired ? normalizeOozleInput(rawHole.oozle, playerIds, holeNumber) : null,
    }
  })
}

export function normalizeMatchInput(rawInput) {
  if (!isPlainObject(rawInput)) {
    fail("INVALID_INPUT", "Die Match-Daten fehlen.")
  }

  const config = normalizeConfig(rawInput.config)
  const playerIds = normalizePlayerIds(rawInput.players, config.gameMode)
  const holes = normalizeHoles(rawInput.holes ?? [], config, playerIds)

  return { config, playerIds, holes }
}
