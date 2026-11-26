import { createHash, randomBytes } from "node:crypto"
import { getSql } from "./database.js"

export const TOKEN_PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
})

const TOKEN_LIFETIME_MINUTES = Object.freeze({
  [TOKEN_PURPOSES.EMAIL_VERIFICATION]: 60 * 24,
  [TOKEN_PURPOSES.PASSWORD_RESET]: 60,
})

// 32 zufällige Bytes als base64url ergeben genau 43 Zeichen.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function isWellFormedToken(value) {
  return typeof value === "string" && TOKEN_PATTERN.test(value)
}

/** Erzeugt ein neues Token und entwertet offene Tokens desselben Zwecks. */
export async function createAuthToken(userId, purpose) {
  const token = randomBytes(32).toString("base64url")
  const sql = getSql()

  await sql.transaction([
    sql`
      UPDATE auth_tokens
      SET used_at = NOW()
      WHERE user_id = ${userId}
        AND purpose = ${purpose}
        AND used_at IS NULL
    `,
    sql`
      INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
      VALUES (
        ${userId},
        ${purpose},
        ${hashToken(token)},
        NOW() + make_interval(mins => ${TOKEN_LIFETIME_MINUTES[purpose]}::int)
      )
    `,
  ])

  return token
}

/** Löst das Token ein, bestätigt die E-Mail und aktiviert ausstehende Konten. */
export async function confirmEmailWithToken(token) {
  const sql = getSql()
  const rows = await sql`
    WITH used AS (
      UPDATE auth_tokens
      SET used_at = NOW()
      WHERE token_hash = ${hashToken(token)}
        AND purpose = ${TOKEN_PURPOSES.EMAIL_VERIFICATION}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id
    )
    UPDATE users
    SET
      email_verified_at = COALESCE(email_verified_at, NOW()),
      status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
      updated_at = NOW()
    WHERE id IN (SELECT user_id FROM used)
    RETURNING id
  `

  return rows.length > 0
}

/**
 * Löst das Token ein, setzt das Passwort, beendet alle Sitzungen des Benutzers
 * und entwertet weitere offene Tokens. Alles in einer atomaren Anweisung.
 */
export async function resetPasswordWithToken(token, passwordHash) {
  const sql = getSql()
  const tokenHash = hashToken(token)
  const rows = await sql`
    WITH used AS (
      UPDATE auth_tokens
      SET used_at = NOW()
      WHERE token_hash = ${tokenHash}
        AND purpose = ${TOKEN_PURPOSES.PASSWORD_RESET}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id
    ),
    updated AS (
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id IN (SELECT user_id FROM used)
        AND status <> 'blocked'
      RETURNING id
    ),
    revoked AS (
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE user_id IN (SELECT id FROM updated)
        AND revoked_at IS NULL
      RETURNING id
    ),
    invalidated AS (
      UPDATE auth_tokens
      SET used_at = NOW()
      WHERE user_id IN (SELECT id FROM updated)
        AND used_at IS NULL
        AND token_hash <> ${tokenHash}
      RETURNING id
    )
    SELECT COUNT(*)::int AS updated_count FROM updated
  `

  return rows[0].updated_count > 0
}
