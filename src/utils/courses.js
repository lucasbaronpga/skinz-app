/**
 * Macht aus der Antwort von /api/golf-courses ({ golfClubs: [{ golfCourses }] })
 * eine flache Liste spielbarer Plätze. Fehlende Club-Angaben werden aus dem
 * Club übernommen.
 */
export function flattenGolfClubs(payload) {
  const clubs = Array.isArray(payload?.golfClubs) ? payload.golfClubs : []

  return clubs.flatMap((club) =>
    (Array.isArray(club?.golfCourses) ? club.golfCourses : []).map((course) => ({
      ...course,
      clubName: course?.clubName || club?.name || course?.name || "",
      location: course?.location || club?.location || null,
      state: course?.state || club?.state || null,
      country: course?.country || club?.country || null,
    }))
  )
}
