import { neon } from "@neondatabase/serverless"

/**
 * Räumt vor dem Go-live auf:
 *   - löscht ALLE Matches samt Löchern, Ergebnissen und Abrechnungen
 *   - löscht Konten mit Status "deleted" und die per --users genannten Konten
 *   - löscht alle Anmeldeversuche und setzt die Match-ID wieder auf SKZ-0001
 *
 * Standard ist ein Probelauf, der nur anzeigt, was passieren würde.
 *
 *   node --env-file=.env.local scripts/cleanup-test-data.js
 *   node --env-file=.env.local scripts/cleanup-test-data.js --users=TS,MM
 *   node --env-file=.env.local scripts/cleanup-test-data.js --users=TS --execute
 */

const args = process.argv.slice(2)
const execute = args.includes("--execute")
const usersArgument = args.find((argument) => argument.startsWith("--users="))
const shortNames = usersArgument
  ? usersArgument
      .slice("--users=".length)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
  : []

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ist nicht gesetzt. Bitte mit --env-file=.env.local starten.")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const allUsers = await sql`
  SELECT display_name, short_name, role, status
  FROM users
  ORDER BY created_at
`
const targets = await sql`
  SELECT id, display_name, short_name, role, status
  FROM users
  WHERE status = 'deleted' OR short_name = ANY(${shortNames}::text[])
  ORDER BY created_at
`
const counts = (
  await sql`
    SELECT
      (SELECT COUNT(*) FROM matches)::int AS matches,
      (SELECT COUNT(*) FROM match_players)::int AS match_players,
      (SELECT COUNT(*) FROM match_holes)::int AS match_holes,
      (SELECT COUNT(*) FROM match_settlements)::int AS settlements,
      (SELECT COUNT(*) FROM auth_events)::int AS auth_events
  `
)[0]

console.log("\nAlle Konten (zur Kontrolle):")
console.table(allUsers)

console.log("Diese Konten würden gelöscht:")
console.table(targets.map(({ display_name, short_name, role, status }) => ({ display_name, short_name, role, status })))

console.log("Diese Daten würden gelöscht:")
console.table([counts])

if (targets.some((user) => user.role === "admin")) {
  console.error("Abbruch: Admin-Konten werden nie gelöscht. Bitte --users anpassen.")
  process.exit(1)
}

if (shortNames.some((name) => !allUsers.some((user) => user.short_name === name))) {
  console.error("Abbruch: Ein Kürzel in --users gibt es nicht. Bitte Schreibweise prüfen.")
  process.exit(1)
}

if (!execute) {
  console.log("Das war nur ein Probelauf. Zum Ausführen --execute anhängen (vorher Neon-Backup anlegen).")
  process.exit(0)
}

const userIds = targets.map((user) => user.id)

await sql.transaction([
  sql`DELETE FROM match_player_holes`,
  sql`DELETE FROM match_settlements`,
  sql`DELETE FROM match_holes`,
  sql`DELETE FROM match_players`,
  sql`DELETE FROM matches`,
  sql`DELETE FROM auth_events`,
  sql`DELETE FROM push_subscriptions WHERE user_id = ANY(${userIds}::uuid[])`,
  sql`DELETE FROM auth_tokens WHERE user_id = ANY(${userIds}::uuid[])`,
  sql`DELETE FROM user_sessions WHERE user_id = ANY(${userIds}::uuid[])`,
  sql`DELETE FROM users WHERE id = ANY(${userIds}::uuid[])`,
])

await sql`SELECT setval('match_code_seq', 1, false)`

console.log("\nErledigt. Verbleibende Konten:")
console.table(await sql`SELECT display_name, short_name, role, status FROM users ORDER BY created_at`)
