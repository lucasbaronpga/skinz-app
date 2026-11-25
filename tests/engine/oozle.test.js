import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateMatch, EngineError } from "../../lib/engine/index.js"
import { makeMatch, parsWith, scores, totalsById } from "./helpers.js"

const OOZLE = { enabled: true, valueCents: 50 }

function oozleMatch(holes, { parThrees = [1], oozle = OOZLE, playerIds } = {}) {
  return makeMatch({
    playerIds,
    config: { pars: parsWith(Object.fromEntries(parThrees.map((hole) => [hole, 3]))), oozle },
    holes,
  })
}

function parThreeHole(oozle, values = [4, 4, 4, 4]) {
  return { scores: scores(values), oozle }
}

describe("Oozle", () => {
  it("zahlt bei Oozle (höchstens 2 Putts) jeder Gegner den Betrag an den Spieler", () => {
    const result = calculateMatch(
      oozleMatch([parThreeHole({ playerId: "b", putts: 2 })])
    )

    assert.equal(result.holes[0].oozle.outcome, "oozle")
    assert.equal(result.holes[0].oozle.amountPerOpponentCents, 50)
    assert.deepEqual(result.players.map((player) => player.oozleCents), [-50, 150, -50, -50])
  })

  it("wertet 1 Putt ebenfalls als Oozle", () => {
    const result = calculateMatch(oozleMatch([parThreeHole({ playerId: "c", putts: 1 })]))

    assert.equal(result.holes[0].oozle.outcome, "oozle")
    assert.equal(result.players[2].oozleCents, 150)
  })

  it("lässt bei Foozle (3+ Putts) den Spieler jedem Gegner zahlen", () => {
    const result = calculateMatch(oozleMatch([parThreeHole({ playerId: "b", putts: 3 })]))

    assert.equal(result.holes[0].oozle.outcome, "foozle")
    assert.deepEqual(result.players.map((player) => player.oozleCents), [50, -150, 50, 50])
  })

  it("trennt Oozle-Euro von den Skinz und addiert beides im Gesamtbetrag", () => {
    const result = calculateMatch(
      oozleMatch([parThreeHole({ playerId: "b", putts: 2 }, [3, 4, 4, 4])])
    )

    assert.deepEqual(result.players.map((player) => player.skinzCents), [300, -100, -100, -100])
    assert.deepEqual(result.players.map((player) => player.oozleCents), [-50, 150, -50, -50])
    assert.deepEqual(totalsById(result), { a: 250, b: 50, c: -150, d: -150 })
  })

  it("zeigt Skinz und Oozle je Gegner in den Paarzeilen", () => {
    const result = calculateMatch(
      oozleMatch([parThreeHole({ playerId: "b", putts: 2 }, [3, 4, 4, 4])])
    )
    const aAgainstB = result.settlement.pairs.find(
      (pair) => pair.playerId === "a" && pair.opponentId === "b"
    )

    assert.deepEqual(aAgainstB, {
      playerId: "a",
      opponentId: "b",
      skinzDifference: 1,
      skinzCents: 100,
      oozleCents: -50,
      totalCents: 50,
    })
  })

  it("verdoppelt den Einsatz bei Carryover und löst ihn im nächsten Par 3 auf", () => {
    const result = calculateMatch(
      oozleMatch(
        [
          parThreeHole({ noGreen: true }),
          parThreeHole({ playerId: "a", putts: 1 }),
        ],
        { parThrees: [1, 2] }
      )
    )

    assert.deepEqual(
      [result.holes[0].oozle.carryoverUnitsAfter, result.holes[0].oozle.expired],
      [2, false]
    )
    assert.equal(result.holes[1].oozle.unitsAtStake, 2)
    assert.equal(result.holes[1].oozle.amountPerOpponentCents, 100)
    assert.equal(result.oozleCarryoverUnits, 0)
    assert.equal(result.players[0].oozleCents, 300)
  })

  it("verdoppelt bei jedem weiteren Carryover erneut", () => {
    const result = calculateMatch(
      oozleMatch(
        [
          parThreeHole({ noGreen: true }),
          parThreeHole({ noGreen: true }),
          parThreeHole({ playerId: "a", putts: 2 }),
        ],
        { parThrees: [1, 2, 3] }
      )
    )

    assert.deepEqual(
      result.holes.map((hole) => hole.oozle.unitsAtStake),
      [1, 2, 4]
    )
    assert.equal(result.holes[2].oozle.amountPerOpponentCents, 200)
  })

  it("lässt den Carryover nach dem letzten Par 3 verfallen", () => {
    const result = calculateMatch(
      oozleMatch([parThreeHole({ noGreen: true })], { parThrees: [1] })
    )

    assert.equal(result.holes[0].oozle.expired, true)
    assert.equal(result.oozleCarryoverUnits, 0)
    assert.equal(result.players[0].oozleCents, 0)
  })

  it("lässt den Carryover verfallen, wenn er deaktiviert ist", () => {
    const result = calculateMatch(
      oozleMatch([parThreeHole({ noGreen: true })], {
        parThrees: [1, 2],
        oozle: { ...OOZLE, carryoverEnabled: false },
      })
    )

    assert.equal(result.holes[0].oozle.expired, true)
    assert.equal(result.oozleCarryoverUnits, 0)
  })

  it("trägt den Oozle-Carryover über Löcher ohne Par 3 hinweg", () => {
    const result = calculateMatch(
      oozleMatch(
        [
          parThreeHole({ noGreen: true }),
          { scores: scores([4, 4, 4, 4]) },
          { scores: scores([4, 4, 4, 4]) },
        ],
        { parThrees: [1, 4] }
      )
    )

    assert.equal(result.oozleCarryoverUnits, 2)
    assert.equal(result.holes[1].oozle, null)
  })

  it("rechnet Oozle auch mit zwei Spielern korrekt", () => {
    const result = calculateMatch(
      oozleMatch(
        [{ scores: scores([4, 4], ["a", "b"]), oozle: { playerId: "a", putts: 3 } }],
        { playerIds: ["a", "b"] }
      )
    )

    assert.deepEqual(result.players.map((player) => player.oozleCents), [-50, 50])
  })

  describe("Validierung", () => {
    function expectError(holes, code, options) {
      assert.throws(
        () => calculateMatch(oozleMatch(holes, options)),
        (error) => error instanceof EngineError && error.code === code
      )
    }

    it("verlangt die Oozle-Eingabe auf jedem Par 3", () => {
      expectError([{ scores: scores([4, 4, 4, 4]) }], "MISSING_OOZLE")
    })

    it("lehnt Oozle-Eingaben auf Löchern ohne Par 3 ab", () => {
      expectError(
        [parThreeHole({ noGreen: true })],
        "OOZLE_NOT_ALLOWED",
        { parThrees: [2] }
      )
    })

    it("lehnt unbekannte Spieler und ungültige Putts ab", () => {
      expectError([parThreeHole({ playerId: "x", putts: 2 })], "INVALID_OOZLE")
      expectError([parThreeHole({ playerId: "a", putts: 0 })], "INVALID_OOZLE")
      expectError([parThreeHole({ playerId: "a", putts: 4 })], "INVALID_OOZLE")
    })

    it("lehnt widersprüchliche Eingaben ab", () => {
      expectError([parThreeHole({ noGreen: true, playerId: "a", putts: 2 })], "INVALID_OOZLE")
    })

    it("lehnt einen ungültigen Oozle-Einsatz ab", () => {
      expectError([], "INVALID_OOZLE_VALUE", { oozle: { enabled: true, valueCents: 0 } })
    })
  })
})
