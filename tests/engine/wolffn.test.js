import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateMatch, EngineError, getTeeOrder } from "../../lib/engine/index.js"
import { makeMatch, parsWith, scores, skinzById, totalsById } from "./helpers.js"

function wolffn(holes, config = {}) {
  return makeMatch({ config: { gameMode: "wolffn", ...config }, holes })
}

function accepted(askedPlayerId) {
  return { decision: "accepted", askedPlayerId }
}

const ALONE = { decision: "alone" }

describe("Wolffn", () => {
  it("rotiert die Abschlagreihenfolge pro Loch", () => {
    const players = ["a", "b", "c", "d"]

    assert.deepEqual(getTeeOrder(players, 1), ["a", "b", "c", "d"])
    assert.deepEqual(getTeeOrder(players, 2), ["b", "c", "d", "a"])
    assert.deepEqual(getTeeOrder(players, 4), ["d", "a", "b", "c"])
    assert.deepEqual(getTeeOrder(players, 5), ["a", "b", "c", "d"])
  })

  it("wertet 2v2 mit angenommenem Partner als Bestball (Pot 1 Skin)", () => {
    const result = calculateMatch(
      wolffn([{ scores: scores([4, 5, 5, 6]), wolffn: accepted("b") }])
    )

    assert.equal(result.holes[0].wolffn.format, "2v2")
    assert.deepEqual(result.holes[0].wolffn.teamAPlayerIds, ["a", "b"])
    assert.deepEqual(result.holes[0].wolffn.teamBPlayerIds, ["c", "d"])
    assert.deepEqual(skinzById(result), { a: 1, b: 1, c: 0, d: 0 })
    assert.deepEqual(totalsById(result), { a: 200, b: 200, c: -200, d: -200 })
    assert.equal(result.settlement.payments.length, 2)
  })

  it("verdoppelt den Pot bei 1v3, wenn der Erste allein spielt und gewinnt", () => {
    const result = calculateMatch(wolffn([{ scores: scores([4, 5, 5, 5]), wolffn: ALONE }]))

    assert.equal(result.holes[0].wolffn.format, "1v3")
    assert.equal(result.holes[0].wolffn.wolfPlayerId, "a")
    assert.equal(result.holes[0].potSkinz, 2)
    assert.deepEqual(skinzById(result), { a: 2, b: 0, c: 0, d: 0 })
    assert.deepEqual(totalsById(result), { a: 600, b: -200, c: -200, d: -200 })
  })

  it("gibt den drei Gegnern je den doppelten Pot, wenn der Einzelne verliert", () => {
    const result = calculateMatch(wolffn([{ scores: scores([5, 4, 5, 6]), wolffn: ALONE }]))

    assert.deepEqual(skinzById(result), { a: 0, b: 2, c: 2, d: 2 })
    assert.deepEqual(totalsById(result), { a: -600, b: 200, c: 200, d: 200 })
  })

  it("lässt den gefragten Spieler allein gegen drei spielen, wenn er ablehnt", () => {
    const result = calculateMatch(
      wolffn([
        {
          scores: scores([5, 4, 5, 5]),
          wolffn: { decision: "declined", askedPlayerId: "b" },
        },
      ])
    )

    assert.equal(result.holes[0].wolffn.format, "1v3")
    assert.equal(result.holes[0].wolffn.wolfPlayerId, "b")
    assert.deepEqual(result.holes[0].wolffn.teamBPlayerIds, ["a", "c", "d"])
    assert.deepEqual(skinzById(result), { a: 0, b: 2, c: 0, d: 0 })
  })

  it("multipliziert Birdie ×2 und Eagle ×4 auf den gesamten Pot", () => {
    const birdie = calculateMatch(wolffn([{ scores: scores([3, 5, 5, 5]), wolffn: accepted("b") }]))
    const eagle = calculateMatch(wolffn([{ scores: scores([2, 5, 5, 5]), wolffn: accepted("b") }]))

    assert.equal(birdie.holes[0].potSkinz, 2)
    assert.equal(birdie.holes[0].wolffn.scoreMultiplier, 2)
    assert.equal(eagle.holes[0].potSkinz, 4)
    assert.equal(eagle.holes[0].wolffn.scoreMultiplier, 4)
  })

  it("multipliziert Wolffn- und Score-Multiplikator miteinander", () => {
    const aloneBirdie = calculateMatch(wolffn([{ scores: scores([3, 5, 5, 5]), wolffn: ALONE }]))
    const aloneEagle = calculateMatch(wolffn([{ scores: scores([2, 5, 5, 5]), wolffn: ALONE }]))

    assert.equal(aloneBirdie.holes[0].potSkinz, 4)
    assert.equal(aloneEagle.holes[0].potSkinz, 8)
    assert.equal(aloneEagle.holes[0].wolffn.totalMultiplier, 8)
  })

  it("wendet die Multiplikatoren auch auf den Carryover bei geteiltem Loch an", () => {
    const result = calculateMatch(
      wolffn([
        { scores: scores([4, 5, 4, 5]), wolffn: accepted("b") },
        { scores: scores([5, 4, 4, 5]), wolffn: ALONE },
        { scores: scores([4, 5, 3, 5]), wolffn: accepted("d") },
      ])
    )

    assert.deepEqual(
      result.holes.map((hole) => [hole.tie, hole.potSkinz, hole.carryoverAfter]),
      [
        [true, 1, 1],
        [true, 4, 4],
        [false, 10, 0],
      ]
    )
    assert.deepEqual(skinzById(result), { a: 0, b: 0, c: 10, d: 10 })
  })

  it("rechnet jede Wolffn-Abrechnung exakt zero-sum", () => {
    const result = calculateMatch(
      wolffn([
        { scores: scores([4, 5, 4, 6]), wolffn: accepted("c") },
        { scores: scores([5, 5, 3, 4]), wolffn: ALONE },
        { scores: scores([6, 4, 5, 5]), wolffn: { decision: "declined", askedPlayerId: "a" } },
      ])
    )

    assert.equal(
      result.players.reduce((sum, player) => sum + player.totalCents, 0),
      0
    )
  })

  it("verteilt am Ende nur an die Spieler, die den besten Score des geteilten Lochs hatten", () => {
    const rotatingWins = Array.from({ length: 8 }, (_, index) => {
      const holeScores = [5, 5, 5, 5]
      holeScores[index % 4] = 4

      return { scores: scores(holeScores), wolffn: ALONE }
    })
    const result = calculateMatch(
      wolffn(
        [...rotatingWins, { scores: scores([5, 4, 4, 6]), wolffn: accepted("b") }],
        { holeCount: 9, pars: parsWith({}, 9) }
      )
    )

    assert.equal(result.status, "completed")
    assert.deepEqual(result.finalCarryover, { skinz: 1, recipientPlayerIds: ["b", "c"] })
    assert.deepEqual(skinzById(result), { a: 4, b: 5, c: 5, d: 4 })
    assert.deepEqual(totalsById(result), { a: -200, b: 200, c: 200, d: -200 })
  })

  describe("Validierung", () => {
    function expectError(holes, code, config) {
      assert.throws(
        () => calculateMatch(wolffn(holes, config)),
        (error) => error instanceof EngineError && error.code === code
      )
    }

    it("verlangt eine Wolffn-Entscheidung pro Loch", () => {
      expectError([{ scores: scores([4, 4, 4, 4]) }], "MISSING_WOLFFN_DECISION")
    })

    it("lehnt unbekannte Entscheidungen ab", () => {
      expectError(
        [{ scores: scores([4, 4, 4, 4]), wolffn: { decision: "maybe" } }],
        "INVALID_WOLFFN_DECISION"
      )
    })

    it("lehnt Alleinspiel mit gefragtem Partner ab", () => {
      expectError(
        [{ scores: scores([4, 4, 4, 4]), wolffn: { decision: "alone", askedPlayerId: "b" } }],
        "INVALID_WOLFFN_DECISION"
      )
    })

    it("lehnt ab, dass der Entscheider sich selbst fragt", () => {
      expectError(
        [{ scores: scores([4, 4, 4, 4]), wolffn: accepted("a") }],
        "INVALID_WOLFFN_DECISION"
      )
    })

    it("lehnt unbekannte Partner ab", () => {
      expectError(
        [{ scores: scores([4, 4, 4, 4]), wolffn: accepted("x") }],
        "INVALID_WOLFFN_DECISION"
      )
    })

    it("lässt in Loch 2 den zweiten Spieler entscheiden", () => {
      const result = calculateMatch(
        wolffn([
          { scores: scores([4, 5, 5, 5]), wolffn: ALONE },
          { scores: scores([5, 4, 5, 5]), wolffn: accepted("a") },
        ])
      )

      assert.equal(result.holes[1].wolffn.decisionPlayerId, "b")
      assert.deepEqual(result.holes[1].wolffn.teamAPlayerIds, ["b", "a"])
    })

    it("verbietet Oozle bei Wolffn", () => {
      expectError(
        [{ scores: scores([4, 4, 4, 4]), wolffn: ALONE }],
        "OOZLE_NOT_ALLOWED",
        { oozle: { enabled: true, valueCents: 50 } }
      )
    })

    it("verlangt genau vier Spieler", () => {
      assert.throws(
        () =>
          calculateMatch(
            makeMatch({ playerIds: ["a", "b", "c"], config: { gameMode: "wolffn" } })
          ),
        (error) => error.code === "INVALID_PLAYER_COUNT"
      )
    })

    it("lehnt Wolffn-Daten in anderen Modi ab", () => {
      assert.throws(
        () =>
          calculateMatch(
            makeMatch({ holes: [{ scores: scores([4, 4, 4, 4]), wolffn: ALONE }] })
          ),
        (error) => error.code === "WOLFFN_NOT_ALLOWED"
      )
    })
  })
})
