import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import { getGameModeLabel, getRequiredPlayers } from "../../src/utils/gameModes.js"
import {
  buildInviteUrl,
  clearPendingInvite,
  readInviteToken,
  savePendingInvite,
  takePendingInvite,
} from "../../src/utils/invite.js"
import { STAKE_PRESETS_CENTS, canStepStake, stepStake } from "../../src/utils/stake.js"

const TOKEN = "A".repeat(16) + "b_-9".repeat(4)

describe("Einsatz-Stufen", () => {
  it("springt zur nächsten Stufe", () => {
    assert.equal(stepStake(200, 1), 500)
    assert.equal(stepStake(200, -1), 100)
    assert.equal(stepStake(150, 1), 200)
    assert.equal(stepStake(150, -1), 100)
  })

  it("bleibt an den Grenzen stehen", () => {
    assert.equal(stepStake(10, -1), 10)
    assert.equal(stepStake(10000, 1), 10000)
    assert.equal(canStepStake(10, -1), false)
    assert.equal(canStepStake(10000, 1), false)
    assert.equal(canStepStake(200, 1), true)
  })

  it("passt zu den Grenzen der Engine (1 Cent bis 100 €)", () => {
    assert.ok(STAKE_PRESETS_CENTS.every((cents) => Number.isInteger(cents) && cents >= 1 && cents <= 10000))
  })
})

describe("Spielmodi", () => {
  it("liefert Bezeichnung und benötigte Zusagen", () => {
    assert.equal(getGameModeLabel("wolffn"), "Wolffn")
    assert.equal(getGameModeLabel("unbekannt"), "Skinz")
    assert.deepEqual(getRequiredPlayers("wolffn"), { min: 4, max: 4 })
    assert.deepEqual(getRequiredPlayers("classic"), { min: 2, max: 4 })
  })
})

describe("Einladungslink", () => {
  let store

  beforeEach(() => {
    store = new Map()
    globalThis.window = {
      localStorage: {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key),
      },
    }
  })

  afterEach(() => {
    delete globalThis.window
  })

  it("baut den Link mit dem Token im Hash", () => {
    assert.equal(buildInviteUrl("https://skinz.de/", TOKEN), `https://skinz.de/join#token=${TOKEN}`)
  })

  it("liest nur gültige Tokens aus dem Hash", () => {
    assert.equal(readInviteToken(`#token=${TOKEN}`), TOKEN)
    assert.equal(readInviteToken("#token=kaputt"), "")
    assert.equal(readInviteToken(""), "")
  })

  it("merkt sich eine Einladung genau einmal", () => {
    savePendingInvite(TOKEN)

    assert.equal(takePendingInvite(), TOKEN)
    assert.equal(takePendingInvite(), "")
  })

  it("ignoriert ungültige Tokens und lässt sich löschen", () => {
    savePendingInvite("kaputt")
    assert.equal(takePendingInvite(), "")

    savePendingInvite(TOKEN)
    clearPendingInvite()
    assert.equal(takePendingInvite(), "")
  })
})
