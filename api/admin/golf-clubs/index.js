import { requireAdmin, setNoStoreHeaders } from "../../../lib/auth.js"
import { getSql } from "../../../lib/database.js"

const MAXIMUM_NAME_LENGTH = 160
const MAXIMUM_LOCATION_LENGTH = 160
const MAXIMUM_STATE_LENGTH = 120
const MAXIMUM_COUNTRY_LENGTH = 120

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

function normalizeText(value, maximumLength, fallback = "") {
  const normalizedValue = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")

  return (normalizedValue || fallback).slice(0, maximumLength)
}

function normalizeOptionalText(value, maximumLength) {
  const normalizedValue = normalizeText(value, maximumLength)
  return normalizedValue || null
}

function getActiveFilter(request) {
  const rawValue = Array.isArray(request.query?.active)
    ? request.query.active[0]
    : request.query?.active
  const normalizedValue = String(rawValue ?? "").trim().toLowerCase()

  if (!normalizedValue || normalizedValue === "all") return null
  if (normalizedValue === "true") return true
  if (normalizedValue === "false") return false

  return Number.NaN
}

function toPublicGolfClub(club) {
  return {
    id: club.id,
    name: club.name,
    location: club.location || null,
    state: club.state || null,
    country: club.country,
    isActive: Boolean(club.is_active),
    courseCount: Number(club.course_count || 0),
    activeCourseCount: Number(club.active_course_count || 0),
    createdAt: club.created_at,
    updatedAt: club.updated_at,
  }
}

async function listGolfClubs(request, response) {
  const active = getActiveFilter(request)

  if (Number.isNaN(active)) {
    return response.status(400).json({
      error: "Der Aktivfilter muss true, false oder all sein.",
    })
  }

  const sql = getSql()
  const clubs =
    active === null
      ? await sql`
          SELECT
            gc.id,
            gc.name,
            gc.location,
            gc.state,
            gc.country,
            gc.is_active,
            gc.created_at,
            gc.updated_at,
            COUNT(gco.id)::int AS course_count,
            COUNT(gco.id) FILTER (WHERE gco.is_active = TRUE)::int
              AS active_course_count
          FROM golf_clubs AS gc
          LEFT JOIN golf_courses AS gco ON gco.golf_club_id = gc.id
          GROUP BY gc.id
          ORDER BY gc.is_active DESC, gc.name ASC, gc.location ASC NULLS LAST
        `
      : await sql`
          SELECT
            gc.id,
            gc.name,
            gc.location,
            gc.state,
            gc.country,
            gc.is_active,
            gc.created_at,
            gc.updated_at,
            COUNT(gco.id)::int AS course_count,
            COUNT(gco.id) FILTER (WHERE gco.is_active = TRUE)::int
              AS active_course_count
          FROM golf_clubs AS gc
          LEFT JOIN golf_courses AS gco ON gco.golf_club_id = gc.id
          WHERE gc.is_active = ${active}
          GROUP BY gc.id
          ORDER BY gc.name ASC, gc.location ASC NULLS LAST
        `

  return response.status(200).json({
    golfClubs: clubs.map(toPublicGolfClub),
  })
}

async function createGolfClub(request, response, admin) {
  const body = getRequestBody(request)
  const name = normalizeText(body.name, MAXIMUM_NAME_LENGTH)
  const location = normalizeOptionalText(body.location, MAXIMUM_LOCATION_LENGTH)
  const state = normalizeOptionalText(body.state, MAXIMUM_STATE_LENGTH)
  const country = normalizeText(
    body.country,
    MAXIMUM_COUNTRY_LENGTH,
    "Deutschland"
  )

  if (!name) {
    return response.status(400).json({
      error: "Bitte einen Namen fuer den Golfclub eingeben.",
    })
  }

  if (!country) {
    return response.status(400).json({
      error: "Bitte ein Land eingeben.",
    })
  }

  const sql = getSql()
  const newData = JSON.stringify({
    name,
    location,
    state,
    country,
    isActive: true,
  })

  const transactionResult = await sql.transaction([
    sql`
      INSERT INTO golf_clubs (
        name,
        location,
        state,
        country,
        is_active
      )
      VALUES (
        ${name},
        ${location},
        ${state},
        ${country},
        TRUE
      )
      RETURNING
        id,
        name,
        location,
        state,
        country,
        is_active,
        created_at,
        updated_at
    `,
    sql`
      INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        previous_data,
        new_data
      )
      VALUES (
        ${admin.user_id},
        'golf_club.created',
        'golf_club',
        NULL,
        NULL,
        ${newData}::jsonb
      )
    `,
  ])

  const createdClub = transactionResult[0][0]

  return response.status(201).json({
    created: true,
    golfClub: toPublicGolfClub({
      ...createdClub,
      course_count: 0,
      active_course_count: 0,
    }),
  })
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (!["GET", "POST"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const admin = await requireAdmin(request)

    if (!admin) {
      return response.status(403).json({
        error: "Administratorzugriff erforderlich.",
      })
    }

    if (request.method === "GET") {
      return await listGolfClubs(request, response)
    }

    return await createGolfClub(request, response, admin)
  } catch (error) {
    if (error?.code === "23505") {
      return response.status(409).json({
        error: "Dieser Golfclub ist an diesem Ort bereits vorhanden.",
      })
    }

    console.error("Admin golf club request failed.", error)
    return response.status(500).json({
      error: "Golfclubs konnten nicht verarbeitet werden.",
    })
  }
}
