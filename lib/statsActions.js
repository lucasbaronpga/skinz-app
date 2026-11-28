import { requireActiveUser } from "./auth.js"
import { getSql } from "./database.js"
import { getQueryValue, readBody, sendJson } from "./http.js"
import { ProfileError, normalizeProfileInput, readVisibility } from "./profile.js"
import { computeSkinzHandicaps } from "./skinzHandicap.js"
import {
  SORT_KEYS,
  aggregatePlayers,
  headToHead,
  listSeasons,
  rankPlayers,
  seasonSeries,
} from "./stats.js"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const TIME_ZONE = "Europe/Berlin"

function toCents(value) {
  return Math.round(Number(value || 0) * 100)
}

function currentSeason() {
  return Number(new Intl.DateTimeFormat("en", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()))
}

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Alle abgeschlossenen Matches chronologisch, Beträge in Cent. */
async function loadMatches(sql) {
  const rows = await sql`
    SELECT
      m.id, m.match_code, m.completed_at, m.hole_count, m.stake_amount,
      EXTRACT(YEAR FROM m.completed_at AT TIME ZONE ${TIME_ZONE})::int AS season,
      mp.user_id, mp.total_strokes, mp.total_to_par, mp.skinz_won, mp.total_winnings
    FROM matches AS m
    JOIN match_players AS mp ON mp.match_id = m.id
    WHERE m.status = 'completed'
    ORDER BY m.completed_at, m.id, mp.display_order
  `
  const matches = new Map()

  rows.forEach((row) => {
    const key = String(row.id)

    if (!matches.has(key)) {
      matches.set(key, {
        id: key,
        matchCode: row.match_code,
        completedAt: toIsoString(row.completed_at),
        season: Number(row.season),
        holeCount: Number(row.hole_count),
        stakeCents: toCents(row.stake_amount),
        players: [],
      })
    }

    matches.get(key).players.push({
      userId: String(row.user_id),
      totalStrokes: Number(row.total_strokes),
      totalToPar: Number(row.total_to_par),
      skinz: Number(row.skinz_won),
      totalCents: toCents(row.total_winnings),
    })
  })

  return [...matches.values()]
}

async function loadUsers(sql) {
  const rows = await sql`
    SELECT
      u.id, u.display_name, u.short_name, u.status, u.handicap_index, u.home_club_id,
      u.profile_visibility, u.avatar_color, gc.name AS home_club_name
    FROM users AS u
    LEFT JOIN golf_clubs AS gc ON gc.id = u.home_club_id
  `

  return new Map(
    rows.map((row) => [
      String(row.id),
      {
        userId: String(row.id),
        displayName: row.display_name,
        shortName: row.short_name || null,
        active: row.status === "active",
        handicapIndex: row.handicap_index === null ? null : Number(row.handicap_index),
        homeClubId: row.home_club_id || null,
        homeClubName: row.home_club_name || null,
        avatarColor: row.avatar_color || null,
        visibility: readVisibility(row.profile_visibility),
      },
    ])
  )
}

async function loadScoreCounts(sql, userId, season) {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE mph.result_label = 'Birdie')::int AS birdies,
      COUNT(*) FILTER (WHERE mph.result_label IN ('Eagle', 'Albatross'))::int AS eagles
    FROM match_player_holes AS mph
    JOIN match_players AS mp ON mp.id = mph.match_player_id
    JOIN matches AS m ON m.id = mp.match_id
    WHERE m.status = 'completed'
      AND mp.user_id = ${userId}
      AND EXTRACT(YEAR FROM m.completed_at AT TIME ZONE ${TIME_ZONE})::int = ${season}
  `

  return { birdies: rows[0]?.birdies ?? 0, eagles: rows[0]?.eagles ?? 0 }
}

async function loadContext(sql) {
  const [matches, users] = await Promise.all([loadMatches(sql), loadUsers(sql)])
  const officialHandicaps = new Map(
    [...users.values()].map((user) => [user.userId, user.handicapIndex])
  )

  return { matches, users, handicaps: computeSkinzHandicaps(matches, officialHandicaps) }
}

function readSeason(request, matches) {
  const requested = Number(getQueryValue(request, "season"))

  if (Number.isInteger(requested) && requested >= 2000 && requested <= 2100) return requested

  return currentSeason() || listSeasons(matches)[0]
}

/** Öffentliche Anzeige eines Spielers, abhängig von dessen Sichtbarkeit. */
function publicIdentity(user, currentUserId, { anonymousAllowed = true } = {}) {
  const isMe = user.userId === currentUserId
  const anonymous = anonymousAllowed && user.visibility.leaderboardAnonymous && !isMe

  return {
    userId: anonymous ? null : user.userId,
    name: anonymous ? user.shortName || "Spieler" : user.displayName,
    shortName: user.shortName,
    avatarColor: user.avatarColor,
    anonymous,
    isMe,
  }
}

async function leaderboard(request, response, { sql, userId }) {
  const { matches, users, handicaps } = await loadContext(sql)
  const season = readSeason(request, matches)
  const sortParam = String(getQueryValue(request, "sort") || "earnings")
  const sort = SORT_KEYS.includes(sortParam) ? sortParam : "earnings"
  const seasonStats = aggregatePlayers(matches.filter((match) => match.season === season))
  const rows = rankPlayers(
    [...seasonStats.values()].filter((row) => users.get(row.userId)),
    sort
  ).map((row) => {
    const user = users.get(row.userId)
    const identity = publicIdentity(user, userId)
    const handicap = handicaps.get(row.userId)?.value ?? null

    return {
      ...identity,
      position: row.position,
      rounds: row.rounds,
      wins: row.wins,
      skinz: row.skinz,
      earningsCents: row.earningsCents,
      skinzHandicap: identity.anonymous ? null : handicap,
    }
  })

  return sendJson(response, 200, {
    season,
    sort,
    seasons: [...new Set([season, ...listSeasons(matches)])].sort((first, second) => second - first),
    rows,
  })
}

function buildProfileStats({ matches, users, handicaps, userId, season, viewerId }) {
  const seasonMatches = matches.filter((match) => match.season === season)
  const seasonStats = aggregatePlayers(seasonMatches)
  const ranked = rankPlayers([...seasonStats.values()], "earnings")
  const mine = seasonStats.get(userId)

  return {
    season,
    seasons: [...new Set([season, ...listSeasons(matches)])].sort((first, second) => second - first),
    position: ranked.find((row) => row.userId === userId)?.position ?? null,
    rounds: mine?.rounds ?? 0,
    wins: mine?.wins ?? 0,
    earningsCents: mine?.earningsCents ?? 0,
    skinz: mine?.skinz ?? 0,
    averageToPar18: mine?.averageToPar18 ?? null,
    bestRound: mine?.bestRound ?? null,
    skinzHandicap: handicaps.get(userId)?.value ?? null,
    skinzHandicapRounds: handicaps.get(userId)?.rounds ?? 0,
    series: seasonSeries(seasonMatches, userId),
    headToHead: headToHead(seasonMatches, userId).map((row) => {
      const opponent = users.get(row.opponentId)

      return {
        ...row,
        ...(opponent ? publicIdentity(opponent, viewerId) : { userId: null, name: "Gelöschter Spieler" }),
        opponentId: undefined,
      }
    }),
  }
}

async function me(request, response, { sql, userId }) {
  const context = await loadContext(sql)
  const season = readSeason(request, context.matches)
  const user = context.users.get(userId)
  const [counts, details] = await Promise.all([
    loadScoreCounts(sql, userId, season),
    sql`SELECT email, paypal_link FROM users WHERE id = ${userId} LIMIT 1`,
  ])

  return sendJson(response, 200, {
    profile: {
      userId,
      displayName: user.displayName,
      shortName: user.shortName,
      email: details[0]?.email ?? null,
      handicapIndex: user.handicapIndex,
      homeClubId: user.homeClubId,
      homeClubName: user.homeClubName,
      avatarColor: user.avatarColor,
      paypalLink: details[0]?.paypal_link ?? null,
      visibility: user.visibility,
    },
    stats: {
      ...buildProfileStats({ ...context, userId, season, viewerId: userId }),
      ...counts,
    },
  })
}

async function player(request, response, { sql, userId }) {
  const targetId = String(getQueryValue(request, "id") ?? "").toLowerCase()

  if (!UUID_PATTERN.test(targetId)) return sendJson(response, 400, { error: "Die Anfrage ist ungültig." })

  const context = await loadContext(sql)
  const user = context.users.get(targetId)

  if (!user || !user.active || (user.visibility.leaderboardAnonymous && targetId !== userId)) {
    return sendJson(response, 404, { error: "Spieler nicht gefunden." })
  }

  const season = readSeason(request, context.matches)
  const visibility = user.visibility
  const stats = visibility.showStats
    ? {
        ...buildProfileStats({ ...context, userId: targetId, season, viewerId: userId }),
        ...(await loadScoreCounts(sql, targetId, season)),
      }
    : null
  const versusMe = headToHead(
    context.matches.filter((match) => match.season === season),
    userId
  ).find((row) => row.opponentId === targetId)

  return sendJson(response, 200, {
    profile: {
      userId: targetId,
      displayName: user.displayName,
      shortName: user.shortName,
      avatarColor: user.avatarColor,
      handicapIndex: visibility.showHandicap ? user.handicapIndex : null,
      homeClubName: visibility.showHomeClub ? user.homeClubName : null,
      skinzHandicap: context.handicaps.get(targetId)?.value ?? null,
      statsHidden: !visibility.showStats,
    },
    stats: stats && { ...stats, headToHead: undefined },
    versusMe: versusMe
      ? { matches: versusMe.matches, wins: versusMe.losses, losses: versusMe.wins, balanceCents: -versusMe.balanceCents }
      : null,
  })
}

async function updateProfile(request, response, { sql, userId }) {
  const input = normalizeProfileInput(readBody(request))
  const conflicts = await sql`
    SELECT id FROM users WHERE short_name = ${input.shortName} AND id <> ${userId} LIMIT 1
  `

  if (conflicts.length > 0) throw new ProfileError("Dieses Kürzel ist bereits vergeben.", 409)

  if (input.homeClubId) {
    const clubs = await sql`
      SELECT id FROM golf_clubs WHERE id = ${input.homeClubId} AND is_active = TRUE LIMIT 1
    `

    if (clubs.length === 0) throw new ProfileError("Der Heimatclub ist nicht verfügbar.")
  }

  try {
    await sql`
      UPDATE users
      SET
        display_name = ${input.displayName},
        short_name = ${input.shortName},
        handicap_index = ${input.handicapIndex},
        home_club_id = ${input.homeClubId},
        avatar_color = ${input.avatarColor},
        paypal_link = ${input.paypalLink},
        profile_visibility = ${JSON.stringify(input.visibility)}::jsonb,
        updated_at = NOW()
      WHERE id = ${userId}
    `
  } catch (error) {
    if (error?.code === "23505") throw new ProfileError("Dieses Kürzel ist bereits vergeben.", 409)

    throw error
  }

  return me(request, response, { sql, userId })
}

async function clubs(request, response, { sql }) {
  const rows = await sql`
    SELECT id, name, location FROM golf_clubs WHERE is_active = TRUE ORDER BY name, location
  `

  return sendJson(response, 200, {
    clubs: rows.map((row) => ({ id: row.id, name: row.name, location: row.location || null })),
  })
}

export const statsActions = Object.freeze({
  leaderboard: { method: "GET", handle: leaderboard },
  me: { method: "GET", handle: me },
  player: { method: "GET", handle: player },
  clubs: { method: "GET", handle: clubs },
  profile: { method: "POST", handle: updateProfile },
})

export async function runStatsAction(action, request, response) {
  const session = await requireActiveUser(request)

  if (!session) return sendJson(response, 401, { error: "Anmeldung erforderlich." })

  try {
    return await action.handle(request, response, { sql: getSql(), userId: String(session.user_id) })
  } catch (error) {
    if (error instanceof ProfileError) return sendJson(response, error.status, { error: error.message })

    throw error
  }
}
