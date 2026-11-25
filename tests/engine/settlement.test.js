import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateSettlement, EngineError, planPayments } from "../../lib/engine/index.js"

function balances(values) {
  return values.map((amountCents, index) => ({
    playerId: String.fromCharCode(97 + index),
    amountCents,
  }))
}

function applyPayments(entries, payments) {
  const open = new Map(entries.map((entry) => [entry.playerId, entry.amountCents]))

  payments.forEach((payment) => {
    open.set(payment.fromPlayerId, open.get(payment.fromPlayerId) + payment.amountCents)
    open.set(payment.toPlayerId, open.get(payment.toPlayerId) - payment.amountCents)
  })

  return [...open.values()]
}

describe("Zahlungsplan", () => {
  it("gleicht zwei unabhängige Paare mit nur zwei Zahlungen aus", () => {
    const entries = balances([1000, 1000, -1000, -1000])
    const payments = planPayments(entries)

    assert.equal(payments.length, 2)
    assert.deepEqual(applyPayments(entries, payments), [0, 0, 0, 0])
  })

  it("braucht drei Zahlungen, wenn einer gegen drei steht", () => {
    const entries = balances([3000, -1000, -1000, -1000])
    const payments = planPayments(entries)

    assert.equal(payments.length, 3)
    assert.deepEqual(applyPayments(entries, payments), [0, 0, 0, 0])
  })

  it("braucht drei Zahlungen, wenn sich keine Teilgruppe selbst ausgleicht", () => {
    const entries = balances([4000, 1000, -3000, -2000])
    const payments = planPayments(entries)

    assert.equal(payments.length, 3)
    assert.deepEqual(applyPayments(entries, payments), [0, 0, 0, 0])
  })

  it("ignoriert ausgeglichene Spieler", () => {
    const payments = planPayments(balances([2500, -2500, 0]))

    assert.deepEqual(payments, [{ fromPlayerId: "b", toPlayerId: "a", amountCents: 2500 }])
  })

  it("liefert ohne Salden keine Zahlungen", () => {
    assert.deepEqual(planPayments(balances([0, 0, 0])), [])
  })

  it("ist deterministisch", () => {
    const entries = balances([700, -300, 200, -600])

    assert.deepEqual(planPayments(entries), planPayments(entries))
  })

  it("lehnt eine nicht ausgeglichene Abrechnung ab", () => {
    assert.throws(
      () => planPayments(balances([1000, -900])),
      (error) => error instanceof EngineError && error.code === "UNBALANCED_SETTLEMENT"
    )
  })
})

describe("Paarweise Abrechnung", () => {
  it("rechnet (Skinz A − Skinz B) × Einsatz je Paar", () => {
    const settlement = calculateSettlement({
      playerIds: ["a", "b", "c"],
      skinz: new Map([
        ["a", 5],
        ["b", 2],
        ["c", 0],
      ]),
      transfers: [],
      stakeCents: 20,
    })

    assert.deepEqual(
      settlement.players.map((player) => player.totalCents),
      [(5 - 2) * 20 + (5 - 0) * 20, (2 - 5) * 20 + (2 - 0) * 20, (0 - 5) * 20 + (0 - 2) * 20]
    )
  })

  it("liefert für jedes Paar spiegelbildliche Zeilen", () => {
    const settlement = calculateSettlement({
      playerIds: ["a", "b", "c", "d"],
      skinz: new Map([
        ["a", 4],
        ["b", 1],
        ["c", 1],
        ["d", 0],
      ]),
      transfers: [{ fromPlayerId: "d", toPlayerId: "b", amountCents: 70 }],
      stakeCents: 50,
    })

    settlement.pairs.forEach((pair) => {
      const mirrored = settlement.pairs.find(
        (other) => other.playerId === pair.opponentId && other.opponentId === pair.playerId
      )

      assert.equal(mirrored.totalCents + pair.totalCents, 0)
      assert.equal(mirrored.oozleCents + pair.oozleCents, 0)
    })

    assert.equal(settlement.pairs.length, 12)
  })

  it("rechnet krumme Cent-Beträge exakt in ganzen Cent", () => {
    const settlement = calculateSettlement({
      playerIds: ["a", "b", "c"],
      skinz: new Map([
        ["a", 7],
        ["b", 3],
        ["c", 3],
      ]),
      transfers: [],
      stakeCents: 10,
    })

    assert.equal(
      settlement.players.reduce((sum, player) => sum + player.totalCents, 0),
      0
    )
    assert.ok(settlement.players.every((player) => Number.isInteger(player.totalCents)))
  })
})
