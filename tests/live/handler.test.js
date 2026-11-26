import assert from "node:assert/strict"
import { describe, it } from "node:test"
import handler from "../../api/live/[action].js"

function createResponse() {
  return {
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
}

async function call(action, method) {
  const response = createResponse()

  await handler({ method, query: { action }, headers: {}, body: {} }, response)

  return response
}

// Diese Fälle werden vor jedem Datenbankzugriff beantwortet.
describe("Live-Endpunkt (ohne Datenbank)", () => {
  it("setzt No-Store-Header", async () => {
    assert.match((await call("current", "GET")).headers["Cache-Control"], /no-store/)
  })

  it("antwortet bei unbekannten Aktionen mit 404", async () => {
    assert.equal((await call("unbekannt", "GET")).statusCode, 404)
    assert.equal((await call("hasOwnProperty", "GET")).statusCode, 404)
  })

  it("antwortet bei falscher Methode mit 405", async () => {
    const response = await call("score", "GET")

    assert.equal(response.statusCode, 405)
    assert.equal(response.headers.Allow, "POST")
  })

  it("verlangt eine Anmeldung", async () => {
    for (const [action, method] of [["current", "GET"], ["get", "GET"], ["score", "POST"], ["pause", "POST"], ["resume", "POST"], ["cancel", "POST"]]) {
      assert.equal((await call(action, method)).statusCode, 401, action)
    }
  })
})
