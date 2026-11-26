import assert from "node:assert/strict"
import { describe, it } from "node:test"
import handler from "../../api/flights/[action].js"

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

async function call(action, method, { body = {}, query = {} } = {}) {
  const response = createResponse()

  await handler({ method, query: { action, ...query }, headers: {}, body }, response)

  return response
}

// Diese Fälle werden vor jedem Datenbankzugriff beantwortet.
describe("Flight-Endpunkt (ohne Datenbank)", () => {
  it("setzt No-Store-Header", async () => {
    const response = await call("list", "GET")

    assert.match(response.headers["Cache-Control"], /no-store/)
  })

  it("antwortet bei unbekannten Aktionen mit 404", async () => {
    assert.equal((await call("unbekannt", "GET")).statusCode, 404)
    assert.equal((await call("toString", "GET")).statusCode, 404)
    assert.equal((await call(undefined, "GET")).statusCode, 404)
  })

  it("antwortet bei falscher Methode mit 405 und Allow-Header", async () => {
    const create = await call("create", "GET")
    const list = await call("list", "POST")

    assert.equal(create.statusCode, 405)
    assert.equal(create.headers.Allow, "POST")
    assert.equal(list.statusCode, 405)
    assert.equal(list.headers.Allow, "GET")
  })

  it("verlangt eine Anmeldung", async () => {
    for (const [action, method] of [
      ["list", "GET"],
      ["get", "GET"],
      ["preview", "GET"],
      ["create", "POST"],
      ["join", "POST"],
      ["start", "POST"],
    ]) {
      const response = await call(action, method)

      assert.equal(response.statusCode, 401, action)
    }
  })
})
