import { requireActiveUser, setNoStoreHeaders } from "../../lib/auth.js"
import { getSql } from "../../lib/database.js"

/**
 * Liest laufende und abgeschlossene Matches des Nutzers für Home, Archiv,
 * Match-Details, Leaderboard und Profil. Angelegt und gespielt wird über
 * /api/flights und /api/live, dort rechnet die Spiel-Engine auf dem Server.
 */

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

function mapSettlementRow(settlement) {
  return {
    id: settlement.id,
    payerUserId: settlement.payer_user_id,
    payerName: settlement.payer_name,
    recipientUserId: settlement.recipient_user_id,
    recipientName: settlement.recipient_name,
    amount: Number(settlement.amount),
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

function mapHoleRow(hole, playerHoles) {
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

function mapMatchRow(match, players, holes, settlements) {
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
    settlements,
  }
}

function groupBy(rows, key, map) {
  const groups = new Map()

  rows.forEach((row) => {
    const groupKey = String(row[key])
    const entries = groups.get(groupKey) || []

    entries.push(map(row))
    groups.set(groupKey, entries)
  })

  return groups
}

async function listMatches(currentUserId) {
  const sql = getSql()
  const matches = await sql`
    SELECT
      m.id, m.match_code, m.status, m.game_mode, m.stake_amount, m.hole_count,
      m.current_hole, m.skinz_carryover, m.oozle_carryover, m.special_scoring_enabled,
      m.oozle_enabled, m.oozle_value, m.oozle_foozle_enabled, m.oozle_carryover_enabled,
      m.course_snapshot, m.state_version, m.started_at, m.completed_at, m.created_at,
      m.updated_at
    FROM matches AS m
    JOIN match_players AS current_player ON current_player.match_id = m.id
    WHERE current_player.user_id = ${currentUserId}
      AND m.status IN ('active', 'completed')
    ORDER BY
      CASE WHEN m.status = 'active' THEN 0 ELSE 1 END,
      COALESCE(m.completed_at, m.updated_at) DESC,
      m.id DESC
  `

  if (matches.length === 0) return []

  const matchIds = matches.map((match) => match.id)
  const [playerRows, holeRows, settlementRows] = await Promise.all([
    sql`
      SELECT
        mp.id, mp.match_id, mp.user_id, mp.display_order, mp.display_name_snapshot,
        mp.handicap_index_snapshot, mp.home_club_id_snapshot, mp.home_club_name_snapshot,
        mp.total_strokes, mp.total_to_par, mp.skinz_won, mp.skinz_winnings,
        mp.oozle_winnings, mp.total_winnings
      FROM match_players AS mp
      WHERE mp.match_id = ANY(${matchIds}::uuid[])
      ORDER BY mp.match_id, mp.display_order
    `,
    sql`
      SELECT
        mh.id, mh.match_id, mh.hole_number, mh.par, mh.winner_label, mh.winning_score,
        mh.has_tie, mh.skinz_awarded, mh.carryover_before, mh.carryover_after,
        mh.pot_amount, mh.special_scoring_label, mh.game_data, mh.completed_at
      FROM match_holes AS mh
      WHERE mh.match_id = ANY(${matchIds}::uuid[])
        AND mh.status = 'completed'
      ORDER BY mh.match_id, mh.hole_number
    `,
    sql`
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
    `,
  ])

  const holeIds = holeRows.map((hole) => hole.id)
  const playerHoleRows = holeIds.length
    ? await sql`
        SELECT
          mph.match_hole_id, mp.user_id, mph.score, mph.to_par, mph.skinz_delta,
          mph.winnings_delta, mph.oozle_winnings_delta, mph.result_label, mph.result_data
        FROM match_player_holes AS mph
        JOIN match_players AS mp ON mp.id = mph.match_player_id
        WHERE mph.match_hole_id = ANY(${holeIds}::uuid[])
        ORDER BY mph.match_hole_id, mp.display_order
      `
    : []

  const playersByMatchId = groupBy(playerRows, "match_id", mapPlayerRow)
  const playerHolesByHoleId = groupBy(playerHoleRows, "match_hole_id", mapPlayerHoleRow)
  const settlementsByMatchId = groupBy(settlementRows, "match_id", mapSettlementRow)
  const holesByMatchId = groupBy(holeRows, "match_id", (hole) =>
    mapHoleRow(hole, playerHolesByHoleId.get(String(hole.id)) || [])
  )

  return matches.map((match) => {
    const matchId = String(match.id)

    return mapMatchRow(
      match,
      playersByMatchId.get(matchId) || [],
      holesByMatchId.get(matchId) || [],
      settlementsByMatchId.get(matchId) || []
    )
  })
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Methode nicht erlaubt." })
  }

  try {
    const currentUser = await requireActiveUser(request)

    if (!currentUser) {
      return response.status(401).json({ error: "Anmeldung erforderlich." })
    }

    const matches = await listMatches(currentUser.user_id || currentUser.id)

    return response.status(200).json({ matches })
  } catch (error) {
    console.error("Match request failed.", error)
    return response.status(500).json({ error: "Matches konnten nicht geladen werden." })
  }
}
