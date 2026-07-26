import bcrypt from "bcryptjs"
import { getSql } from "../../lib/database.js"
import { setNoStoreHeaders, toPublicUser } from "../../lib/auth.js"

const BCRYPT_ROUNDS = 12
const MINIMUM_PASSWORD_LENGTH = 12
const MINIMUM_DISPLAY_NAME_LENGTH = 2
const MAXIMUM_DISPLAY_NAME_LENGTH = 80
const MINIMUM_HANDICAP_INDEX = -10
const MAXIMUM_HANDICAP_INDEX = 54

function getRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body)
    } catch {
      return {}
    }
  }

  return {}
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

function normalizeDisplayName(value) {
  return String(value || "").trim().replace(/\s+/g, " ")
}

function normalizeHomeClubId(value) {
  const homeClubId = String(value || "").trim()
  return homeClubId || null
}

function normalizeHandicapIndex(value) {
  if (value === null || value === undefined || value === "") return null

  const handicapIndex = Number(value)
  if (!Number.isFinite(handicapIndex)) return Number.NaN

  return Math.round(handicapIndex * 10) / 10
}

function validateRegistration({ email, password, displayName, handicapIndex }) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    return "Bitte eine gueltige E-Mail-Adresse eingeben."
  }

  if (displayName.length < MINIMUM_DISPLAY_NAME_LENGTH) {
    return `Der Name muss mindestens ${MINIMUM_DISPLAY_NAME_LENGTH} Zeichen enthalten.`
  }

  if (displayName.length > MAXIMUM_DISPLAY_NAME_LENGTH) {
    return `Der Name darf maximal ${MAXIMUM_DISPLAY_NAME_LENGTH} Zeichen enthalten.`
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MINIMUM_PASSWORD_LENGTH} Zeichen enthalten.`
  }

  if (bcrypt.truncates(password)) {
    return "Das Passwort darf in UTF-8 maximal 72 Bytes lang sein."
  }

  if (
    Number.isNaN(handicapIndex) ||
    (handicapIndex !== null &&
      (handicapIndex < MINIMUM_HANDICAP_INDEX ||
        handicapIndex > MAXIMUM_HANDICAP_INDEX))
  ) {
    return `Das Handicap muss zwischen ${MINIMUM_HANDICAP_INDEX} und ${MAXIMUM_HANDICAP_INDEX} liegen.`
  }

  return null
}

async function getActiveHomeClub(sql, homeClubId) {
  if (!homeClubId) return null

  const clubs = await sql`
    SELECT id
    FROM golf_clubs
    WHERE id = ${homeClubId}
      AND is_active = TRUE
    LIMIT 1
  `

  return clubs[0] || null
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const body = getRequestBody(request)
    const email = normalizeEmail(body.email)
    const password = String(body.password || "")
    const displayName = normalizeDisplayName(body.displayName)
    const handicapIndex = normalizeHandicapIndex(body.handicapIndex)
    const homeClubId = normalizeHomeClubId(body.homeClubId)
    const validationError = validateRegistration({
      email,
      password,
      displayName,
      handicapIndex,
    })

    if (validationError) {
      return response.status(400).json({ error: validationError })
    }

    const sql = getSql()
    const existingUsers = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (existingUsers.length > 0) {
      return response.status(409).json({
        error: "Fuer diese E-Mail-Adresse besteht bereits ein Benutzerkonto.",
      })
    }

    const homeClub = await getActiveHomeClub(sql, homeClubId)
    if (homeClubId && !homeClub) {
      return response.status(400).json({
        error: "Der ausgewaehlte Heimatclub ist nicht verfuegbar.",
      })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const insertedUsers = await sql`
      INSERT INTO users (
        email,
        password_hash,
        display_name,
        role,
        status,
        handicap_index,
        home_club_id
      )
      VALUES (
        ${email},
        ${passwordHash},
        ${displayName},
        'user',
        'pending',
        ${handicapIndex},
        ${homeClubId}
      )
      RETURNING
        id,
        email,
        display_name,
        role,
        status,
        handicap_index,
        home_club_id
    `

    return response.status(201).json({
      registered: true,
      approvalRequired: true,
      message: "Das Benutzerkonto wurde erstellt und wartet auf Freigabe.",
      user: toPublicUser(insertedUsers[0]),
    })
  } catch (error) {
    if (error?.code === "23505") {
      return response.status(409).json({
        error: "Fuer diese E-Mail-Adresse besteht bereits ein Benutzerkonto.",
      })
    }

    console.error("Registration failed.", error)
    return response.status(500).json({
      error: "Registrierung derzeit nicht moeglich.",
    })
  }
}
