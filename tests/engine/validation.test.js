import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateMatch, EngineError, eurosToCents, centsToEuros } from "../../lib/engine/index.js"
import { deepFreeze, makeMatch, parsWith, scores } from "./helpers.js"

function expectError(input, code) {
  assert.throws(
    () => calculateMatch(input),
    (error) => error instanceof EngineError && error.code === code
  )
}

describe("Eingabeprüfung", () => {
  it("lehnt fehlende Daten ab", () => {
    expectError(undefined, "INVALID_INPUT")
    expectError({ players: ["a", "b"], holes: [] }, "INVALID_CONFIG")
  })

  it("lehnt ungültige Konfigurationen ab", () => {
    expectError(makeMatch({ config: { gameMode: "scramble" } }), "INVALID_GAME_MODE")
    expectError(makeMatch({ config: { stakeCents: 0 } }), "INVALID_STAKE")
    expectError(makeMatch({ config: { stakeCents: 10.5 } }), "INVALID_STAKE")
    expectError(makeMatch({ config: { stakeCents: 10001 } }), "INVALID_STAKE")
    expectError(makeMatch({ config: { holeCount: 12 } }), "INVALID_HOLE_COUNT")
    expectError(makeMatch({ config: { pars: parsWith({}, 9) } }), "INVALID_PARS")
    expectError(makeMatch({ config: { pars: parsWith({ 3: 7 }) } }), "INVALID_PARS")
  })

  it("unterstützt die Netto-Wertung noch nicht", () => {
    expectError(makeMatch({ config: { scoringMode: "net" } }), "UNSUPPORTED_SCORING_MODE")
  })

  it("lehnt ungültige Spielerlisten ab", () => {
    expectError(makeMatch({ playerIds: ["a"] }), "INVALID_PLAYER_COUNT")
    expectError(makeMatch({ playerIds: ["a", "b", "c", "d", "e"] }), "INVALID_PLAYER_COUNT")
    expectError(makeMatch({ playerIds: ["a", "a"] }), "DUPLICATE_PLAYERS")
    expectError(makeMatch({ playerIds: ["a", ""] }), "INVALID_PLAYERS")
    expectError(makeMatch({ playerIds: ["a", 2] }), "INVALID_PLAYERS")
  })

  it("lehnt Lochlisten mit Lücken oder zu vielen Löchern ab", () => {
    expectError(
      makeMatch({ playerIds: ["a", "b"], holes: [{ holeNumber: 2, scores: scores([4, 4], ["a", "b"]) }] }),
      "INVALID_HOLES"
    )

    const tooMany = Array.from({ length: 10 }, () => ({ scores: scores([4, 4], ["a", "b"]) }))

    expectError(
      makeMatch({ playerIds: ["a", "b"], config: { holeCount: 9, pars: parsWith({}, 9) }, holes: tooMany }),
      "INVALID_HOLES"
    )
  })

  it("lehnt unpassende oder ungültige Scores ab", () => {
    const players = ["a", "b"]

    expectError(makeMatch({ playerIds: players, holes: [{ scores: { a: 4 } }] }), "INVALID_SCORES")
    expectError(makeMatch({ playerIds: players, holes: [{ scores: { a: 4, b: 4, c: 4 } }] }), "INVALID_SCORES")
    expectError(makeMatch({ playerIds: players, holes: [{ scores: { a: 4, x: 4 } }] }), "INVALID_SCORES")
    expectError(makeMatch({ playerIds: players, holes: [{ scores: scores([0, 4], players) }] }), "INVALID_SCORE")
    expectError(makeMatch({ playerIds: players, holes: [{ scores: scores([21, 4], players) }] }), "INVALID_SCORE")
    expectError(makeMatch({ playerIds: players, holes: [{ scores: scores([4.5, 4], players) }] }), "INVALID_SCORE")
    expectError(makeMatch({ playerIds: players, holes: [{ scores: scores(["4", 4], players) }] }), "INVALID_SCORE")
  })

  it("verändert die Eingabedaten nicht", () => {
    const input = deepFreeze(
      makeMatch({
        playerIds: ["a", "b"],
        config: { gameMode: "professional" },
        holes: [{ scores: scores([3, 4], ["a", "b"]) }],
      })
    )

    assert.doesNotThrow(() => calculateMatch(input))
  })

  it("liefert für dieselbe Eingabe immer dasselbe Ergebnis", () => {
    const input = makeMatch({
      playerIds: ["a", "b", "c"],
      holes: [{ scores: scores([4, 4, 5], ["a", "b", "c"]) }, { scores: scores([5, 4, 4], ["a", "b", "c"]) }],
    })

    assert.deepEqual(calculateMatch(input), calculateMatch(input))
  })
})

describe("Geldbeträge", () => {
  it("rechnet Euro exakt in Cent um", () => {
    assert.equal(eurosToCents(0.1), 10)
    assert.equal(eurosToCents(1.15), 115)
    assert.equal(eurosToCents(100), 10000)
    assert.equal(centsToEuros(115), 1.15)
    assert.throws(() => eurosToCents("abc"), (error) => error.code === "INVALID_MONEY")
  })
})
