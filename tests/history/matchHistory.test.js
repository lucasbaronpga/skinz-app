import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildEngineInput,
  describeHoleOutcome,
  eurosToCents,
  findMatch,
  getCompletedMatches,
  getCoursePars,
  getHoleBadges,
  getPairBreakdown,
  getScorecardRows,
  getStandings,
  getWinnerLabel,
} from "../../src/utils/matchHistory.js"
import { buildPayPalUrl } from "../../src/utils/paypal.js"

const A = "a"
const B = "b"
const PARS = [5, 3, 4, 5, 3, 4, 4, 4, 3]

function hole(holeNumber, scores, extra = {}) {
  return {
    id: `h${holeNumber}`,
    holeNumber,
    par: PARS[holeNumber - 1],
    winnerLabel: extra.winnerLabel ?? null,
    hasTie: extra.hasTie ?? false,
    skinzAwarded: extra.skinzAwarded ?? 0,
    carryoverBefore: extra.carryoverBefore ?? 0,
    carryoverAfter: extra.carryoverAfter ?? 0,
    gameData: { input: { scores }, ...(extra.gameData ?? {}) },
    players: Object.entries(scores).map(([userId, score]) => ({
      userId,
      score,
      resultLabel: extra.labels?.[userId] ?? "Par",
      resultData: { bonusSkins: extra.bonus?.[userId] ?? 0 },
    })),
  }
}

// Das Testmatch SKZ-0016 aus dem Praxistest: Lucas 6 Skinz, Max 5 Skinz, 2 € pro Skin.
function match(extra = {}) {
  const lucas = [5, 3, 4, 5, 3, 4, 3, 5, 3]
  const max = [6, 3, 4, 4, 3, 4, 4, 5, 3]

  return {
    id: "m1",
    matchCode: "SKZ-0016",
    status: "completed",
    gameMode: "classic",
    stake: 2,
    holeCount: 9,
    oozleConfig: { enabled: false, value: null, carryoverEnabled: true },
    course: { name: "A-Kurs", clubName: "Golfpark Weiherhof", pars: PARS },
    completedAt: "2026-11-25T18:00:00Z",
    players: [
      { userId: A, name: "Lucas Baron", shortName: "LB", displayOrder: 1, skins: 6, winnings: 2, totalToPar: 0, total: 35 },
      { userId: B, name: "Max Mustermann", shortName: "MM", displayOrder: 2, skins: 5, winnings: -2, totalToPar: 1, total: 36 },
    ],
    holes: lucas.map((score, index) => hole(index + 1, { [A]: score, [B]: max[index] })),
    settlements: [],
    ...extra,
  }
}

describe("Archiv", () => {
  it("zeigt nur abgeschlossene Matches, das neueste zuerst", () => {
    const list = getCompletedMatches([
      { id: "1", status: "completed", completedAt: "2026-11-01T10:00:00Z" },
      { id: "2", status: "active" },
      { id: "3", status: "completed", completedAt: "2026-11-20T10:00:00Z" },
    ])

    assert.deepEqual(list.map((entry) => entry.id), ["3", "1"])
  })

  it("findet ein Match über ID oder Match-Code", () => {
    const list = [match()]

    assert.equal(findMatch(list, "m1")?.matchCode, "SKZ-0016")
    assert.equal(findMatch(list, "SKZ-0016")?.id, "m1")
    assert.equal(findMatch(list, "x"), null)
  })

  it("sortiert die Spieler nach Geld und markiert mich", () => {
    const standings = getStandings(match(), B)

    assert.deepEqual(standings.map((player) => [player.position, player.name, player.totalCents]), [
      ["1", "Lucas Baron", 200],
      ["2", "Max Mustermann", -200],
    ])
    assert.equal(standings[1].isMe, true)
    assert.equal(getWinnerLabel(match()), "Lucas Baron")
  })

  it("meldet Gleichstand als Unentschieden", () => {
    const tied = match({
      players: match().players.map((player) => ({ ...player, winnings: 0 })),
    })

    assert.equal(getWinnerLabel(tied), "Unentschieden")
    assert.deepEqual(getStandings(tied).map((player) => player.position), ["T1", "T1"])
  })

  it("rechnet Euro sicher in Cent um", () => {
    assert.equal(eurosToCents(2.5), 250)
    assert.equal(eurosToCents("0.1"), 10)
    assert.equal(eurosToCents(null), 0)
  })
})

describe("Scorecard", () => {
  it("nutzt die Par-Werte des Platzes und füllt fehlende aus den Löchern", () => {
    assert.deepEqual(getCoursePars(match()), PARS)
    assert.deepEqual(getCoursePars(match({ course: {} })), PARS)
  })

  it("liefert je Spieler die Scores in Abschlagreihenfolge", () => {
    const rows = getScorecardRows(match())

    assert.deepEqual(rows.map((row) => row.label), ["LB", "MM"])
    assert.equal(rows[1].scores[0], 6)
    assert.equal(rows[0].scores.length, 9)
  })
})

describe("Loch für Loch", () => {
  const holes = [
    hole(1, { a: 4, b: 5 }, { winnerLabel: "Lucas Baron", skinzAwarded: 1 }),
    hole(2, { a: 3, b: 3 }, { hasTie: true, carryoverAfter: 1 }),
    hole(3, { a: 4, b: 4 }, { hasTie: true, carryoverAfter: 2 }),
    hole(4, { a: 5, b: 4 }, { winnerLabel: "Max Mustermann", skinzAwarded: 3, carryoverBefore: 2 }),
  ]

  it("beschreibt Gewinne inklusive Carryover-Löchern", () => {
    assert.deepEqual(describeHoleOutcome(holes, 0, 9), { title: "Lucas Baron", detail: "1 Skin" })
    assert.deepEqual(describeHoleOutcome(holes, 3, 9), { title: "Max Mustermann", detail: "3 Skinz · Löcher 2–4" })
  })

  it("beschreibt geteilte Löcher und das letzte Loch", () => {
    assert.deepEqual(describeHoleOutcome(holes, 2, 9), { title: "Geteilt", detail: "2 Skinz wandern weiter" })

    const last = [hole(9, { a: 3, b: 3 }, { hasTie: true, carryoverAfter: 0 })]

    assert.equal(describeHoleOutcome(last, 0, 9).detail, "Offene Skinz an die Besten verteilt")
  })

  it("zeigt Oozle, Wolffn und Professional-Bonus als Marken", () => {
    const special = hole(1, { a: 4, b: 5 }, {
      bonus: { a: 1 },
      labels: { a: "Birdie" },
      gameData: {
        oozle: { outcome: "foozle", playerName: "Max Mustermann" },
        wolffnFormat: "1v3",
        wolffnPlayer: "Lucas Baron",
        scoreMultiplierLabel: "Birdie x2",
      },
    })

    assert.deepEqual(getHoleBadges(match(), special).map((badge) => badge.label), [
      "Foozle · Max Mustermann",
      "🐺 Lucas Baron allein",
      "Birdie x2",
      "Lucas Baron Birdie +1",
    ])
  })
})

describe("Abrechnung je Gegner", () => {
  it("rechnet neue Matches mit der Spiel-Engine nach", () => {
    const pairs = getPairBreakdown(match(), A)

    assert.equal(pairs.length, 1)
    assert.equal(pairs[0].opponentName, "Max Mustermann")
    assert.equal(pairs[0].skinzDifference, 1)
    assert.equal(pairs[0].totalCents, 200)
    assert.equal(pairs[0].exact, true)
  })

  it("baut die Engine-Eingabe in Abschlagreihenfolge", () => {
    const input = buildEngineInput(match())

    assert.deepEqual(input.players, [A, B])
    assert.equal(input.config.stakeCents, 200)
    assert.equal(input.holes.length, 9)
  })

  it("fällt bei alten Matches auf die Skinz-Differenz zurück", () => {
    const legacy = match({ holes: match().holes.map((entry) => ({ ...entry, gameData: {} })) })
    const pairs = getPairBreakdown(legacy, B)

    assert.equal(buildEngineInput(legacy), null)
    assert.deepEqual(
      pairs.map((pair) => [pair.skinzDifference, pair.totalCents, pair.exact]),
      [[-1, -200, false]]
    )
  })
})

describe("PayPal", () => {
  it("baut einen PayPal.me-Link mit Betrag", () => {
    assert.equal(buildPayPalUrl("https://paypal.me/lucasbaron", 1250), "https://paypal.me/lucasbaron/12.50EUR")
    assert.equal(buildPayPalUrl("paypal.me/lucasbaron/", 200), "https://paypal.me/lucasbaron/2.00EUR")
    assert.equal(buildPayPalUrl("https://www.paypal.com/paypalme/lucas.b", 5), "https://paypal.me/lucas.b/0.05EUR")
  })

  it("lehnt fremde Links und ungültige Beträge ab", () => {
    assert.equal(buildPayPalUrl("https://evil.example/paypal.me/x", 100), null)
    assert.equal(buildPayPalUrl("https://paypal.me/x/../../y", 100), null)
    assert.equal(buildPayPalUrl("javascript:alert(1)", 100), null)
    assert.equal(buildPayPalUrl("", 100), null)
    assert.equal(buildPayPalUrl("https://paypal.me/x", 0), null)
    assert.equal(buildPayPalUrl(null, 100), null)
  })
})
