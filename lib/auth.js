import { createHash, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { getSql } from "./database.js"
import { getClientIp, getUserAgent } from "./http.js"

const SESSION_COOKIE_NAME = "skinz_session"
const BCRYPT_ROUNDS = 12

export const SESSION_DURATION_SECONDS = 60 * 60 * 12
export const REMEMBER_ME_DURATION_SECONDS = 60 * 60 * 24 * 90

let timingEqualizerHash = null

function getSessionDurationSeconds(rememberMe) {
  return rememberMe ? REMEMBER_ME_DURATION_SECONDS : SESSION_DURATION_SECONDS
}

function hashSessionToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

function getCookieValue(request, cookieName) {
  if (request.cookies?.[cookieName]) return request.cookies[cookieName]

  const cookieHeader = String(request.headers?.cookie || "")
  const cookies = cookieHeader.split(";")

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=")

    if (separatorIndex < 0) continue

    const name = cookie.slice(0, separatorIndex).trim()

    if (name !== cookieName) continue

    return decodeURIComponent(cookie.slice(separatorIndex + 1).trim())
  }

  return null
}

function isProductionRequest(request) {
  const forwardedProtocol = String(request.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()

  return process.env.VERCEL_ENV === "production" || forwardedProtocol === "https"
}

function serializeSessionCookie(token, request, maxAgeSeconds) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ]

  if (isProductionRequest(request)) parts.push("Secure")

  return parts.join("; ")
}

function serializeExpiredSessionCookie(request) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ]

  if (isProductionRequest(request)) parts.push("Secure")

  return parts.join("; ")
}

export function setNoStoreHeaders(response) {
  response.setHeader("Cache-Control", "no-store, max-age=0")
  response.setHeader("Pragma", "no-cache")
}

export function setSessionCookie(response, token, request, { rememberMe = false } = {}) {
  response.setHeader(
    "Set-Cookie",
    serializeSessionCookie(token, request, getSessionDurationSeconds(rememberMe))
  )
}

export function clearSessionCookie(response, request) {
  response.setHeader("Set-Cookie", serializeExpiredSessionCookie(request))
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Prüft E-Mail und Passwort. Bei unbekannter E-Mail wird trotzdem ein
 * bcrypt-Vergleich ausgeführt, damit die Antwortzeit nichts verrät.
 */
export async function verifyLogin(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase()
  const safePassword = String(password || "")

  if (!normalizedEmail || !safePassword) return null

  const sql = getSql()
  const users = await sql`
    SELECT
      id,
      email,
      password_hash,
      display_name,
      short_name,
      role,
      status,
      handicap_index,
      home_club_id
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `
  const user = users[0]

  if (!user) {
    timingEqualizerHash ??= bcrypt.hash("skinz-timing-equalizer", BCRYPT_ROUNDS)
    await bcrypt.compare(safePassword, await timingEqualizerHash)
    return null
  }

  const passwordMatches = await bcrypt.compare(safePassword, user.password_hash)

  return passwordMatches ? user : null
}

export async function createSession(userId, request, { rememberMe = false } = {}) {
  const token = randomBytes(32).toString("base64url")
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + getSessionDurationSeconds(rememberMe) * 1000)
  const sql = getSql()

  await sql.transaction([
    sql`
      INSERT INTO user_sessions (
        user_id,
        token_hash,
        expires_at,
        ip_address,
        user_agent
      )
      VALUES (
        ${userId},
        ${tokenHash},
        ${expiresAt.toISOString()},
        ${getClientIp(request)},
        ${getUserAgent(request)}
      )
    `,
    sql`
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${userId}
    `,
  ])

  return token
}

export async function getSession(request) {
  const token = getCookieValue(request, SESSION_COOKIE_NAME)

  if (!token) return null

  const sql = getSql()
  const tokenHash = hashSessionToken(token)
  const sessions = await sql`
    SELECT
      s.id AS session_id,
      s.expires_at,
      u.id AS user_id,
      u.email,
      u.display_name,
      u.short_name,
      u.role,
      u.status,
      u.handicap_index,
      u.home_club_id
    FROM user_sessions AS s
    JOIN users AS u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1
  `
  const session = sessions[0]

  if (!session || session.status !== "active") return null

  await sql`
    UPDATE user_sessions
    SET last_used_at = NOW()
    WHERE id = ${session.session_id}
  `

  return session
}

export async function revokeSession(request) {
  const token = getCookieValue(request, SESSION_COOKIE_NAME)

  if (!token) return false

  const sql = getSql()
  const tokenHash = hashSessionToken(token)
  const revokedSessions = await sql`
    UPDATE user_sessions
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE token_hash = ${tokenHash}
      AND revoked_at IS NULL
    RETURNING id
  `

  return revokedSessions.length > 0
}

export async function requireActiveUser(request) {
  return getSession(request)
}

export async function requireAdmin(request) {
  const session = await getSession(request)

  return session?.role === "admin" ? session : null
}

export function toPublicUser(user) {
  return {
    id: user.user_id || user.id,
    email: user.email,
    displayName: user.display_name,
    shortName: user.short_name || null,
    role: user.role,
    status: user.status,
    handicapIndex:
      user.handicap_index === null || user.handicap_index === undefined
        ? null
        : Number(user.handicap_index),
    homeClubId: user.home_club_id || null,
  }
}
