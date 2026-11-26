function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

function buildCourseSnapshot(course, holes, tees, teeHoles) {
  const lengthsByTeeId = new Map()

  teeHoles.forEach((teeHole) => {
    const teeId = String(teeHole.tee_id)
    const lengths = lengthsByTeeId.get(teeId) || new Map()

    lengths.set(Number(teeHole.hole_number), Number(teeHole.length_meters))
    lengthsByTeeId.set(teeId, lengths)
  })

  return {
    id: course.id,
    clubId: course.golf_club_id,
    clubName: course.club_name,
    name: course.name,
    location: course.location || "",
    state: course.state || "",
    country: course.country || "Deutschland",
    holeCount: Number(course.hole_count),
    par: holes.reduce((total, hole) => total + Number(hole.par), 0),
    pars: holes.map((hole) => Number(hole.par)),
    handicapIndexes: holes.map((hole) =>
      hole.handicap_index === null ? null : Number(hole.handicap_index)
    ),
    tees: tees.map((tee) => {
      const lengths = lengthsByTeeId.get(String(tee.id)) || new Map()

      return {
        id: tee.id,
        name: tee.name,
        color: tee.color || "",
        ratingCategory: tee.rating_category || null,
        courseRating: toNumberOrNull(tee.course_rating),
        slopeRating: toNumberOrNull(tee.slope_rating),
        lengths: holes.map((hole) => lengths.get(Number(hole.hole_number)) || null),
      }
    }),
  }
}

/**
 * Lädt einen aktiven, vollständig konfigurierten Platz als unveränderlichen
 * Snapshot für das Match. Liefert null, wenn der Platz nicht spielbar ist.
 */
export async function loadCourseSnapshot(sql, golfCourseId) {
  const courses = await sql`
    SELECT
      c.id,
      c.golf_club_id,
      c.name,
      c.hole_count,
      gc.name AS club_name,
      gc.location,
      gc.state,
      gc.country
    FROM golf_courses AS c
    JOIN golf_clubs AS gc ON gc.id = c.golf_club_id
    WHERE c.id = ${golfCourseId}
      AND c.is_active = TRUE
      AND gc.is_active = TRUE
    LIMIT 1
  `
  const course = courses[0]

  if (!course || ![9, 18].includes(Number(course.hole_count))) return null

  const holes = await sql`
    SELECT id, hole_number, par, handicap_index
    FROM golf_course_holes
    WHERE golf_course_id = ${golfCourseId}
    ORDER BY hole_number
  `

  if (
    holes.length !== Number(course.hole_count) ||
    holes.some((hole, index) => Number(hole.hole_number) !== index + 1)
  ) {
    return null
  }

  const tees = await sql`
    SELECT id, name, color, rating_category, course_rating, slope_rating, display_order
    FROM golf_course_tees
    WHERE golf_course_id = ${golfCourseId}
      AND is_active = TRUE
    ORDER BY display_order, name, id
  `
  const teeHoles = tees.length
    ? await sql`
        SELECT th.golf_course_tee_id AS tee_id, h.hole_number, th.length_meters
        FROM golf_course_tee_holes AS th
        JOIN golf_course_holes AS h ON h.id = th.golf_course_hole_id
        WHERE th.golf_course_tee_id = ANY(${tees.map((tee) => tee.id)}::uuid[])
        ORDER BY th.golf_course_tee_id, h.hole_number
      `
    : []

  return buildCourseSnapshot(course, holes, tees, teeHoles)
}
