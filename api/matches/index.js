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
  response.setHeader("Allow", "GET, POST")
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

function createMatchCode(matchId) {
  return `SKZ-${matchId.replaceAll("-", "").slice(0, 12).toUpperCase()}`
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

function mapMatchRow(match, players) {
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

  return response.status(200).json({
    matches: matches.map((match) =>
      mapMatchRow(match, playersByMatchId.get(String(match.id)) || [])
    ),
  })
}

async function handlePost(request, response, currentUser) {
  const body = getRequestBody(request)
  if (!body) {
    return response.status(400).json({ error: "Ungueltige JSON-Daten." })
  }

  const currentUserId = normalizeUuid(currentUser.user_id || currentUser.id)
  const golfCourseId = normalizeUuid(body.golfCourseId || body.courseId)
  const gameMode = normalizeGameMode(body.gameMode)
  const stake = normalizePositiveMoney(body.stake)
  const playerIds = normalizePlayerIds(body.players)

  if (!currentUserId || !golfCourseId || !gameMode || !stake || !playerIds) {
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
  const matchId = randomUUID()
  const matchCode = createMatchCode(matchId)
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

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (!['GET', 'POST'].includes(request.method)) {
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

    return await handlePost(request, response, currentUser)
  } catch (error) {
    console.error("Match request failed.", error)
    return response.status(500).json({ error: "Match konnte nicht verarbeitet werden." })
  }
}
