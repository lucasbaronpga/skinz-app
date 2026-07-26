import { requireActiveUser, setNoStoreHeaders } from "../../lib/auth.js"
import { getSql } from "../../lib/database.js"

function toPublicGolfClub(club) {
  return {
    id: club.id,
    name: club.name,
    location: club.location || null,
    state: club.state || null,
    country: club.country,
  }
}

function toPublicGolfCourse(course, golfClub, holes) {
  const sortedHoles = [...holes].sort(
    (first, second) => first.holeNumber - second.holeNumber
  )

  return {
    id: course.id,
    golfClubId: golfClub.id,
    clubName: golfClub.name,
    name: course.name,
    location: golfClub.location || null,
    state: golfClub.state || null,
    country: golfClub.country,
    holeCount: course.holeCount,
    par: sortedHoles.reduce((total, hole) => total + hole.par, 0),
    pars: sortedHoles.map((hole) => hole.par),
    handicapIndexes: sortedHoles.map((hole) => hole.handicapIndex),
    holes: sortedHoles,
    updatedAt: course.updatedAt,
  }
}

function isCompleteGolfCourse(course, holes) {
  if (!course || ![9, 18].includes(course.holeCount)) return false
  if (!Array.isArray(holes) || holes.length !== course.holeCount) return false

  const expectedHoleNumbers = Array.from(
    { length: course.holeCount },
    (_, index) => index + 1
  )
  const holeNumbers = holes.map((hole) => hole.holeNumber)
  const handicapIndexes = holes.map((hole) => hole.handicapIndex)

  return (
    expectedHoleNumbers.every((holeNumber) => holeNumbers.includes(holeNumber)) &&
    new Set(holeNumbers).size === course.holeCount &&
    new Set(handicapIndexes).size === course.holeCount &&
    holes.every(
      (hole) =>
        Number.isInteger(hole.holeNumber) &&
        Number.isInteger(hole.par) &&
        hole.par >= 3 &&
        hole.par <= 6 &&
        Number.isInteger(hole.handicapIndex) &&
        hole.handicapIndex >= 1 &&
        hole.handicapIndex <= 18
    )
  )
}

async function listPlayableGolfCourses(response) {
  const sql = getSql()
  const rows = await sql`
    SELECT
      gcl.id AS golf_club_id,
      gcl.name AS golf_club_name,
      gcl.location AS golf_club_location,
      gcl.state AS golf_club_state,
      gcl.country AS golf_club_country,
      gc.id AS golf_course_id,
      gc.name AS golf_course_name,
      gc.hole_count,
      gc.updated_at AS golf_course_updated_at,
      gch.hole_number,
      gch.par,
      gch.handicap_index
    FROM golf_clubs AS gcl
    JOIN golf_courses AS gc
      ON gc.golf_club_id = gcl.id
     AND gc.is_active = TRUE
    JOIN golf_course_holes AS gch
      ON gch.golf_course_id = gc.id
    WHERE gcl.is_active = TRUE
    ORDER BY
      gcl.name ASC,
      gcl.location ASC NULLS LAST,
      gc.name ASC,
      gch.hole_number ASC
  `

  const clubsById = new Map()

  rows.forEach((row) => {
    const golfClubId = row.golf_club_id
    const golfCourseId = row.golf_course_id

    if (!clubsById.has(golfClubId)) {
      clubsById.set(golfClubId, {
        golfClub: {
          id: golfClubId,
          name: row.golf_club_name,
          location: row.golf_club_location,
          state: row.golf_club_state,
          country: row.golf_club_country,
        },
        coursesById: new Map(),
      })
    }

    const clubEntry = clubsById.get(golfClubId)

    if (!clubEntry.coursesById.has(golfCourseId)) {
      clubEntry.coursesById.set(golfCourseId, {
        course: {
          id: golfCourseId,
          name: row.golf_course_name,
          holeCount: Number(row.hole_count),
          updatedAt: row.golf_course_updated_at,
        },
        holes: [],
      })
    }

    clubEntry.coursesById.get(golfCourseId).holes.push({
      holeNumber: Number(row.hole_number),
      par: Number(row.par),
      handicapIndex: Number(row.handicap_index),
    })
  })

  const golfClubs = Array.from(clubsById.values())
    .map(({ golfClub, coursesById }) => {
      const golfCourses = Array.from(coursesById.values())
        .filter(({ course, holes }) => isCompleteGolfCourse(course, holes))
        .map(({ course, holes }) =>
          toPublicGolfCourse(course, golfClub, holes)
        )

      return {
        ...toPublicGolfClub(golfClub),
        golfCourses,
      }
    })
    .filter((golfClub) => golfClub.golfCourses.length > 0)

  return response.status(200).json({ golfClubs })
}

export default async function handler(request, response) {
  setNoStoreHeaders(response)

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Method not allowed." })
  }

  try {
    const user = await requireActiveUser(request)

    if (!user) {
      return response.status(401).json({
        error: "Eine aktive Anmeldung ist erforderlich.",
      })
    }

    return await listPlayableGolfCourses(response)
  } catch (error) {
    console.error("Playable golf course request failed.", error)
    return response.status(500).json({
      error: "Spielbare Golfplätze konnten nicht geladen werden.",
    })
  }
}
