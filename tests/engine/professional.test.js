import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateMatch } from "../../lib/engine/index.js"
import { makeMatch, parsWith, scores, skinzById, totalsById } from "./helpers.js"

function professional(holes, extra = {}) {
  return makeMatch({
    playerIds: extra.playerIds ?? ["a", "b"],
    config: { gameMode: "professional", ...extra.config },
    holes,
  })
}

describe("Skinz Professional", () => {
  it("zahlt bei 2 Carryover und Birdie-Gewinn 4 Skinz (3 Loch-Skinz + 1 Bonus)", () => {
    const result = calculateMatch(
      professional([
        { scores: scores([4, 4], ["a", "b"]) },
        { scores: scores([5, 5], ["a", "b"]) },
        { scores: scores([3, 4], ["a", "b"]) },
      ])
    )

    assert.deepEqual(skinzById(result), { a: 4, b: 0 })
    assert.equal(result.holes[2].players[0].holeSkinz, 3)
    assert.equal(result.holes[2].players[0].bonusSkinz, 1)
    assert.equal(result.players[0].bonusSkinz, 1)
    assert.deepEqual(totalsById(result), { a: 400, b: -400 })
  })

  it("vergibt den Bonus auch bei geteiltem Loch und erhöht trotzdem den Carryover um 1", () => {
    const result = calculateMatch(professional([{ scores: scores([3, 3], ["a", "b"]) }]))

    assert.equal(result.holes[0].tie, true)
    assert.equal(result.holes[0].carryoverAfter, 1)
    assert.deepEqual(skinzById(result), { a: 1, b: 1 })
  })

  it("vergibt den Bonus auch dem Spieler, der das Loch verliert", () => {
    const result = calculateMatch(professional([{ scores: scores([3, 2], ["a", "b"]) }]))
    const [a, b] = result.holes[0].players

    assert.equal(a.holeSkinz, 0)
    assert.equal(a.bonusSkinz, 1)
    assert.equal(b.holeSkinz, 1)
    assert.equal(b.bonusSkinz, 2)
    assert.deepEqual(skinzById(result), { a: 1, b: 3 })
    assert.deepEqual(totalsById(result), { a: -200, b: 200 })
  })

  it("staffelt den Bonus: Birdie +1, Eagle +2, Albatross +3", () => {
    const config = { pars: parsWith({ 1: 5, 2: 5, 3: 5 }) }
    const result = calculateMatch(
      professional(
        [
          { scores: scores([4, 9], ["a", "b"]) },
          { scores: scores([3, 9], ["a", "b"]) },
          { scores: scores([2, 9], ["a", "b"]) },
        ],
        { config }
      )
    )

    assert.deepEqual(
      result.holes.map((hole) => hole.players[0].bonusSkinz),
      [1, 2, 3]
    )
    assert.deepEqual(
      result.holes.map((hole) => hole.players[0].resultLabel),
      ["Birdie", "Eagle", "Albatross"]
    )
  })

  it("wertet ein Hole-in-One auf Par 3 wie ein Eagle (+2)", () => {
    const result = calculateMatch(
      professional([{ scores: scores([1, 3], ["a", "b"]) }], { config: { pars: parsWith({ 1: 3 }) } })
    )

    assert.equal(result.holes[0].players[0].holeInOne, true)
    assert.equal(result.holes[0].players[0].resultLabel, "Eagle")
    assert.equal(result.holes[0].players[0].bonusSkinz, 2)
    assert.deepEqual(skinzById(result), { a: 3, b: 0 })
  })

  it("wertet ein Hole-in-One auf Par 4 als Albatross (+3)", () => {
    const result = calculateMatch(professional([{ scores: scores([1, 4], ["a", "b"]) }]))

    assert.equal(result.holes[0].players[0].bonusSkinz, 3)
    assert.deepEqual(skinzById(result), { a: 4, b: 0 })
  })

  it("verändert Carryover und Pot nicht durch den Bonus", () => {
    const result = calculateMatch(
      professional([
        { scores: scores([3, 4], ["a", "b"]) },
        { scores: scores([4, 4], ["a", "b"]) },
      ])
    )

    assert.equal(result.holes[0].potSkinz, 1)
    assert.equal(result.holes[0].carryoverAfter, 0)
    assert.equal(result.holes[1].carryoverAfter, 1)
  })

  it("verteilt den Carryover am Ende nur auf die geteilten Besten, der Bonus bleibt separat", () => {
    const players = ["a", "b", "c"]
    const result = calculateMatch(
      professional([...Array.from({ length: 8 }, () => ({ scores: scores([5, 5, 5], players) })), { scores: scores([3, 3, 4], players) }], {
        playerIds: players,
        config: { holeCount: 9, pars: parsWith({}, 9) },
      })
    )

    assert.deepEqual(result.finalCarryover, { skinz: 9, recipientPlayerIds: ["a", "b"] })
    assert.deepEqual(skinzById(result), { a: 10, b: 10, c: 0 })
  })
})
