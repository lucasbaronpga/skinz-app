import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { EngineError } from "../../lib/engine/errors.js"
import {
  buildFlightConfig,
  countOccupiedSeats,
  createInviteToken,
  formatMatchCode,
  getFlightExpiry,
  getFreeSeats,
  isFlightExpired,
  isWellFormedInviteToken,
  planFlightStart,
  toPublicFlight,
} from "../../lib/flights.js"

const PARS_9 = [4, 4, 3, 5, 4, 3, 4, 4, 4]

function player(userId, status, order, extra = {}) {
  return {
    user_id: userId,
    invitation_status: status,
    display_order: order,
    display_name_snapshot: `Spieler ${userId}`,
    handicap_index_snapshot: "12.4",
    short_name: userId.toUpperCase(),
    ...extra,
  }
}

function match(extra = {}) {
  return {
    id: "flight-1",
    match_code: "OPEN-flight-1",
    status: "open",
    created_by_user_id: "a",
    golf_course_id: "course-1",
    game_mode: "classic",
    stake_amount: "2.50",
    hole_count: 9,
    oozle_enabled: true,
    oozle_value: "1.00",
    course_snapshot: { name: "A-Kurs", clubName: "Golfpark Weiherhof", location: "Wadern", par: 35 },
    invite_token: "x".repeat(32),
    created_at: new Date("2026-11-25T10:00:00Z"),
    ...extra,
  }
}

describe("Flight-Einstellungen", () => {
  it("prüft mit der Engine und rechnet Cent in Euro für die Datenbank um", () => {
    const { database } = buildFlightConfig(
      { gameMode: "professional", stakeCents: 250, oozle: { enabled: true, valueCents: 100 } },
      PARS_9
    )

    assert.deepEqual(database, {
      gameMode: "professional",
      holeCount: 9,
      stakeAmount: 2.5,
      specialScoringEnabled: true,
      oozleEnabled: true,
      oozleValue: 1,
    })
  })

  it("speichert ohne Oozle keinen Oozle-Einsatz", () => {
    const { database } = buildFlightConfig({ gameMode: "classic", stakeCents: 100 }, PARS_9)

    assert.equal(database.oozleEnabled, false)
    assert.equal(database.oozleValue, null)
    assert.equal(database.specialScoringEnabled, false)
  })

  it("lehnt ungültige Einsätze, Modi und Oozle bei Wolffn ab", () => {
    const cases = [
      [{ gameMode: "classic", stakeCents: 0 }, "INVALID_STAKE"],
      [{ gameMode: "classic", stakeCents: 2.5 }, "INVALID_STAKE"],
      [{ gameMode: "classic", stakeCents: 10001 }, "INVALID_STAKE"],
      [{ gameMode: "scramble", stakeCents: 100 }, "INVALID_GAME_MODE"],
      [{ gameMode: "wolffn", stakeCents: 100, oozle: { enabled: true, valueCents: 100 } }, "OOZLE_NOT_ALLOWED"],
      [{ gameMode: "classic", stakeCents: 100, oozle: { enabled: true, valueCents: 0 } }, "INVALID_OOZLE_VALUE"],
    ]

    cases.forEach(([input, code]) => {
      assert.throws(
        () => buildFlightConfig(input, PARS_9),
        (error) => error instanceof EngineError && error.code === code,
        code
      )
    })
  })
})

describe("Plätze im Flight", () => {
  it("zählt Einladungen und Zusagen, aber keine Absagen", () => {
    const players = [player("a", "accepted", 1), player("b", "invited", 2), player("c", "declined", 3)]

    assert.equal(countOccupiedSeats(players), 2)
    assert.equal(getFreeSeats(players), 2)
  })

  it("meldet nie weniger als null freie Plätze", () => {
    const players = ["a", "b", "c", "d", "e"].map((id, index) => player(id, "accepted", index + 1))

    assert.equal(getFreeSeats(players), 0)
  })
})

describe("Matchstart", () => {
  it("behält nur Zusagen in Abschlagreihenfolge", () => {
    const plan = planFlightStart({
      gameMode: "classic",
      players: [player("c", "accepted", 3), player("a", "accepted", 1), player("b", "invited", 2), player("d", "declined", 4)],
    })

    assert.deepEqual(plan.startingUserIds, ["a", "c"])
    assert.deepEqual(plan.removedUserIds, ["b", "d"])
  })

  it("verlangt mindestens zwei Zusagen", () => {
    assert.throws(
      () => planFlightStart({ gameMode: "classic", players: [player("a", "accepted", 1), player("b", "invited", 2)] }),
      (error) => error instanceof EngineError && /zwei bis vier Zusagen/.test(error.message)
    )
  })

  it("verlangt bei Wolffn genau vier Zusagen", () => {
    const three = ["a", "b", "c"].map((id, index) => player(id, "accepted", index + 1))

    assert.throws(
      () => planFlightStart({ gameMode: "wolffn", players: [...three, player("d", "invited", 4)] }),
      (error) => /genau vier Zusagen/.test(error.message)
    )

    const plan = planFlightStart({ gameMode: "wolffn", players: [...three, player("d", "accepted", 4)] })

    assert.equal(plan.startingUserIds.length, 4)
  })
})

describe("Einladungslink und Laufzeit", () => {
  it("erzeugt zufällige, gültige Tokens", () => {
    const first = createInviteToken()
    const second = createInviteToken()

    assert.ok(isWellFormedInviteToken(first))
    assert.notEqual(first, second)
    assert.equal(isWellFormedInviteToken("zu-kurz"), false)
    assert.equal(isWellFormedInviteToken(`${"a".repeat(31)}!`), false)
    assert.equal(isWellFormedInviteToken(undefined), false)
  })

  it("läuft nach 24 Stunden ab", () => {
    const createdAt = new Date("2026-11-25T10:00:00Z")

    assert.equal(getFlightExpiry(createdAt).toISOString(), "2026-11-26T10:00:00.000Z")
    assert.equal(isFlightExpired(createdAt, new Date("2026-11-26T09:59:59Z")), false)
    assert.equal(isFlightExpired(createdAt, new Date("2026-11-26T10:00:00Z")), true)
  })

  it("formatiert Match-IDs mindestens vierstellig", () => {
    assert.equal(formatMatchCode(7), "SKZ-0007")
    assert.equal(formatMatchCode("42"), "SKZ-0042")
    assert.equal(formatMatchCode(12345), "SKZ-12345")
  })
})

describe("Antwortformat", () => {
  const players = [player("a", "accepted", 1), player("b", "invited", 2)]
  const now = new Date("2026-11-25T12:00:00Z")

  it("zeigt dem Scorer den Einladungs-Token", () => {
    const flight = toPublicFlight({ match: match(), players, currentUserId: "a", now })

    assert.equal(flight.isScorer, true)
    assert.equal(flight.inviteToken, "x".repeat(32))
    assert.equal(flight.myStatus, "accepted")
    assert.equal(flight.matchCode, null)
    assert.equal(flight.freeSeats, 2)
    assert.equal(flight.isExpired, false)
  })

  it("verbirgt den Token vor Eingeladenen", () => {
    const flight = toPublicFlight({ match: match(), players, currentUserId: "b", now })

    assert.equal(flight.isScorer, false)
    assert.equal(flight.inviteToken, null)
    assert.equal(flight.myStatus, "invited")
  })

  it("liefert Beträge in Cent und Spieler sortiert", () => {
    const flight = toPublicFlight({ match: match(), players: [...players].reverse(), currentUserId: "a", now })

    assert.equal(flight.config.stakeCents, 250)
    assert.deepEqual(flight.config.oozle, { enabled: true, valueCents: 100 })
    assert.deepEqual(flight.players.map((entry) => entry.userId), ["a", "b"])
    assert.equal(flight.players[0].isScorer, true)
    assert.equal(flight.players[0].handicapIndex, 12.4)
    assert.equal(flight.players[1].shortName, "B")
    assert.equal(flight.course.clubName, "Golfpark Weiherhof")
  })

  it("zeigt nach dem Start die Match-ID und keinen Token", () => {
    const flight = toPublicFlight({
      match: match({ status: "active", match_code: "SKZ-0012", invite_token: null }),
      players,
      currentUserId: "a",
      now,
    })

    assert.equal(flight.matchCode, "SKZ-0012")
    assert.equal(flight.inviteToken, null)
    assert.equal(flight.expiresAt, null)
    assert.equal(flight.isExpired, false)
  })

  it("markiert abgelaufene offene Flights", () => {
    const flight = toPublicFlight({ match: match(), players, currentUserId: "a", now: new Date("2026-11-27T00:00:00Z") })

    assert.equal(flight.isExpired, true)
  })
})
