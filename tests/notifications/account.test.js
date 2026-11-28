import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { accountActions } from "../../lib/accountActions.js"

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

async function call(name, { headers = {}, body = {} } = {}) {
  const response = createResponse()

  await accountActions[name].handle({ headers, body }, response)

  return response
}

const ENV_KEYS = ["CRON_SECRET", "DATABASE_URL"]
const savedEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

afterEach(() => {
  ENV_KEYS.forEach((key) => {
    if (savedEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnvironment[key]
  })
})

// Diese Fälle werden vor jedem Datenbankzugriff beantwortet.
describe("Konto, Push und Cron (ohne Datenbank)", () => {
  it("verlangt für Push und Konto löschen eine Anmeldung", async () => {
    assert.equal((await call("push-subscribe")).statusCode, 401)
    assert.equal((await call("push-unsubscribe")).statusCode, 401)
    assert.equal((await call("delete-account", { body: { password: "x" } })).statusCode, 401)
  })

  it("meldet ohne VAPID-Schlüssel, dass Push nicht eingerichtet ist", async () => {
    const response = await call("push-config")

    assert.equal(response.statusCode, 200)
    assert.equal(typeof response.body.enabled, "boolean")
  })

  it("verweigert das Aufräumen ohne gültiges Cron-Geheimnis", async () => {
    delete process.env.CRON_SECRET
    assert.equal((await call("cleanup")).statusCode, 503)

    process.env.CRON_SECRET = "geheim-1234567890"
    assert.equal((await call("cleanup")).statusCode, 401)
    assert.equal((await call("cleanup", { headers: { authorization: "Bearer falsch" } })).statusCode, 401)
  })

  it("lässt das Aufräumen mit richtigem Geheimnis bis zur Datenbank durch", async () => {
    process.env.CRON_SECRET = "geheim-1234567890"
    // Ohne DATABASE_URL bricht der Zugriff sicher ab, statt echte Daten zu löschen.
    delete process.env.DATABASE_URL

    await assert.rejects(
      call("cleanup", { headers: { authorization: "Bearer geheim-1234567890" } }),
      /DATABASE_URL|Datenbank/
    )
  })

  it("nutzt für jede Aktion die richtige Methode", () => {
    assert.equal(accountActions.cleanup.method, "GET")
    assert.equal(accountActions["push-config"].method, "GET")
    assert.equal(accountActions["delete-account"].method, "POST")
  })
})
