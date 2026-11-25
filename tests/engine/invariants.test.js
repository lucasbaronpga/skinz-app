import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateMatch } from "../../lib/engine/index.js"
import { deepFreeze } from "./helpers.js"

const PLAYER_POOL = ["a", "b", "c", "d"]
const STAKES = [10, 20, 50, 100, 200, 500]

function createRandom(seed) {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0

    return state / 2 ** 32
  }
}

function createMatchInput(random) {
  const pick = (values) => values[Math.floor(random() * values.length)]
  const gameMode = pick(["classic", "professional", "wolffn"])
  const playerCount = gameMode === "wolffn" ? 4 : 2 + Math.floor(random() * 3)
  const players = PLAYER_POOL.slice(0, playerCount)
  const holeCount = pick([9, 18])
  const pars = Array.from({ length: holeCount }, () => pick([3, 4, 4, 5]))
  const oozleEnabled = gameMode !== "wolffn" && random() < 0.6
  const playedHoles = Math.floor(random() * (holeCount + 1))

  const holes = Array.from({ length: playedHoles }, (_, index) => {
    const par = pars[index]
    const holeScores = Object.fromEntries(
      players.map((playerId) => [playerId, Math.max(1, par + Math.floor(random() * 6) - 2)])
    )
    const hole = { scores: holeScores }

    if (gameMode === "wolffn") {
      const teeOrder = [...players.slice(index % 4), ...players.slice(0, index % 4)]
      const decision = pick(["alone", "accepted", "declined"])

      hole.wolffn =
        decision === "alone"
          ? { decision }
          : { decision, askedPlayerId: pick(teeOrder.slice(1)) }
    }

    if (oozleEnabled && par === 3) {
      hole.oozle =
        random() < 0.3
          ? { noGreen: true }
          : { playerId: pick(players), putts: 1 + Math.floor(random() * 3) }
    }

    return hole
  })

  return {
    config: {
      gameMode,
      stakeCents: pick(STAKES),
      holeCount,
      pars,
      oozle: oozleEnabled
        ? { enabled: true, valueCents: pick(STAKES), carryoverEnabled: random() < 0.8 }
        : { enabled: false },
    },
    players,
    holes,
  }
}

describe("Invarianten über zufällige Matches", () => {
  it("hält die Abrechnung bei 400 Zufallsmatches immer konsistent", () => {
    const random = createRandom(20261125)

    for (let run = 0; run < 400; run += 1) {
      const input = deepFreeze(createMatchInput(random))
      const result = calculateMatch(input)
      const label = `Lauf ${run}`

      const total = result.players.reduce((sum, player) => sum + player.totalCents, 0)
      assert.equal(total, 0, `${label}: Salden gehen nicht auf`)

      const open = new Map(result.players.map((player) => [player.playerId, player.totalCents]))
      result.settlement.payments.forEach((payment) => {
        assert.ok(payment.amountCents > 0, `${label}: Zahlung ohne Betrag`)
        assert.notEqual(payment.fromPlayerId, payment.toPlayerId, `${label}: Selbstzahlung`)
        open.set(payment.fromPlayerId, open.get(payment.fromPlayerId) + payment.amountCents)
        open.set(payment.toPlayerId, open.get(payment.toPlayerId) - payment.amountCents)
      })
      assert.ok([...open.values()].every((value) => value === 0), `${label}: Zahlungsplan geht nicht auf`)

      const nonZero = result.players.filter((player) => player.totalCents !== 0).length
      assert.ok(
        result.settlement.payments.length <= Math.max(nonZero - 1, 0),
        `${label}: zu viele Zahlungen`
      )

      result.settlement.pairs.forEach((pair) => {
        const mirrored = result.settlement.pairs.find(
          (other) => other.playerId === pair.opponentId && other.opponentId === pair.playerId
        )
        assert.equal(mirrored.totalCents + pair.totalCents, 0, `${label}: Paarzeilen nicht spiegelbildlich`)
      })

      result.players.forEach((player) => {
        assert.ok(player.skinz >= 0, `${label}: negative Skinz`)
        assert.ok(Number.isInteger(player.totalCents), `${label}: Cent nicht ganzzahlig`)
      })

      if (result.holes.length > 0) {
        const lastHole = result.holes[result.holes.length - 1]

        lastHole.players.forEach((holePlayer) => {
          const summary = result.players.find((player) => player.playerId === holePlayer.playerId)
          assert.equal(holePlayer.skinzTotal, summary.skinz, `${label}: Skinz-Summe weicht ab`)
          assert.equal(holePlayer.moneyTotalCents, summary.totalCents, `${label}: Geld-Summe weicht ab`)
        })

        const deltaSum = result.holes.reduce(
          (sum, hole) => sum + hole.players.reduce((holeSum, player) => holeSum + player.moneyDeltaCents, 0),
          0
        )
        assert.equal(deltaSum, 0, `${label}: Geldverlauf nicht ausgeglichen`)
      }

      if (result.holes.length > 1) {
        const prefixLength = 1 + Math.floor(random() * (result.holes.length - 1))
        const prefix = calculateMatch({ ...input, holes: input.holes.slice(0, prefixLength) })

        assert.deepEqual(
          prefix.holes,
          result.holes.slice(0, prefixLength),
          `${label}: Teilmatch weicht vom Gesamtmatch ab`
        )
      }
    }
  })
})
