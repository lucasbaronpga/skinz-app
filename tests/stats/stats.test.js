import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ProfileError, normalizePayPalLink, normalizeProfileInput, readVisibility } from "../../lib/profile.js"
import {
  calculateHandicap,
  calculateRoundValue,
  computeSkinzHandicaps,
  getOpponentFactor,
} from "../../lib/skinzHandicap.js"
import { aggregatePlayers, getWinnerId, headToHead, listSeasons, rankPlayers, seasonSeries } from "../../lib/stats.js"

function match(id, season, players, extra = {}) {
  return { id, matchCode: id, completedAt: `${season}-06-01T10:00:00Z`, season, holeCount: 9, stakeCents: 200, players, ...extra }
}

function player(userId, totalToPar, skinz, totalCents, totalStrokes = 35 + totalToPar) {
  return { userId, totalToPar, skinz, totalCents, totalStrokes }
}

// SKZ-0016 aus dem Praxistest
const SKZ16 = match("SKZ-0016", 2026, [player("lucas", 0, 6, 200), player("max", 1, 5, -200)])

describe("Skinz HCP", () => {
  it("rechnet das freigegebene Beispiel SKZ-0016 nach", () => {
    const lucas = calculateRoundValue({ totalToPar: 0, holeCount: 9, skinz: 6, totalSkinz: 11, playerCount: 2 })
    const max = calculateRoundValue({ totalToPar: 1, holeCount: 9, skinz: 5, totalSkinz: 11, playerCount: 2 })

    assert.equal(Math.round(lucas * 10) / 10, -0.4)
    assert.equal(Math.round(max * 10) / 10, 2.4)
  })

  it("nutzt ohne vergebene Skinz den fairen Anteil", () => {
    assert.equal(calculateRoundValue({ totalToPar: 3, holeCount: 18, skinz: 0, totalSkinz: 0, playerCount: 4 }), 3)
  })

  it("begrenzt den Gegnerfaktor auf 0,5 bis 1,5", () => {
    assert.equal(getOpponentFactor(18, [18, 18]), 1)
    assert.equal(getOpponentFactor(54, [0]), 1.5)
    assert.equal(getOpponentFactor(0, [54]), 0.5)
    assert.ok(getOpponentFactor(20, [10]) > 1, "gegen stärkere Gegner zählt Erfolg mehr")
    assert.equal(getOpponentFactor(10, []), 1)
  })

  it("zeigt das HCP erst ab 3 Runden und nimmt die besten 8 der letzten 10", () => {
    assert.equal(calculateHandicap([1, 2]), null)
    assert.equal(calculateHandicap([1, 2, 3]), 2)

    const values = [30, 30, 1, 1, 1, 1, 1, 1, 1, 1, 20, 20]

    assert.equal(calculateHandicap(values), 1, "älteste 2 fallen raus, schlechteste 2 der letzten 10 zählen nicht")
  })

  it("berechnet für alle Spieler chronologisch", () => {
    const matches = [SKZ16, SKZ16, SKZ16]
    const result = computeSkinzHandicaps(matches, new Map([["lucas", 18], ["max", 18]]))

    assert.equal(result.get("lucas").rounds, 3)
    assert.equal(result.get("lucas").value, -0.4)
    assert.equal(result.get("max").value, 2.4)
    assert.equal(computeSkinzHandicaps([SKZ16]).get("lucas").value, null)
  })
})

describe("Statistik", () => {
  const matches = [
    SKZ16,
    match("m2", 2026, [player("lucas", 4, 1, -400), player("max", 2, 3, 400)]),
    match("m3", 2026, [player("lucas", 2, 2, 0), player("max", 2, 2, 0)]),
    match("m4", 2025, [player("lucas", 0, 2, 200), player("max", 3, 1, -200)]),
  ]

  it("erkennt nur eindeutige Sieger", () => {
    assert.equal(getWinnerId(SKZ16), "lucas")
    assert.equal(getWinnerId(matches[2]), null)
  })

  it("summiert Runden, Siege, Geld, Skinz und beste Runde", () => {
    const stats = aggregatePlayers(matches.filter((entry) => entry.season === 2026)).get("lucas")

    assert.deepEqual(
      [stats.rounds, stats.wins, stats.earningsCents, stats.skinz, stats.averageToPar18, stats.bestRound.matchId],
      [3, 1, -200, 9, 4, "SKZ-0016"]
    )
  })

  it("sortiert nach Euro, Skinz oder Siegen mit Gleichstand", () => {
    const rows = [...aggregatePlayers(matches.filter((entry) => entry.season === 2026)).values()]

    assert.deepEqual(rankPlayers(rows, "earnings").map((row) => [row.userId, row.position]), [["max", "1"], ["lucas", "2"]])
    assert.deepEqual(rankPlayers(rows, "skinz").map((row) => [row.userId, row.position]), [["max", "1"], ["lucas", "2"]])
    assert.deepEqual(rankPlayers(rows, "wins").map((row) => row.position), ["T1", "T1"])
  })

  it("liefert Head-to-Head als Skinz-Differenz × Einsatz", () => {
    const [row] = headToHead(matches.filter((entry) => entry.season === 2026), "lucas")

    assert.deepEqual(row, { opponentId: "max", matches: 3, wins: 1, losses: 1, balanceCents: -200 })
  })

  it("liefert den Saisonverlauf kumuliert", () => {
    assert.deepEqual(
      seasonSeries(matches.filter((entry) => entry.season === 2026), "lucas").map((point) => point.totalCents),
      [200, -200, -200]
    )
  })

  it("listet Saisons absteigend", () => {
    assert.deepEqual(listSeasons(matches), [2026, 2025])
  })
})

describe("Profil", () => {
  const valid = {
    displayName: "  Lucas   Baron ",
    shortName: "lb",
    handicapIndex: "12.44",
    homeClubId: "",
    avatarColor: "#006847",
    paypalLink: "paypal.me/lucasbaron/",
    visibility: { leaderboardAnonymous: true, showStats: "ja" },
  }

  it("normalisiert gültige Eingaben", () => {
    assert.deepEqual(normalizeProfileInput(valid), {
      displayName: "Lucas Baron",
      shortName: "LB",
      handicapIndex: 12.4,
      homeClubId: null,
      avatarColor: "#006847",
      paypalLink: "https://paypal.me/lucasbaron",
      visibility: { leaderboardAnonymous: true, showStats: true, showHandicap: false, showHomeClub: false },
    })
  })

  it("lehnt ungültige Eingaben mit Meldung ab", () => {
    const cases = [
      { displayName: "L" },
      { shortName: "L-B" },
      { handicapIndex: 60 },
      { homeClubId: "kein-uuid" },
      { avatarColor: "#ff00ff" },
      { paypalLink: "https://evil.example/paypal.me/x" },
    ]

    cases.forEach((change) => assert.throws(() => normalizeProfileInput({ ...valid, ...change }), ProfileError))
  })

  it("setzt datensparsame Voreinstellungen", () => {
    assert.deepEqual(readVisibility(null), {
      leaderboardAnonymous: false,
      showStats: true,
      showHandicap: false,
      showHomeClub: false,
    })
    assert.equal(normalizePayPalLink(""), null)
  })
})
