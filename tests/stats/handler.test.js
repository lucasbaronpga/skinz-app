import assert from "node:assert/strict"
import { describe, it } from "node:test"
import handler from "../../api/stats/[action].js"

function createResponse() {
  return {
    statusCode: null,
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
}

async function call(action, method) {
  const response = createResponse()

  await handler({ method, query: { action }, headers: {}, body: {} }, response)

  return response
}

describe("Stats-Endpunkt (ohne Datenbank)", () => {
  it("antwortet bei unbekannten Aktionen mit 404 und setzt No-Store", async () => {
    const response = await call("valueOf", "GET")

    assert.equal(response.statusCode, 404)
    assert.match(response.headers["Cache-Control"], /no-store/)
  })

  it("antwortet bei falscher Methode mit 405", async () => {
    assert.equal((await call("profile", "GET")).statusCode, 405)
    assert.equal((await call("leaderboard", "POST")).statusCode, 405)
  })

  it("verlangt eine Anmeldung", async () => {
    for (const [action, method] of [["leaderboard", "GET"], ["me", "GET"], ["player", "GET"], ["clubs", "GET"], ["profile", "POST"]]) {
      assert.equal((await call(action, method)).statusCode, 401, action)
    }
  })
})
