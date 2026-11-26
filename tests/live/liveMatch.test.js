import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { EngineError } from "../../lib/engine/errors.js"
import {
  applyHoleInput,
  buildMatchConfig,
  buildPersistence,
  calculateLiveResult,
  getPauseExpiry,
  isPauseExpired,
  readStoredInputs,
  sanitizeHoleInput,
  toLiveState,
} from "../../lib/liveMatch.js"

const PARS_9 = [4, 4, 3, 5, 4, 3, 4, 4, 4]
const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"
const D = "44444444-4444-4444-8444-444444444444"

function match(extra = {}) {
  return {
    id: "match-1",
    match_code: "SKZ-0042",
    status: "active",
    created_by_user_id: A,
    game_mode: "classic",
    stake_amount: "2.00",
    hole_count: 9,
    oozle_enabled: false,
    oozle_value: null,
    oozle_carryover_enabled: true,
    course_snapshot: {
      name: "A-Kurs",
      clubName: "Golfpark Weiherhof",
      location: "Wadern",
      pars: PARS_9,
      handicapIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      tees: [{ lengths: [350, 360, 150, 480, 340, 160, 330, 370, 390] }],
    },
    state_version: 3,
    paused_at: null,
    ...extra,
  }
}

function playerRows(ids = [A, B]) {
  return ids.map((id, index) => ({
    id: `mp-${index + 1}`,
    user_id: id,
    display_order: index + 1,
    display_name_snapshot: `Spieler ${index + 1}`,
    short_name: `S${index + 1}`,
  }))
}

function scores(values, ids = [A, B]) {
  return Object.fromEntries(ids.map((id, index) => [id, values[index]]))
}

describe("Konfiguration aus der Datenbank", () => {
  it("rechnet Euro in Cent um und übernimmt die Par-Werte", () => {
    const config = buildMatchConfig(match({ oozle_enabled: true, oozle_value: "0.50" }))

    assert.equal(config.stakeCents, 200)
    assert.deepEqual(config.pars, PARS_9)
    assert.deepEqual(config.oozle, { enabled: true, valueCents: 50, carryoverEnabled: true })
  })

  it("schaltet Oozle ab, wenn es nicht aktiv ist", () => {
    assert.deepEqual(buildMatchConfig(match()).oozle, { enabled: false })
  })
})

describe("Gespeicherte Eingaben", () => {
  it("liest Roheingaben sortiert nach Loch", () => {
    const rows = [
      { hole_number: 2, game_data: { input: { scores: { a: 5 } } } },
      { hole_number: 1, game_data: { input: { scores: { a: 4 } } } },
    ]

    assert.deepEqual(readStoredInputs(rows), {
      legacy: false,
      inputs: [{ scores: { a: 4 } }, { scores: { a: 5 } }],
    })
  })

  it("erkennt Matches der alten App ohne Roheingaben", () => {
    assert.equal(readStoredInputs([{ hole_number: 1, game_data: { winner: "X" } }]).legacy, true)
    assert.equal(readStoredInputs([{ hole_number: 2, game_data: { input: { scores: {} } } }]).legacy, true)
    assert.equal(readStoredInputs([]).legacy, false)
  })
})

describe("Loch speichern und korrigieren", () => {
  const first = { scores: scores([4, 5]) }

  it("hängt das nächste Loch an", () => {
    assert.equal(applyHoleInput([], 1, first, 9).length, 1)
    assert.equal(applyHoleInput([first], 2, first, 9).length, 2)
  })

  it("ersetzt ein bereits gespieltes Loch", () => {
    const corrected = applyHoleInput([first, first], 1, { scores: scores([3, 5]) }, 9)

    assert.equal(corrected[0].scores[A], 3)
    assert.equal(corrected.length, 2)
  })

  it("lehnt Lücken und Löcher außerhalb des Platzes ab", () => {
    assert.throws(() => applyHoleInput([], 2, first, 9), EngineError)
    assert.throws(() => applyHoleInput([], 0, first, 9), EngineError)
    assert.throws(() => applyHoleInput(new Array(9).fill(first), 10, first, 9), EngineError)
    assert.throws(() => applyHoleInput([], 1.5, first, 9), EngineError)
  })

  it("übernimmt nur bekannte Felder", () => {
    const input = sanitizeHoleInput({
      scores: { a: 4 },
      wolffn: { decision: "alone", askedPlayerId: null, extra: 1 },
      oozle: { noGreen: true, playerId: "x" },
      evil: true,
    })

    assert.deepEqual(input, { scores: { a: 4 }, wolffn: { decision: "alone" }, oozle: { noGreen: true } })
    assert.throws(() => sanitizeHoleInput({}), EngineError)
  })
})

describe("Speicherformat", () => {
  it("schreibt Lochzeilen, Spielerzeilen und Summen konsistent zur Engine", () => {
    const inputs = [{ scores: scores([3, 4]) }, { scores: scores([4, 4]) }, { scores: scores([4, 3]) }]
    const result = calculateLiveResult({ match: match(), playerIds: [A, B], inputs })
    const rows = buildPersistence({ players: playerRows(), result, inputs })

    assert.equal(rows.completed, false)
    assert.equal(rows.holes.length, 3)
    assert.equal(rows.playerHoles.length, 6)
    assert.deepEqual(rows.holes.map((hole) => hole.winner_label), ["Spieler 1", "Carryover", "Spieler 2"])
    assert.deepEqual(rows.holes.map((hole) => hole.skinz_awarded), [1, 0, 2])
    assert.deepEqual(rows.holes[0].game_data.input, inputs[0])
    assert.equal(rows.holes[0].game_data.winningResult, "Birdie")
    assert.equal(rows.holes[2].pot_amount, 4)
    assert.deepEqual(rows.match, { currentHole: 4, carryover: 0, oozleCarryover: 0, status: "active" })
    assert.deepEqual(rows.settlements, [])

    const totalA = rows.playerTotals.find((row) => row.id === "mp-1")

    assert.equal(totalA.skinz_won, 1)
    assert.equal(totalA.total_winnings, -2)
    assert.equal(totalA.total_strokes, 11)
  })

  it("speichert je Spieler gewonnene Skinz so, dass das bisherige Archiv sie zählt", () => {
    const inputs = [{ scores: scores([3, 4]) }]
    const result = calculateLiveResult({ match: match({ game_mode: "professional" }), playerIds: [A, B], inputs })
    const rows = buildPersistence({ players: playerRows(), result, inputs })
    const winner = rows.playerHoles.find((row) => row.match_player_id === "mp-1")

    assert.equal(winner.skinz_delta, 2)
    assert.equal(winner.result_data.totalSkins, 2)
    assert.equal(winner.result_data.bonusSkins, 1)
    assert.equal(winner.result_data.result.label, "Birdie")
  })

  it("schreibt beim letzten Loch Status und Zahlungen", () => {
    const inputs = PARS_9.map((par, index) => ({ scores: scores(index === 0 ? [par - 1, par] : [par, par]) }))
    const result = calculateLiveResult({ match: match(), playerIds: [A, B], inputs })
    const rows = buildPersistence({ players: playerRows(), result, inputs })

    assert.equal(rows.completed, true)
    assert.equal(rows.match.status, "completed")
    assert.equal(rows.match.currentHole, 9)
    assert.ok(rows.settlements.length >= 1)

    const balance = new Map([["mp-1", 0], ["mp-2", 0]])

    rows.settlements.forEach((payment) => {
      balance.set(payment.payer, balance.get(payment.payer) - payment.amount)
      balance.set(payment.recipient, balance.get(payment.recipient) + payment.amount)
    })
    rows.playerTotals.forEach((total) => assert.equal(balance.get(total.id), total.total_winnings))
  })

  it("schreibt Oozle im bisherigen Anzeigeformat und als Geldbewegung je Spieler", () => {
    const configMatch = match({ oozle_enabled: true, oozle_value: "1.00" })
    const inputs = [
      { scores: scores([4, 4]) },
      { scores: scores([4, 4]) },
      { scores: scores([3, 3]), oozle: { playerId: B, putts: 2 } },
    ]
    const result = calculateLiveResult({ match: configMatch, playerIds: [A, B], inputs })
    const rows = buildPersistence({ players: playerRows(), result, inputs })
    const oozleHole = rows.holes[2].game_data.oozle

    assert.deepEqual(
      { outcome: oozleHole.outcome, playerName: oozleHole.playerName, amountPerOpponent: oozleHole.amountPerOpponent },
      { outcome: "oozle", playerName: "Spieler 2", amountPerOpponent: 1 }
    )
    assert.deepEqual(
      rows.playerHoles.filter((row) => row.match_hole_id === rows.holes[2].id).map((row) => row.oozle_winnings_delta),
      [-1, 1]
    )
  })

  it("speichert Wolffn-Teams mit Namen", () => {
    const ids = [A, B, C, D]
    const configMatch = match({ game_mode: "wolffn" })
    const inputs = [{ scores: scores([4, 5, 5, 5], ids), wolffn: { decision: "alone" } }]
    const result = calculateLiveResult({ match: configMatch, playerIds: ids, inputs })
    const rows = buildPersistence({ players: playerRows(ids), result, inputs })

    assert.equal(rows.holes[0].game_data.wolffnFormat, "1v3")
    assert.deepEqual(rows.holes[0].game_data.wolffnTeamA, ["Spieler 1"])
    assert.equal(rows.holes[0].game_data.wolffnMultiplier, 2)
    assert.equal(rows.holes[0].skinz_awarded, 2)
  })
})

describe("Pause", () => {
  it("läuft nach drei Tagen ab", () => {
    const pausedAt = new Date("2026-11-25T10:00:00Z")

    assert.equal(getPauseExpiry(pausedAt).toISOString(), "2026-11-28T10:00:00.000Z")
    assert.equal(isPauseExpired(pausedAt, new Date("2026-11-28T09:59:59Z")), false)
    assert.equal(isPauseExpired(pausedAt, new Date("2026-11-28T10:00:00Z")), true)
    assert.equal(isPauseExpired(null), false)
  })
})

describe("Antwortformat", () => {
  const inputs = [{ scores: scores([3, 4]) }]
  const result = calculateLiveResult({ match: match(), playerIds: [A, B], inputs })

  it("erlaubt nur dem Scorer die Eingabe", () => {
    const scorer = toLiveState({ match: match(), players: playerRows(), inputs, legacy: false, result, currentUserId: A })
    const player = toLiveState({ match: match(), players: playerRows(), inputs, legacy: false, result, currentUserId: B })

    assert.equal(scorer.canScore, true)
    assert.equal(scorer.canControl, true)
    assert.equal(player.canScore, false)
    assert.equal(player.canControl, false)
    assert.equal(player.players[1].isMe, true)
    assert.equal(player.players[0].isScorer, true)
  })

  it("lässt Admins steuern, aber nicht scoren", () => {
    const admin = toLiveState({ match: match(), players: playerRows(), inputs, legacy: false, result, currentUserId: C, isAdmin: true })

    assert.equal(admin.canControl, true)
    assert.equal(admin.canScore, false)
  })

  it("liefert Platzdaten mit Länge und HCP", () => {
    const state = toLiveState({ match: match(), players: playerRows(), inputs, legacy: false, result, currentUserId: A })

    assert.equal(state.course.par, 35)
    assert.equal(state.course.lengths[2], 150)
    assert.equal(state.course.handicapIndexes[0], 1)
    assert.equal(state.config.stakeCents, 200)
    assert.equal(state.version, 3)
  })

  it("sperrt die Eingabe bei Pause, Abschluss und alten Matches", () => {
    const paused = toLiveState({
      match: match({ status: "paused", paused_at: "2026-11-25T10:00:00Z" }),
      players: playerRows(), inputs, legacy: false, result, currentUserId: A,
      now: new Date("2026-11-29T00:00:00Z"),
    })
    const legacy = toLiveState({ match: match(), players: playerRows(), inputs: [], legacy: true, result: null, currentUserId: A })
    const completed = toLiveState({ match: match({ status: "completed" }), players: playerRows(), inputs, legacy: false, result, currentUserId: A })

    assert.equal(paused.canScore, false)
    assert.equal(paused.canControl, true)
    assert.equal(paused.isPauseExpired, true)
    assert.equal(paused.pauseExpiresAt, "2026-11-28T10:00:00.000Z")
    assert.equal(legacy.canScore, false)
    assert.equal(completed.canControl, false)
  })
})
