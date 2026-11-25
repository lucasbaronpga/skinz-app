import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateMatch } from "../../lib/engine/index.js"
import { makeMatch, parsWith, scores, skinzById, totalsById } from "./helpers.js"

describe("Classic Skinz", () => {
  it("gibt dem alleinigen Gewinner Loch und 1 Skin", () => {
    const result = calculateMatch(
      makeMatch({ holes: [{ scores: scores([4, 5, 5, 6]) }] })
    )

    assert.deepEqual(skinzById(result), { a: 1, b: 0, c: 0, d: 0 })
    assert.equal(result.holes[0].tie, false)
    assert.deepEqual(result.holes[0].winnerPlayerIds, ["a"])
    assert.equal(result.carryoverSkinz, 0)
  })

  it("baut bei Gleichstand Carryover auf und zahlt ihn dem nächsten Gewinner", () => {
    const result = calculateMatch(
      makeMatch({
        playerIds: ["a", "b"],
        holes: [
          { scores: scores([4, 4], ["a", "b"]) },
          { scores: scores([5, 5], ["a", "b"]) },
          { scores: scores([5, 4], ["a", "b"]) },
        ],
      })
    )

    assert.deepEqual(
      result.holes.map((hole) => hole.carryoverAfter),
      [1, 2, 0]
    )
    assert.deepEqual(skinzById(result), { a: 0, b: 3 })
    assert.equal(result.holes[2].potSkinz, 3)
  })

  it("rechnet 12 zu 0 Skinz bei 1 € und 4 Spielern zu 36 € für den Gewinner", () => {
    const holes = Array.from({ length: 12 }, () => ({ scores: scores([3, 4, 4, 4]) }))
    const result = calculateMatch(makeMatch({ holes }))

    assert.deepEqual(totalsById(result), { a: 3600, b: -1200, c: -1200, d: -1200 })
    assert.deepEqual(result.settlement.payments, [
      { fromPlayerId: "b", toPlayerId: "a", amountCents: 1200 },
      { fromPlayerId: "c", toPlayerId: "a", amountCents: 1200 },
      { fromPlayerId: "d", toPlayerId: "a", amountCents: 1200 },
    ])
  })

  it("vergibt im Classic-Modus keine Birdie-Bonus-Skinz", () => {
    const result = calculateMatch(makeMatch({ holes: [{ scores: scores([2, 4, 4, 4]) }] }))

    assert.deepEqual(skinzById(result), { a: 1, b: 0, c: 0, d: 0 })
    assert.equal(result.players[0].bonusSkinz, 0)
  })

  it("verteilt offenen Carryover am Ende nur auf die Spieler, die das letzte Loch geteilt haben", () => {
    const players = ["a", "b", "c"]
    const holes = [
      ...Array.from({ length: 7 }, () => ({ scores: scores([3, 4, 4], players) })),
      { scores: scores([4, 4, 4], players) },
      { scores: scores([4, 4, 5], players) },
    ]
    const result = calculateMatch(
      makeMatch({ playerIds: players, config: { holeCount: 9, pars: parsWith({}, 9) }, holes })
    )

    assert.equal(result.status, "completed")
    assert.deepEqual(result.finalCarryover, { skinz: 2, recipientPlayerIds: ["a", "b"] })
    assert.equal(result.carryoverSkinz, 0)
    assert.deepEqual(skinzById(result), { a: 9, b: 2, c: 0 })
    assert.deepEqual(totalsById(result), { a: 1600, b: -500, c: -1100 })
    assert.equal(result.holes[8].players[0].endCarryoverSkinz, 2)
    assert.equal(result.holes[8].players[2].endCarryoverSkinz, 0)
  })

  it("lässt keinen Carryover übrig, wenn das letzte Loch einen Gewinner hat", () => {
    const players = ["a", "b"]
    const holes = [
      ...Array.from({ length: 8 }, () => ({ scores: scores([4, 4], players) })),
      { scores: scores([3, 4], players) },
    ]
    const result = calculateMatch(
      makeMatch({ playerIds: players, config: { holeCount: 9, pars: parsWith({}, 9) }, holes })
    )

    assert.equal(result.finalCarryover, null)
    assert.deepEqual(skinzById(result), { a: 9, b: 0 })
  })

  it("meldet den Status und das nächste Loch", () => {
    const partial = calculateMatch(
      makeMatch({ holes: [{ scores: scores([4, 4, 4, 4]) }, { scores: scores([4, 5, 5, 5]) }] })
    )
    const empty = calculateMatch(makeMatch())

    assert.equal(partial.status, "in_progress")
    assert.equal(partial.currentHole, 3)
    assert.equal(partial.holesPlayed, 2)
    assert.equal(empty.currentHole, 1)
    assert.deepEqual(skinzById(empty), { a: 0, b: 0, c: 0, d: 0 })
  })

  it("liefert für jedes Loch Ergebnislabel, To-Par und Geldverlauf", () => {
    const result = calculateMatch(makeMatch({ holes: [{ scores: scores([1, 4, 5, 6]) }] }))
    const [first, second] = result.holes[0].players

    assert.equal(first.resultLabel, "Albatross")
    assert.equal(first.holeInOne, true)
    assert.equal(first.toPar, -3)
    assert.equal(second.resultLabel, "Par")
    assert.equal(first.moneyDeltaCents, 300)
    assert.equal(second.moneyDeltaCents, -100)
  })

  it("berechnet nach einer Score-Korrektur das ganze Match neu", () => {
    const original = [
      { scores: scores([4, 5, 5, 5]) },
      { scores: scores([4, 4, 5, 5]) },
      { scores: scores([5, 4, 5, 5]) },
    ]
    const corrected = [
      original[0],
      { scores: scores([4, 3, 5, 5]) },
      original[2],
    ]

    const before = calculateMatch(makeMatch({ holes: original }))
    const after = calculateMatch(makeMatch({ holes: corrected }))

    assert.deepEqual(skinzById(before), { a: 1, b: 2, c: 0, d: 0 })
    assert.deepEqual(skinzById(after), { a: 1, b: 2, c: 0, d: 0 })
    assert.equal(before.holes[1].tie, true)
    assert.equal(before.holes[2].potSkinz, 2)
    assert.equal(after.holes[1].tie, false)
    assert.equal(after.holes[1].winningScore, 3)
    assert.equal(after.holes[2].potSkinz, 1)
  })
})
