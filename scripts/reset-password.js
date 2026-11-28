import { Buffer } from "node:buffer"
import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"

/**
 * Setzt das Passwort eines Kontos zurück und meldet es überall ab.
 * Nützlich, solange "Passwort vergessen" noch keine E-Mails versendet.
 *
 *   node --env-file=.env.local scripts/reset-password.js MM "neues-passwort-123"
 *   node --env-file=.env.local scripts/reset-password.js name@example.de "neues-passwort-123"
 */

const [identifier, newPassword] = process.argv.slice(2)

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ist nicht gesetzt. Bitte mit --env-file=.env.local starten.")
  process.exit(1)
}

if (!identifier || !newPassword) {
  console.error('Aufruf: node --env-file=.env.local scripts/reset-password.js KÜRZEL "neues Passwort"')
  process.exit(1)
}

if (newPassword.length < 12 || Buffer.byteLength(newPassword, "utf8") > 72) {
  console.error("Das Passwort muss mindestens 12 Zeichen und höchstens 72 Bytes lang sein.")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const hash = await bcrypt.hash(newPassword, 12)
const rows = await sql`
  UPDATE users
  SET password_hash = ${hash}, updated_at = NOW()
  WHERE status <> 'deleted'
    AND (short_name = ${identifier.toUpperCase()} OR email = ${identifier.toLowerCase()})
  RETURNING id, display_name, short_name
`

if (rows.length !== 1) {
  console.error("Es wurde kein eindeutiges Konto gefunden. Es wurde nichts geändert.")
  process.exit(1)
}

await sql`UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ${rows[0].id} AND revoked_at IS NULL`

console.log(`Passwort für ${rows[0].display_name} (${rows[0].short_name}) geändert, alle Sitzungen beendet.`)
