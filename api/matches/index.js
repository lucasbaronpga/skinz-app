import { randomUUID } from "node:crypto"
import {
  requireActiveUser,
  setNoStoreHeaders,
} from "../../lib/auth.js"
import { getSql } from "../../lib/database.js"

const SUPPORTED_GAME_MODES = new Set(["classic", "professional", "wolffn"])
const SUPPORTED_HOLE_COUNTS = new Set([9, 18])
const MINIMUM_PLAYER_COUNT = 2
const MAXIMUM_PLAYER_COUNT = 4
const DEFAULT_OOZLE_VALUE = 1

function sendMethodNotAllowed(response) {
  response.setHeader("Allow", "GET, POST, PATCH")
  return response.status(405).json({ error: "Method not allowed." })
}

function getRequestBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body
  }

  if (typeof request.body !== "string" || !request.body.trim()) return {}

  try {
    return JSON.parse(request.body)
  } catch {
    return null
  }
}

function normalizeUuid(value) {
  const normalizedValue = String(value || "").trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    normalizedValue
  )
    ? normalizedValue
    : null
}

function normalizeGameMode(value) {
  const gameMode = String(value || "").trim().toLowerCase()
  return SUPPORTED_GAME_MODES.has(gameMode) ? gameMode : null
}

function normalizePositiveMoney(value, fallback = null) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return fallback
  return Math.round(amount * 100) / 100
}

function normalizePlayerIds(players) {
  if (!Array.isArray(players)) return null

  const playerIds = players.map((player) =>
    normalizeUuid(player && typeof player === "object" ? player.userId || player.id : player)
  )

  if (playerIds.some((playerId) => !playerId)) return null
  if (new Set(playerIds).size !== playerIds.length) return null

  return playerIds
}

function normalizeOozleConfig(config, gameMode) {
  const enabled = Boolean(config?.enabled) && gameMode !== "wolffn"
  const value = enabled
    ? normalizePositiveMoney(config?.value, DEFAULT_OOZLE_VALUE)
    : null

  return {
    enabled,
    value,
    foozleEnabled: config?.foozleEnabled !== false,
    carryoverEnabled: config?.carryoverEnabled !== false,
  }
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toIsoString(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeMatchCode(value) {
  const matchCode = String(value || "").trim().toUpperCase()
  return /^SKZ-[0-9]{4,}$/.test(matchCode) ? matchCode : null
}

function buildCourseSnapshot(course, holes, tees, teeHoles) {
  const lengthsByTeeId = new Map()

  teeHoles.forEach((teeHole) => {
    const teeId = String(teeHole.tee_id)
    const lengths = lengthsByTeeId.get(teeId) || new Map()
    lengths.set(Number(teeHole.hole_number), Number(teeHole.length_meters))
    lengthsByTeeId.set(teeId, lengths)
  })

  return {
    id: course.id,
    clubId: course.golf_club_id,
    clubName: course.club_name,
    name: course.name,
    location: course.location || "",
    state: course.state || "",
    country: course.country || "Deutschland",
    holeCount: Number(course.hole_count),
    par: holes.reduce((total, hole) => total + Number(hole.par), 0),
    pars: holes.map((hole) => Number(hole.par)),
    handicapIndexes: holes.map((hole) =>
      hole.handicap_index === null ? null : Number(hole.handicap_index)
    ),
    tees: tees.map((tee) => {
      const lengths = lengthsByTeeId.get(String(tee.id)) || new Map()

      return {
        id: tee.id,
        name: tee.name,
        color: tee.color || "",
        ratingCategory: tee.rating_category || null,
        courseRating: toNumberOrNull(tee.course_rating),
        slopeRating: toNumberOrNull(tee.slope_rating),
        lengths: holes.map((hole) => lengths.get(Number(hole.hole_number)) || null),
      }
    }),
  }
}

function mapPlayerRow(player) {
  return {
    id: player.id,
    userId: player.user_id,
    displayOrder: Number(player.display_order),
    name: player.display_name_snapshot,
    handicapIndex: toNumberOrNull(player.handicap_index_snapshot),
    homeClubId: player.home_club_id_snapshot || null,
    homeClubName: player.home_club_name_snapshot || null,
    total: Number(player.total_strokes),
    totalToPar: Number(player.total_to_par),
    skins: Number(player.skinz_won),
    skinzWinnings: Number(player.skinz_winnings),
    oozleWinnings: Number(player.oozle_winnings),
    winnings: Number(player.total_winnings),
  }
}

function mapMatchRow(match, players, holes = [], settlements = []) {
  return {
    id: match.id,
    matchCode: match.match_code,
    status: match.status,
    gameMode: match.game_mode,
    stake: Number(match.stake_amount),
    holeCount: Number(match.hole_count),
    currentHole: Number(match.current_hole),
    carryover: Number(match.skinz_carryover),
    oozleCarryover: Number(match.oozle_carryover),
    specialScoringEnabled: Boolean(match.special_scoring_enabled),
    oozleConfig: {
      enabled: Boolean(match.oozle_enabled),
      value: toNumberOrNull(match.oozle_value),
      foozleEnabled: Boolean(match.oozle_foozle_enabled),
      carryoverEnabled: Boolean(match.oozle_carryover_enabled),
    },
    course: match.course_snapshot,
    stateVersion: Number(match.state_version),
    startedAt: toIsoString(match.started_at),
    completedAt: toIsoString(match.completed_at),
    createdAt: toIsoString(match.created_at),
    updatedAt: toIsoString(match.updated_at),
    players,
    holes,
  }
}

function mapHoleRow(hole, playerHoles = []) {
  return {
    id: hole.id,
    holeNumber: Number(hole.hole_number),
    par: Number(hole.par),
    winnerLabel: hole.winner_label || null,
    winningScore: toNumberOrNull(hole.winning_score),
    hasTie: Boolean(hole.has_tie),
    skinzAwarded: Number(hole.skinz_awarded),
    carryoverBefore: Number(hole.carryover_before),
    carryoverAfter: Number(hole.carryover_after),
    potAmount: Number(hole.pot_amount),
    specialScoringLabel: hole.special_scoring_label || null,
    gameData: hole.game_data || {},
    completedAt: toIsoString(hole.completed_at),
    players: playerHoles,
  }
}

function mapPlayerHoleRow(playerHole) {
  return {
    userId: playerHole.user_id,
    score: Number(playerHole.score),
    toPar: Number(playerHole.to_par),
    skinzDelta: Number(playerHole.skinz_delta),
    winningsDelta: Number(playerHole.winnings_delta),
    oozleWinningsDelta: Number(playerHole.oozle_winnings_delta),
    resultLabel: playerHole.result_label,
    resultData: playerHole.result_data || {},
  }
}

async function handleGet(request, response, currentUser) {
  const sql = getSql()
  const currentUserId = currentUser.user_id || currentUser.id

  const matches = await sql`
    SELECT
      m.id,
      m.match_code,
      m.status,
      m.game_mode,
      m.stake_amount,
      m.hole_count,
      m.current_hole,
      m.skinz_carryover,
      m.oozle_carryover,
      m.special_scoring_enabled,
      m.oozle_enabled,
      m.oozle_value,
      m.oozle_foozle_enabled,
      m.oozle_carryover_enabled,
      m.course_snapshot,
      m.state_version,
      m.started_at,
      m.completed_at,
      m.created_at,
      m.updated_at
    FROM matches AS m
    JOIN match_players AS current_player
      ON current_player.match_id = m.id
    WHERE current_player.user_id = ${currentUserId}
      AND m.status IN ('active', 'completed')
    ORDER BY
      CASE WHEN m.status = 'active' THEN 0 ELSE 1 END,
      COALESCE(m.completed_at, m.updated_at) DESC,
      m.id DESC
  `

  if (matches.length === 0) {
    return response.status(200).json({ matches: [] })
  }

  const matchIds = matches.map((match) => match.id)
  const playerRows = await sql`
    SELECT
      mp.id,
      mp.match_id,
      mp.user_id,
      mp.display_order,
      mp.display_name_snapshot,
      mp.handicap_index_snapshot,
      mp.home_club_id_snapshot,
      mp.home_club_name_snapshot,
      mp.total_strokes,
      mp.total_to_par,
      mp.skinz_won,
      mp.skinz_winnings,
      mp.oozle_winnings,
      mp.total_winnings
    FROM match_players AS mp
    WHERE mp.match_id = ANY(${matchIds}::uuid[])
    ORDER BY mp.match_id, mp.display_order
  `

  const playersByMatchId = new Map()
  playerRows.forEach((player) => {
    const matchId = String(player.match_id)
    const matchPlayers = playersByMatchId.get(matchId) || []
    matchPlayers.push(mapPlayerRow(player))
    playersByMatchId.set(matchId, matchPlayers)
  })

  const holeRows = await sql`
    SELECT
      mh.id, mh.match_id, mh.hole_number, mh.par, mh.winner_label,
      mh.winning_score, mh.has_tie, mh.skinz_awarded, mh.carryover_before,
      mh.carryover_after, mh.pot_amount, mh.special_scoring_label,
      mh.game_data, mh.completed_at
    FROM match_holes AS mh
    WHERE mh.match_id = ANY(${matchIds}::uuid[])
      AND mh.status = 'completed'
    ORDER BY mh.match_id, mh.hole_number
  `

  const matchHoleIds = holeRows.map((hole) => hole.id)
  const playerHoleRows = matchHoleIds.length
    ? await sql`
        SELECT
          mph.match_hole_id, mp.user_id, mph.score, mph.to_par,
          mph.skinz_delta, mph.winnings_delta, mph.oozle_winnings_delta,
          mph.result_label, mph.result_data
        FROM match_player_holes AS mph
        JOIN match_players AS mp ON mp.id = mph.match_player_id
        WHERE mph.match_hole_id = ANY(${matchHoleIds}::uuid[])
        ORDER BY mph.match_hole_id, mp.display_order
      `
    : []

  const playerHolesByHoleId = new Map()
  playerHoleRows.forEach((playerHole) => {
    const holeId = String(playerHole.match_hole_id)
    const entries = playerHolesByHoleId.get(holeId) || []
    entries.push(mapPlayerHoleRow(playerHole))
    playerHolesByHoleId.set(holeId, entries)
  })

  const settlementRows = await sql`
    SELECT
      ms.id, ms.match_id, ms.amount,
      payer.user_id AS payer_user_id,
      payer.display_name_snapshot AS payer_name,
      recipient.user_id AS recipient_user_id,
      recipient.display_name_snapshot AS recipient_name
    FROM match_settlements AS ms
    JOIN match_players AS payer ON payer.id = ms.payer_match_player_id
    JOIN match_players AS recipient ON recipient.id = ms.recipient_match_player_id
    WHERE ms.match_id = ANY(${matchIds}::uuid[])
    ORDER BY ms.match_id, payer.display_order, recipient.display_order
  `
  const settlementsByMatchId = new Map()
  settlementRows.forEach((settlement) => {
    const matchId = String(settlement.match_id)
    const entries = settlementsByMatchId.get(matchId) || []
    entries.push(mapSettlementRow(settlement))
    settlementsByMatchId.set(matchId, entries)
  })
  const holesByMatchId = new Map()
  holeRows.forEach((hole) => {
    const matchId = String(hole.match_id)
    const entries = holesByMatchId.get(matchId) || []
    entries.push(
      mapHoleRow(hole, playerHolesByHoleId.get(String(hole.id)) || [])
    )
    holesByMatchId.set(matchId, entries)
  })

  return response.status(200).json({
    matches: matches.map((match) => {
      const matchId = String(match.id)
      return mapMatchRow(
        match,
        playersByMatchId.get(matchId) || [],
        holesByMatchId.get(matchId) || [],
        settlementsByMatchId.get(matchId) || []
      )
    }),
  })
}

async function handlePost(request, response, currentUser) {
  const body = getRequestBody(request)
  if (!body) {
    return response.status(400).json({ error: "Ungueltige JSON-Daten." })
  }

  const currentUserId = normalizeUuid(currentUser.user_id || currentUser.id)
  const matchCode = normalizeMatchCode(body.matchCode)
  const golfCourseId = normalizeUuid(body.golfCourseId || body.courseId)
  const gameMode = normalizeGameMode(body.gameMode)
  const stake = normalizePositiveMoney(body.stake)
  const playerIds = normalizePlayerIds(body.players)

  if (!currentUserId || !matchCode || !golfCourseId || !gameMode || !stake || !playerIds) {
    return response.status(400).json({ error: "Die Match-Daten sind unvollstaendig oder ungueltig." })
  }

  if (
    playerIds.length < MINIMUM_PLAYER_COUNT ||
    playerIds.length > MAXIMUM_PLAYER_COUNT
  ) {
    return response.status(400).json({ error: "Ein Match benoetigt zwei bis vier Spieler." })
  }

  if (!playerIds.includes(currentUserId)) {
    return response.status(400).json({ error: "Der angemeldete Benutzer muss Teil des Matches sein." })
  }

  if (gameMode === "wolffn" && playerIds.length !== 4) {
    return response.status(400).json({ error: "Wolffn benoetigt genau vier Spieler." })
  }

  const oozleConfig = normalizeOozleConfig(body.oozleConfig, gameMode)
  if (gameMode === "wolffn" && body.oozleConfig?.enabled) {
    return response.status(400).json({ error: "Oozle ist bei Wolffn nicht verfuegbar." })
  }

  const sql = getSql()
  const courses = await sql`
    SELECT
      c.id,
      c.golf_club_id,
      c.name,
      c.hole_count,
      gc.name AS club_name,
      gc.location,
      gc.state,
      gc.country
    FROM golf_courses AS c
    JOIN golf_clubs AS gc ON gc.id = c.golf_club_id
    WHERE c.id = ${golfCourseId}
      AND c.is_active = TRUE
      AND gc.is_active = TRUE
    LIMIT 1
  `

  const course = courses[0]
  if (!course || !SUPPORTED_HOLE_COUNTS.has(Number(course.hole_count))) {
    return response.status(404).json({ error: "Der Golfplatz ist nicht spielbar." })
  }

  const holes = await sql`
    SELECT id, hole_number, par, handicap_index
    FROM golf_course_holes
    WHERE golf_course_id = ${golfCourseId}
    ORDER BY hole_number
  `

  if (
    holes.length !== Number(course.hole_count) ||
    holes.some((hole, index) => Number(hole.hole_number) !== index + 1)
  ) {
    return response.status(409).json({ error: "Der Golfplatz ist nicht vollstaendig konfiguriert." })
  }

  const users = await sql`
    SELECT
      u.id,
      u.display_name,
      u.handicap_index,
      u.home_club_id,
      gc.name AS home_club_name
    FROM users AS u
    LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
    WHERE u.id = ANY(${playerIds}::uuid[])
      AND u.status = 'active'
  `

  if (users.length !== playerIds.length) {
    return response.status(409).json({ error: "Mindestens ein Spieler ist nicht mehr aktiv." })
  }

  const tees = await sql`
    SELECT
      id,
      name,
      color,
      rating_category,
      course_rating,
      slope_rating,
      display_order
    FROM golf_course_tees
    WHERE golf_course_id = ${golfCourseId}
      AND is_active = TRUE
    ORDER BY display_order, name, id
  `

  const teeHoles = tees.length
    ? await sql`
        SELECT
          th.golf_course_tee_id AS tee_id,
          h.hole_number,
          th.length_meters
        FROM golf_course_tee_holes AS th
        JOIN golf_course_holes AS h ON h.id = th.golf_course_hole_id
        WHERE th.golf_course_tee_id = ANY(${tees.map((tee) => tee.id)}::uuid[])
        ORDER BY th.golf_course_tee_id, h.hole_number
      `
    : []

  const courseSnapshot = buildCourseSnapshot(course, holes, tees, teeHoles)
  const usersById = new Map(users.map((user) => [String(user.id), user]))
  const orderedUsers = playerIds.map((playerId) => usersById.get(playerId))
  const existingMatches = await sql`
    SELECT id
    FROM matches
    WHERE LOWER(BTRIM(match_code)) = LOWER(BTRIM(${matchCode}))
    LIMIT 1
  `
  if (existingMatches.length > 0) {
    return response.status(409).json({ error: "Diese Skinz Match ID ist bereits vergeben." })
  }

  const matchId = randomUUID()
  const specialScoringEnabled = gameMode === "professional"

  const transactionQueries = [
    sql`
      INSERT INTO matches (
        id,
        match_code,
        created_by_user_id,
        golf_course_id,
        status,
        game_mode,
        stake_amount,
        hole_count,
        current_hole,
        skinz_carryover,
        oozle_carryover,
        special_scoring_enabled,
        oozle_enabled,
        oozle_value,
        oozle_foozle_enabled,
        oozle_carryover_enabled,
        course_snapshot
      )
      VALUES (
        ${matchId},
        ${matchCode},
        ${currentUserId},
        ${golfCourseId},
        'active',
        ${gameMode},
        ${stake},
        ${Number(course.hole_count)},
        1,
        0,
        0,
        ${specialScoringEnabled},
        ${oozleConfig.enabled},
        ${oozleConfig.value},
        ${oozleConfig.foozleEnabled},
        ${oozleConfig.carryoverEnabled},
        ${JSON.stringify(courseSnapshot)}::jsonb
      )
    `,
    ...orderedUsers.map((user, index) => sql`
      INSERT INTO match_players (
        match_id,
        user_id,
        display_order,
        display_name_snapshot,
        handicap_index_snapshot,
        home_club_id_snapshot,
        home_club_name_snapshot
      )
      VALUES (
        ${matchId},
        ${user.id},
        ${index + 1},
        ${user.display_name},
        ${user.handicap_index},
        ${user.home_club_id},
        ${user.home_club_name}
      )
    `),
  ]

  await sql.transaction(transactionQueries)

  const createdMatches = await sql`
    SELECT
      id,
      match_code,
      status,
      game_mode,
      stake_amount,
      hole_count,
      current_hole,
      skinz_carryover,
      oozle_carryover,
      special_scoring_enabled,
      oozle_enabled,
      oozle_value,
      oozle_foozle_enabled,
      oozle_carryover_enabled,
      course_snapshot,
      state_version,
      started_at,
      completed_at,
      created_at,
      updated_at
    FROM matches
    WHERE id = ${matchId}
    LIMIT 1
  `

  const createdPlayers = await sql`
    SELECT
      id,
      user_id,
      display_order,
      display_name_snapshot,
      handicap_index_snapshot,
      home_club_id_snapshot,
      home_club_name_snapshot,
      total_strokes,
      total_to_par,
      skinz_won,
      skinz_winnings,
      oozle_winnings,
      total_winnings
    FROM match_players
    WHERE match_id = ${matchId}
    ORDER BY display_order
  `

  return response.status(201).json({
    match: mapMatchRow(createdMatches[0], createdPlayers.map(mapPlayerRow)),
  })
}


function normalizeInteger(value, minimum, maximum) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < minimum || number > maximum) return null
  return number
}

function normalizeMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.round(number * 100) / 100
}

function normalizeHolePlayers(players) {
  if (!Array.isArray(players) || players.length < MINIMUM_PLAYER_COUNT) return null

  const normalizedPlayers = players.map((player) => {
    const userId = normalizeUuid(player?.userId)
    const score = normalizeInteger(player?.score, 1, 20)
    const toPar = normalizeInteger(player?.toPar, -10, 17)
    const skinzDelta = normalizeInteger(player?.skinzDelta, 0, 100000)
    const winningsDelta = normalizeMoney(player?.winningsDelta)
    const oozleWinningsDelta = normalizeMoney(player?.oozleWinningsDelta)
    const totalStrokes = normalizeInteger(player?.totalStrokes, 0, 1000)
    const totalToPar = normalizeInteger(player?.totalToPar, -200, 500)
    const skinzWon = normalizeInteger(player?.skinzWon, 0, 100000)
    const skinzWinnings = normalizeMoney(player?.skinzWinnings)
    const oozleWinnings = normalizeMoney(player?.oozleWinnings)
    const totalWinnings = normalizeMoney(player?.totalWinnings)
    const resultLabel = String(player?.resultLabel || "").trim()

    if (
      !userId || score === null || toPar === null || skinzDelta === null ||
      winningsDelta === null || oozleWinningsDelta === null ||
      totalStrokes === null || totalToPar === null || skinzWon === null ||
      skinzWinnings === null || oozleWinnings === null || totalWinnings === null ||
      !resultLabel
    ) {
      return null
    }

    return {
      userId,
      score,
      toPar,
      skinzDelta,
      winningsDelta,
      oozleWinningsDelta,
      totalStrokes,
      totalToPar,
      skinzWon,
      skinzWinnings,
      oozleWinnings,
      totalWinnings,
      resultLabel,
      resultData: player?.resultData && typeof player.resultData === "object"
        ? player.resultData
        : {},
    }
  })

  if (normalizedPlayers.some((player) => !player)) return null
  if (new Set(normalizedPlayers.map((player) => player.userId)).size !== normalizedPlayers.length) {
    return null
  }
  return normalizedPlayers
}

function normalizeSettlements(settlements) {
  if (!Array.isArray(settlements)) return null
  const normalized = settlements.map((settlement) => {
    const payerUserId = normalizeUuid(settlement?.payerUserId)
    const recipientUserId = normalizeUuid(settlement?.recipientUserId)
    const amount = normalizePositiveMoney(settlement?.amount)
    if (!payerUserId || !recipientUserId || payerUserId === recipientUserId || !amount) {
      return null
    }
    return { payerUserId, recipientUserId, amount }
  })
  if (normalized.some((settlement) => !settlement)) return null
  const pairKeys = normalized.map(
    (settlement) => `${settlement.payerUserId}:${settlement.recipientUserId}`
  )
  if (new Set(pairKeys).size !== pairKeys.length) return null
  return normalized
}

async function handlePatch(request, response, currentUser) {
  const body = getRequestBody(request)
  if (!body) return response.status(400).json({ error: "Ungueltige JSON-Daten." })

  const matchId = normalizeUuid(body.matchId)
  const holeNumber = normalizeInteger(body.holeNumber, 1, 18)
  const par = normalizeInteger(body.par, 3, 6)
  const winningScore = body.winningScore === null || body.winningScore === undefined
    ? null
    : normalizeInteger(body.winningScore, 1, 20)
  const skinzAwarded = normalizeInteger(body.skinzAwarded, 0, 100000)
  const carryoverBefore = normalizeInteger(body.carryoverBefore, 0, 100000)
  const carryoverAfter = normalizeInteger(body.carryoverAfter, 0, 100000)
  const oozleCarryoverAfter = normalizeInteger(body.oozleCarryoverAfter, 0, 100000)
  const potAmount = normalizeMoney(body.potAmount)
  const players = normalizeHolePlayers(body.players)
  const isCompleted = Boolean(body.isCompleted)
  const settlements = isCompleted ? normalizeSettlements(body.settlements) : []

  if (
    !matchId || holeNumber === null || par === null ||
    (body.winningScore !== null && body.winningScore !== undefined && winningScore === null) ||
    skinzAwarded === null || carryoverBefore === null || carryoverAfter === null ||
    oozleCarryoverAfter === null || potAmount === null || potAmount < 0 || !players ||
    (isCompleted && settlements === null)
  ) {
    return response.status(400).json({ error: "Die Lochdaten sind unvollstaendig oder ungueltig." })
  }

  const sql = getSql()
  const currentUserId = currentUser.user_id || currentUser.id
  const matches = await sql`
    SELECT m.id, m.status, m.hole_count, m.current_hole, m.state_version
    FROM matches AS m
    JOIN match_players AS mp ON mp.match_id = m.id
    WHERE m.id = ${matchId}
      AND mp.user_id = ${currentUserId}
    LIMIT 1
  `
  const match = matches[0]
  if (!match) return response.status(404).json({ error: "Match nicht gefunden." })
  if (match.status !== "active") {
    return response.status(409).json({ error: "Das Match ist nicht mehr aktiv." })
  }
  if (holeNumber !== Number(match.current_hole) || holeNumber > Number(match.hole_count)) {
    return response.status(409).json({ error: "Das Loch entspricht nicht dem aktuellen Matchstand." })
  }
  if (isCompleted !== (holeNumber === Number(match.hole_count))) {
    return response.status(409).json({ error: "Der Abschlussstatus des Matches ist ungueltig." })
  }

  const matchPlayers = await sql`
    SELECT id, user_id
    FROM match_players
    WHERE match_id = ${matchId}
    ORDER BY display_order
  `
  if (
    matchPlayers.length !== players.length ||
    matchPlayers.some((matchPlayer) => !players.some((player) => player.userId === String(matchPlayer.user_id)))
  ) {
    return response.status(409).json({ error: "Die Spieler stimmen nicht mit dem Match ueberein." })
  }

  const matchPlayerByUserId = new Map(
    matchPlayers.map((matchPlayer) => [String(matchPlayer.user_id), matchPlayer])
  )
  if (
    settlements.some(
      (settlement) =>
        !matchPlayerByUserId.has(settlement.payerUserId) ||
        !matchPlayerByUserId.has(settlement.recipientUserId)
    )
  ) {
    return response.status(409).json({ error: "Die Abrechnung enthält unbekannte Spieler." })
  }
  const settlementBalanceByUserId = new Map(
    matchPlayers.map((matchPlayer) => [String(matchPlayer.user_id), 0])
  )
  settlements.forEach((settlement) => {
    settlementBalanceByUserId.set(
      settlement.payerUserId,
      normalizeMoney(settlementBalanceByUserId.get(settlement.payerUserId) - settlement.amount)
    )
    settlementBalanceByUserId.set(
      settlement.recipientUserId,
      normalizeMoney(settlementBalanceByUserId.get(settlement.recipientUserId) + settlement.amount)
    )
  })
  if (
    isCompleted &&
    players.some(
      (player) =>
        Math.abs(
          normalizeMoney(settlementBalanceByUserId.get(player.userId)) - player.totalWinnings
        ) > 0.009
    )
  ) {
    return response.status(409).json({ error: "Die Endabrechnung stimmt nicht mit den Spielersummen überein." })
  }
  const existingHole = await sql`
    SELECT id
    FROM match_holes
    WHERE match_id = ${matchId}
      AND hole_number = ${holeNumber}
      AND status = 'completed'
    LIMIT 1
  `
  if (existingHole.length > 0) {
    return response.status(409).json({ error: "Dieses Loch wurde bereits gespeichert." })
  }

  const matchHoleId = randomUUID()
  const nextHole = isCompleted ? holeNumber : holeNumber + 1
  const nextVersion = Number(match.state_version) + 1
  const gameData = body.gameData && typeof body.gameData === "object" ? body.gameData : {}
  const playerByUserId = new Map(players.map((player) => [player.userId, player]))

  const transactionQueries = [
    sql`
      INSERT INTO match_holes (
        id, match_id, hole_number, par, status, winner_label, winning_score,
        has_tie, skinz_awarded, carryover_before, carryover_after, pot_amount,
        special_scoring_label, game_data
      ) VALUES (
        ${matchHoleId}, ${matchId}, ${holeNumber}, ${par}, 'completed',
        ${String(body.winnerLabel || "").trim() || null}, ${winningScore},
        ${Boolean(body.hasTie)}, ${skinzAwarded}, ${carryoverBefore},
        ${carryoverAfter}, ${potAmount},
        ${String(body.specialScoringLabel || "").trim() || null},
        ${JSON.stringify(gameData)}::jsonb
      )
    `,
    ...matchPlayers.map((matchPlayer) => {
      const player = playerByUserId.get(String(matchPlayer.user_id))
      return sql`
        INSERT INTO match_player_holes (
          match_hole_id, match_player_id, score, to_par, skinz_delta,
          winnings_delta, oozle_winnings_delta, result_label, result_data
        ) VALUES (
          ${matchHoleId}, ${matchPlayer.id}, ${player.score}, ${player.toPar},
          ${player.skinzDelta}, ${player.winningsDelta}, ${player.oozleWinningsDelta},
          ${player.resultLabel}, ${JSON.stringify(player.resultData)}::jsonb
        )
      `
    }),
    ...matchPlayers.map((matchPlayer) => {
      const player = playerByUserId.get(String(matchPlayer.user_id))
      return sql`
        UPDATE match_players
        SET total_strokes = ${player.totalStrokes},
            total_to_par = ${player.totalToPar},
            skinz_won = ${player.skinzWon},
            skinz_winnings = ${player.skinzWinnings},
            oozle_winnings = ${player.oozleWinnings},
            total_winnings = ${player.totalWinnings},
            updated_at = NOW()
        WHERE id = ${matchPlayer.id}
      `
    }),
    ...(isCompleted
      ? [
          sql`DELETE FROM match_settlements WHERE match_id = ${matchId}`,
          ...settlements.map((settlement) => sql`
            INSERT INTO match_settlements (
              match_id, payer_match_player_id, recipient_match_player_id, amount
            ) VALUES (
              ${matchId},
              ${matchPlayerByUserId.get(settlement.payerUserId).id},
              ${matchPlayerByUserId.get(settlement.recipientUserId).id},
              ${settlement.amount}
            )
          `),
        ]
      : []),
    sql`
      UPDATE matches
      SET current_hole = ${nextHole},
          skinz_carryover = ${carryoverAfter},
          oozle_carryover = ${oozleCarryoverAfter},
          state_version = ${nextVersion},
          status = ${isCompleted ? "completed" : "active"},
          completed_at = ${isCompleted ? new Date().toISOString() : null},
          updated_at = NOW()
      WHERE id = ${matchId}
    `,
  ]

  await sql.transaction(transactionQueries)
  return response.status(200).json({
    match: {
      id: matchId,
      status: isCompleted ? "completed" : "active",
      currentHole: nextHole,
      stateVersion: nextVersion,
    },
  })
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    return sendMethodNotAllowed(response)
  }

  try {
    const currentUser = await requireActiveUser(request)
    if (!currentUser) {
      return response.status(401).json({ error: "Anmeldung erforderlich." })
    }

    if (request.method === "GET") {
      return await handleGet(request, response, currentUser)
    }

    if (request.method === "PATCH") {
      return await handlePatch(request, response, currentUser)
    }

    return await handlePost(request, response, currentUser)
  } catch (error) {
    console.error("Match request failed.", error)
    return response.status(500).json({ error: "Match konnte nicht verarbeitet werden." })
  }
}
