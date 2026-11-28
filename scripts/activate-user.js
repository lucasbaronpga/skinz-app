import { neon } from "@neondatabase/serverless"

/**
 * Schaltet ein Konto frei (Status "active", E-Mail als bestätigt markiert).
 * Nützlich, solange noch keine E-Mails versendet werden.
 *
 *   node --env-file=.env.local scripts/activate-user.js          (zeigt wartende Konten)
 *   node --env-file=.env.local scripts/activate-user.js MM       (per Kürzel)
 *   node --env-file=.env.local scripts/activate-user.js name@example.de
 */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ist nicht gesetzt. Bitte mit --env-file=.env.local starten.")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const identifier = String(process.argv[2] ?? "").trim()

if (!identifier) {
  const pending = await sql`
    SELECT display_name, short_name, created_at::date AS registriert
    FROM users
    WHERE status = 'pending'
    ORDER BY created_at
  `

  console.log(pending.length ? "Wartende Konten:" : "Keine wartenden Konten.")
  if (pending.length) console.table(pending)
  process.exit(0)
}

const activated = await sql`
  UPDATE users
  SET
    status = 'active',
    email_verified_at = COALESCE(email_verified_at, NOW()),
    approved_at = COALESCE(approved_at, NOW()),
    updated_at = NOW()
  WHERE status = 'pending'
    AND (short_name = ${identifier.toUpperCase()} OR email = ${identifier.toLowerCase()})
  RETURNING display_name, short_name, status
`

if (activated.length === 0) {
  console.error("Kein wartendes Konto mit diesem Kürzel oder dieser E-Mail gefunden.")
  process.exit(1)
}

console.log("Freigeschaltet:")
console.table(activated)
