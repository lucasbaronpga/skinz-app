import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { flattenGolfClubs } from "../../src/utils/courses.js"

const PAYLOAD = {
  golfClubs: [
    {
      id: "club-1",
      name: "Golfpark Weiherhof",
      location: "Wadern",
      state: "Saarland",
      country: "Deutschland",
      golfCourses: [
        { id: "course-1", name: "A-Kurs", holeCount: 9, par: 35, pars: [4, 4, 3, 5, 4, 3, 4, 4, 4] },
        { id: "course-2", name: "B-Kurs", clubName: "Weiherhof B", location: "Nonnweiler", holeCount: 18, par: 72 },
      ],
    },
    { id: "club-2", name: "Leerer Club", golfCourses: [] },
  ],
}

describe("Golfplätze", () => {
  it("macht aus Clubs eine flache Platzliste", () => {
    const courses = flattenGolfClubs(PAYLOAD)

    assert.deepEqual(courses.map((course) => course.id), ["course-1", "course-2"])
    assert.equal(courses[0].par, 35)
  })

  it("übernimmt Club-Angaben, ohne eigene Werte des Platzes zu überschreiben", () => {
    const [first, second] = flattenGolfClubs(PAYLOAD)

    assert.deepEqual([first.clubName, first.location, first.state], ["Golfpark Weiherhof", "Wadern", "Saarland"])
    assert.deepEqual([second.clubName, second.location], ["Weiherhof B", "Nonnweiler"])
  })

  it("liefert bei fehlenden oder kaputten Daten eine leere Liste", () => {
    assert.deepEqual(flattenGolfClubs(undefined), [])
    assert.deepEqual(flattenGolfClubs({}), [])
    assert.deepEqual(flattenGolfClubs({ golfClubs: [{ name: "X" }, null] }), [])
  })
})
