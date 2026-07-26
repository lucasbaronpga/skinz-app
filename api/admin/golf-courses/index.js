import { requireAdmin, setNoStoreHeaders } from "../../../lib/auth.js"
import { getSql } from "../../../lib/database.js"

const MAXIMUM_NAME_LENGTH = 160
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function getQueryValue(request, key) {
  const value = request.query?.[key]
  return Array.isArray(value) ? value[0] : value
}

function normalizeText(value, maximumLength) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength)
}

function normalizeClubId(request, body = {}) {
  return normalizeText(body.golfClubId ?? getQueryValue(request, "clubId"), 36)
}


function normalizeCourseId(request, body = {}) {
  return normalizeText(body.courseId ?? getQueryValue(request, "courseId"), 36)
}

function normalizeHoles(value, expectedHoleCount) {
  if (!Array.isArray(value) || value.length !== expectedHoleCount) return null

  const holes = value.map((hole) => ({
    holeNumber: Number(hole?.holeNumber),
    par: Number(hole?.par),
    handicapIndex: Number(hole?.handicapIndex),
  }))

  const holeNumbers = holes.map((hole) => hole.holeNumber)
  const handicapIndexes = holes.map((hole) => hole.handicapIndex)
  const expectedNumbers = Array.from(
    { length: expectedHoleCount },
    (_, index) => index + 1
  )

  const hasValidNumbers = holes.every(
    (hole) =>
      Number.isInteger(hole.holeNumber) &&
      hole.holeNumber >= 1 &&
      hole.holeNumber <= expectedHoleCount &&
      Number.isInteger(hole.par) &&
      hole.par >= 3 &&
      hole.par <= 6 &&
      Number.isInteger(hole.handicapIndex) &&
      hole.handicapIndex >= 1 &&
      hole.handicapIndex <= 18
  )

  const hasAllHoleNumbers = expectedNumbers.every((number) =>
    holeNumbers.includes(number)
  )
  const hasUniqueHandicapIndexes =
    new Set(handicapIndexes).size === expectedHoleCount

  return hasValidNumbers && hasAllHoleNumbers && hasUniqueHandicapIndexes
    ? holes.sort((first, second) => first.holeNumber - second.holeNumber)
    : null
}

function toPublicGolfCourseHole(hole) {
  return {
    id: hole.id,
    holeNumber: Number(hole.hole_number),
    par: Number(hole.par),
    handicapIndex: Number(hole.handicap_index),
    createdAt: hole.created_at,
    updatedAt: hole.updated_at,
  }
}

function normalizeHoleCount(value) {
  const holeCount = Number(value)
  return holeCount === 9 || holeCount === 18 ? holeCount : null
}

function toPublicGolfCourse(course) {
  return {
    id: course.id,
    golfClubId: course.golf_club_id,
    name: course.name,
    holeCount: Number(course.hole_count),
    isActive: Boolean(course.is_active),
    configuredHoleCount: Number(course.configured_hole_count || 0),
    parTotal:
      course.par_total === null || course.par_total === undefined
        ? null
        : Number(course.par_total),
    createdAt: course.created_at,
    updatedAt: course.updated_at,
  }
}

async function listGolfCourses(request, response) {
  const golfClubId = normalizeClubId(request)

  if (!UUID_PATTERN.test(golfClubId)) {
    return response.status(400).json({
      error: "Bitte eine gültige Golfclub-ID angeben.",
    })
  }

  const sql = getSql()
  const clubs = await sql`
    SELECT id, name, is_active
    FROM golf_clubs
    WHERE id = ${golfClubId}
    LIMIT 1
  `

  if (clubs.length === 0) {
    return response.status(404).json({
      error: "Der ausgewählte Golfclub wurde nicht gefunden.",
    })
  }

  const courses = await sql`
    SELECT
      gc.id,
      gc.golf_club_id,
      gc.name,
      gc.hole_count,
      gc.is_active,
      gc.created_at,
      gc.updated_at,
      COUNT(gch.id)::int AS configured_hole_count,
      CASE
        WHEN COUNT(gch.id) = gc.hole_count THEN SUM(gch.par)::int
        ELSE NULL
      END AS par_total
    FROM golf_courses AS gc
    LEFT JOIN golf_course_holes AS gch ON gch.golf_course_id = gc.id
    WHERE gc.golf_club_id = ${golfClubId}
    GROUP BY gc.id
    ORDER BY gc.is_active DESC, gc.name ASC
  `

  return response.status(200).json({
    golfClub: {
      id: clubs[0].id,
      name: clubs[0].name,
      isActive: Boolean(clubs[0].is_active),
    },
    golfCourses: courses.map(toPublicGolfCourse),
  })
}

async function createGolfCourse(request, response, admin) {
  const body = getRequestBody(request)
  const golfClubId = normalizeClubId(request, body)
  const name = normalizeText(body.name, MAXIMUM_NAME_LENGTH)
  const holeCount = normalizeHoleCount(body.holeCount)

  if (!UUID_PATTERN.test(golfClubId)) {
    return response.status(400).json({
      error: "Bitte eine gültige Golfclub-ID angeben.",
    })
  }

  if (!name) {
    return response.status(400).json({
      error: "Bitte einen Namen für den Platz eingeben.",
    })
  }

  if (!holeCount) {
    return response.status(400).json({
      error: "Die Lochanzahl muss 9 oder 18 betragen.",
    })
  }

  const sql = getSql()
  const clubs = await sql`
    SELECT id
    FROM golf_clubs
    WHERE id = ${golfClubId}
    LIMIT 1
  `

  if (clubs.length === 0) {
    return response.status(404).json({
      error: "Der ausgewählte Golfclub wurde nicht gefunden.",
    })
  }

  const newData = JSON.stringify({
    golfClubId,
    name,
    holeCount,
    isActive: true,
  })

  const createdCourses = await sql`
    WITH created_course AS (
      INSERT INTO golf_courses (
        golf_club_id,
        name,
        hole_count,
        is_active
      )
      VALUES (
        ${golfClubId},
        ${name},
        ${holeCount},
        TRUE
      )
      RETURNING
        id,
        golf_club_id,
        name,
        hole_count,
        is_active,
        created_at,
        updated_at
    ),
    inserted_holes AS (
      INSERT INTO golf_course_holes (
        golf_course_id,
        hole_number,
        par,
        handicap_index
      )
      SELECT
        created_course.id,
        hole_number,
        4,
        hole_number
      FROM created_course
      CROSS JOIN generate_series(1, ${holeCount}) AS hole_number
      RETURNING id
    ),
    inserted_audit_log AS (
      INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        previous_data,
        new_data
      )
      SELECT
        ${admin.user_id},
        'golf_course.created',
        'golf_course',
        created_course.id,
        NULL,
        ${newData}::jsonb
      FROM created_course
      RETURNING id
    )
    SELECT
      created_course.*,
      (SELECT COUNT(*)::int FROM inserted_holes) AS configured_hole_count,
      ${holeCount * 4}::int AS par_total
    FROM created_course
    CROSS JOIN (SELECT COUNT(*) FROM inserted_audit_log) AS audit_confirmation
  `

  return response.status(201).json({
    created: true,
    golfCourse: toPublicGolfCourse(createdCourses[0]),
  })
}


async function getGolfCourseDetails(request, response) {
  const golfClubId = normalizeClubId(request)
  const courseId = normalizeCourseId(request)

  if (!UUID_PATTERN.test(golfClubId) || !UUID_PATTERN.test(courseId)) {
    return response.status(400).json({
      error: "Bitte gültige Golfclub- und Platz-IDs angeben.",
    })
  }

  const sql = getSql()
  const courses = await sql`
    SELECT
      gc.id,
      gc.golf_club_id,
      gc.name,
      gc.hole_count,
      gc.is_active,
      gc.created_at,
      gc.updated_at,
      COUNT(gch.id)::int AS configured_hole_count,
      SUM(gch.par)::int AS par_total
    FROM golf_courses AS gc
    LEFT JOIN golf_course_holes AS gch ON gch.golf_course_id = gc.id
    WHERE gc.id = ${courseId}
      AND gc.golf_club_id = ${golfClubId}
    GROUP BY gc.id
  `

  if (courses.length === 0) {
    return response.status(404).json({
      error: "Der ausgewählte Platz wurde nicht gefunden.",
    })
  }

  const holes = await sql`
    SELECT
      id,
      hole_number,
      par,
      handicap_index,
      created_at,
      updated_at
    FROM golf_course_holes
    WHERE golf_course_id = ${courseId}
    ORDER BY hole_number ASC
  `

  return response.status(200).json({
    golfCourse: toPublicGolfCourse(courses[0]),
    holes: holes.map(toPublicGolfCourseHole),
  })
}

async function updateGolfCourseHoles(request, response, admin) {
  const body = getRequestBody(request)
  const golfClubId = normalizeClubId(request, body)
  const courseId = normalizeCourseId(request, body)

  if (!UUID_PATTERN.test(golfClubId) || !UUID_PATTERN.test(courseId)) {
    return response.status(400).json({
      error: "Bitte gültige Golfclub- und Platz-IDs angeben.",
    })
  }

  const sql = getSql()
  const courses = await sql`
    SELECT id, golf_club_id, name, hole_count
    FROM golf_courses
    WHERE id = ${courseId}
      AND golf_club_id = ${golfClubId}
    LIMIT 1
  `

  if (courses.length === 0) {
    return response.status(404).json({
      error: "Der ausgewählte Platz wurde nicht gefunden.",
    })
  }

  const holeCount = Number(courses[0].hole_count)
  const holes = normalizeHoles(body.holes, holeCount)

  if (!holes) {
    return response.status(400).json({
      error:
        `Es müssen alle ${holeCount} Löcher mit Par 3 bis 6 und eindeutigen Handicap-Indizes 1 bis 18 übergeben werden.`,
    })
  }

  const previousHoles = await sql`
    SELECT hole_number, par, handicap_index
    FROM golf_course_holes
    WHERE golf_course_id = ${courseId}
    ORDER BY hole_number ASC
  `

  if (previousHoles.length !== holeCount) {
    return response.status(409).json({
      error: "Die gespeicherten Lochdatensätze sind unvollständig.",
    })
  }

  const previousData = JSON.stringify({
    holes: previousHoles.map((hole) => ({
      holeNumber: Number(hole.hole_number),
      par: Number(hole.par),
      handicapIndex: Number(hole.handicap_index),
    })),
  })
  const newData = JSON.stringify({ holes })

  const transactionQueries = [
    sql`
      UPDATE golf_course_holes
      SET handicap_index = NULL
      WHERE golf_course_id = ${courseId}
    `,
    ...holes.map(
      (hole) => sql`
        UPDATE golf_course_holes
        SET
          par = ${hole.par},
          handicap_index = ${hole.handicapIndex},
          updated_at = NOW()
        WHERE golf_course_id = ${courseId}
          AND hole_number = ${hole.holeNumber}
      `
    ),
    sql`
      UPDATE golf_courses
      SET updated_at = NOW()
      WHERE id = ${courseId}
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
        'golf_course.holes_updated',
        'golf_course',
        ${courseId},
        ${previousData}::jsonb,
        ${newData}::jsonb
      )
    `,
    sql`
      SELECT
        id,
        hole_number,
        par,
        handicap_index,
        created_at,
        updated_at
      FROM golf_course_holes
      WHERE golf_course_id = ${courseId}
      ORDER BY hole_number ASC
    `,
  ]

  const transactionResults = await sql.transaction(transactionQueries)
  const updatedHoles = transactionResults[transactionResults.length - 1]


  if (updatedHoles.length !== holeCount) {
    throw new Error("Not all golf course holes were updated.")
  }

  return response.status(200).json({
    updated: true,
    golfCourse: {
      id: courses[0].id,
      golfClubId: courses[0].golf_club_id,
      name: courses[0].name,
      holeCount,
      parTotal: holes.reduce((total, hole) => total + hole.par, 0),
    },
    holes: updatedHoles.map(toPublicGolfCourseHole),
  })
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (!["GET", "POST", "PATCH"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST, PATCH")
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
      const courseId = normalizeCourseId(request)
      return courseId
        ? await getGolfCourseDetails(request, response)
        : await listGolfCourses(request, response)
    }

    if (request.method === "PATCH") {
      return await updateGolfCourseHoles(request, response, admin)
    }

    return await createGolfCourse(request, response, admin)
  } catch (error) {
    if (error?.code === "23505") {
      return response.status(409).json({
        error: "Ein Platz mit diesem Namen ist für den Golfclub bereits vorhanden.",
      })
    }

    if (error?.code === "23514") {
      return response.status(400).json({
        error: "Die Platzdaten erfüllen nicht die erforderlichen Vorgaben.",
      })
    }

    console.error("Admin golf course request failed.", error)
    return response.status(500).json({
      error: "Plätze konnten nicht verarbeitet werden.",
    })
  }
}
