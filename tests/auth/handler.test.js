import assert from "node:assert/strict"
import { describe, it } from "node:test"
import handler from "../../api/auth/[action].js"

function createResponse() {
  const response = {
    statusCode: null,
    body: null,
    headers: {},
    headersSent: false,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      this.headersSent = true
      return this
    },
  }

  return response
}

async function call(action, method, body = {}) {
  const response = createResponse()

  await handler({ method, query: { action }, headers: {}, body }, response)

  return response
}

// Diese Fälle werden vor jedem Datenbankzugriff abgewiesen.
describe("Auth-Endpunkt (ohne Datenbank)", () => {
  it("setzt No-Store-Header", async () => {
    const response = await call("session-gibt-es-nicht", "GET")

    assert.match(response.headers["Cache-Control"], /no-store/)
  })

  it("antwortet bei unbekannten Aktionen mit 404", async () => {
    assert.equal((await call("unbekannt", "POST")).statusCode, 404)
    assert.equal((await call("constructor", "POST")).statusCode, 404)
    assert.equal((await call(undefined, "POST")).statusCode, 404)
  })

  it("antwortet bei falscher Methode mit 405 und Allow-Header", async () => {
    const login = await call("login", "GET")
    const session = await call("session", "POST")

    assert.equal(login.statusCode, 405)
    assert.equal(login.headers.Allow, "POST")
    assert.equal(session.statusCode, 405)
    assert.equal(session.headers.Allow, "GET")
  })

  it("verlangt E-Mail und Passwort beim Login", async () => {
    assert.equal((await call("login", "POST", {})).statusCode, 400)
    assert.equal((await call("login", "POST", { email: "a@b.de" })).statusCode, 400)
  })

  it("validiert die Registrierung vor allem anderen", async () => {
    const response = await call("register", "POST", {
      email: "kaputt",
      password: "ein-sicheres-passwort",
      displayName: "Lucas Baron",
      shortName: "LB",
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.body.error, /E-Mail/)

    const shortNameResponse = await call("register", "POST", {
      email: "a@b.de",
      password: "ein-sicheres-passwort",
      displayName: "Lucas Baron",
      shortName: "L",
    })

    assert.equal(shortNameResponse.statusCode, 400)
    assert.match(shortNameResponse.body.error, /Kürzel/)
  })

  it("weist fehlerhafte Tokens ab, bevor die Datenbank gefragt wird", async () => {
    assert.equal((await call("verify-email", "POST", { token: "zu-kurz" })).statusCode, 400)
    assert.equal((await call("verify-email", "POST", {})).statusCode, 400)
    assert.equal(
      (await call("reset-password", "POST", { token: "zu-kurz", password: "ein-sicheres-passwort" })).statusCode,
      400
    )
  })

  it("validiert das neue Passwort vor dem Einlösen des Tokens", async () => {
    const response = await call("reset-password", "POST", {
      token: "A".repeat(43),
      password: "kurz",
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.body.error, /Passwort/)
  })

  it("verlangt eine gültige E-Mail bei Reset und erneutem Senden", async () => {
    assert.equal((await call("forgot-password", "POST", { email: "kaputt" })).statusCode, 400)
    assert.equal((await call("resend-verification", "POST", { email: "" })).statusCode, 400)
  })
})
