/**
 * Tägliches Aufräumen (Vercel Cron):
 * - pausierte Matches nach 3 Tagen
 * - nie gestartete Flights nach 24 Stunden
 * - Anmeldeversuche nach 30 Tagen
 * - benutzte oder abgelaufene Einmal-Tokens nach 7 Tagen
 * - beendete Sitzungen nach 30 Tagen
 *
 * Abhängige Zeilen werden ausdrücklich zuerst gelöscht, damit es nicht auf
 * ON DELETE CASCADE ankommt.
 */
export async function runMaintenance(sql) {
  const results = await sql.transaction([
    sql`
      DELETE FROM match_player_holes
      WHERE match_hole_id IN (
        SELECT mh.id FROM match_holes AS mh JOIN matches AS m ON m.id = mh.match_id
        WHERE (m.status = 'paused' AND m.paused_at <= NOW() - INTERVAL '3 days')
           OR (m.status = 'open' AND m.created_at <= NOW() - INTERVAL '24 hours')
      )
    `,
    sql`
      DELETE FROM match_holes
      WHERE match_id IN (
        SELECT id FROM matches
        WHERE (status = 'paused' AND paused_at <= NOW() - INTERVAL '3 days')
           OR (status = 'open' AND created_at <= NOW() - INTERVAL '24 hours')
      )
    `,
    sql`
      DELETE FROM match_settlements
      WHERE match_id IN (
        SELECT id FROM matches
        WHERE (status = 'paused' AND paused_at <= NOW() - INTERVAL '3 days')
           OR (status = 'open' AND created_at <= NOW() - INTERVAL '24 hours')
      )
    `,
    sql`
      DELETE FROM match_players
      WHERE match_id IN (
        SELECT id FROM matches
        WHERE (status = 'paused' AND paused_at <= NOW() - INTERVAL '3 days')
           OR (status = 'open' AND created_at <= NOW() - INTERVAL '24 hours')
      )
    `,
    sql`
      WITH deleted AS (
        DELETE FROM matches
        WHERE (status = 'paused' AND paused_at <= NOW() - INTERVAL '3 days')
           OR (status = 'open' AND created_at <= NOW() - INTERVAL '24 hours')
        RETURNING status
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'paused')::int AS paused_matches,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_flights
      FROM deleted
    `,
    sql`
      WITH deleted AS (
        DELETE FROM auth_events WHERE created_at <= NOW() - INTERVAL '30 days' RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `,
    sql`
      WITH deleted AS (
        DELETE FROM auth_tokens
        WHERE expires_at <= NOW() - INTERVAL '7 days'
           OR used_at <= NOW() - INTERVAL '7 days'
        RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `,
    sql`
      WITH deleted AS (
        DELETE FROM user_sessions
        WHERE expires_at <= NOW() - INTERVAL '30 days'
           OR revoked_at <= NOW() - INTERVAL '30 days'
        RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `,
  ])
  const [matches, events, tokens, sessions] = results.slice(4)

  return {
    pausedMatches: matches[0].paused_matches,
    openFlights: matches[0].open_flights,
    authEvents: events[0].count,
    authTokens: tokens[0].count,
    sessions: sessions[0].count,
  }
}
