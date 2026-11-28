import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { AdminInputError, STATUS_CHANGES, adminActions, parseStatusChange } from "../../lib/adminActions.js"

const USER_ID = "11111111-1111-4111-8111-111111111111"

function createResponse() {
  return {
    statusCode: null,
    body: null,
    setHeader() {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

async function call(name, request = {}) {
  const response = createResponse()

  await adminActions[name].handle({ headers: {}, body: {}, ...request }, response)

  return response
}

describe("Benutzerverwaltung: Eingabe", () => {
  it("übernimmt gültige Eingaben und kürzt den Grund", () => {
    assert.deepEqual(parseStatusChange({ userId: USER_ID.toUpperCase(), action: "approve", reason: "  Kollege   aus dem Club  " }), {
      userId: USER_ID,
      action: "approve",
      reason: "Kollege aus dem Club",
    })
    assert.equal(parseStatusChange({ userId: USER_ID, action: "block", reason: "x".repeat(500) }).reason.length, 200)
    assert.equal(parseStatusChange({ userId: USER_ID, action: "block" }).reason, null)
  })

  it("lehnt ungültige Benutzer und Aktionen ab", () => {
    ;[
      { userId: "kein-uuid", action: "approve" },
      { userId: USER_ID, action: "delete" },
      { userId: USER_ID, action: "toString" },
      { userId: USER_ID },
      null,
    ].forEach((body) => assert.throws(() => parseStatusChange(body), AdminInputError))
  })

  it("erlaubt nur sinnvolle Statuswechsel", () => {
    assert.deepEqual(STATUS_CHANGES.approve.from, ["pending"])
    assert.deepEqual(STATUS_CHANGES.reactivate.from, ["blocked"])
    assert.ok(!STATUS_CHANGES.block.from.includes("blocked"))
    assert.equal(STATUS_CHANGES.approve.to, "active")
    assert.equal(STATUS_CHANGES.block.to, "blocked")
  })
})

describe("Benutzerverwaltung: Zugriff (ohne Datenbank)", () => {
  it("verlangt eine Anmeldung", async () => {
    assert.equal((await call("admin-users")).statusCode, 401)
    assert.equal((await call("admin-user-status", { body: { userId: USER_ID, action: "approve" } })).statusCode, 401)
  })

  it("nutzt die richtigen Methoden", () => {
    assert.equal(adminActions["admin-users"].method, "GET")
    assert.equal(adminActions["admin-user-status"].method, "POST")
  })
})
