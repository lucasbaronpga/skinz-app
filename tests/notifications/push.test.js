import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it, mock } from "node:test"
import webpush from "web-push"
import { notifySafely, sendPushNotifications } from "../../lib/push.js"

const KEYS = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]
let saved

function fakeSql(subscriptions, log) {
  return async (strings, ...values) => {
    const text = strings.join("?")

    log.push({ text, values })

    return text.includes("SELECT") ? subscriptions : []
  }
}

function configurePushEnvironment() {
  process.env.VAPID_PUBLIC_KEY = "test-public-key"
  process.env.VAPID_PRIVATE_KEY = "test-private-key"
  process.env.VAPID_SUBJECT = "mailto:test@example.com"
}

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))
  // Kein echter Versand und keine Schlüsselprüfung im Test.
  mock.method(webpush, "setVapidDetails", () => {})
  mock.method(webpush, "sendNotification", async (subscription) => {
    if (subscription.endpoint.includes("gone")) {
      const error = new Error("gone")

      error.statusCode = 410
      throw error
    }
  })
})

afterEach(() => {
  mock.restoreAll()
  KEYS.forEach((key) => (saved[key] === undefined ? delete process.env[key] : (process.env[key] = saved[key])))
})

describe("Push-Versand", () => {
  it("tut nichts, solange Push nicht eingerichtet ist", async () => {
    KEYS.forEach((key) => delete process.env[key])

    const log = []

    assert.deepEqual(await sendPushNotifications(fakeSql([], log), [{ userId: "a", payload: {} }]), { sent: 0 })
    assert.equal(log.length, 0)
  })

  it("sendet an alle Geräte und löscht abgelaufene Abonnements", async () => {
    configurePushEnvironment()

    const log = []
    const sql = fakeSql(
      [
        { id: "s1", user_id: "a", endpoint: "https://push.example/ok", p256dh: "k", auth: "a" },
        { id: "s2", user_id: "a", endpoint: "https://push.example/gone", p256dh: "k", auth: "a" },
      ],
      log
    )
    const result = await sendPushNotifications(sql, [{ userId: "a", payload: { title: "Hi" } }])

    assert.deepEqual(result, { sent: 1 })
    assert.equal(webpush.sendNotification.mock.callCount(), 2)
    assert.ok(log.some((entry) => entry.text.includes("DELETE") && entry.values[0].includes("s2")))
  })

  it("lässt Fehler nie bis zur fachlichen Aktion durch", async () => {
    configurePushEnvironment()

    const failingSql = async () => {
      throw new Error("Datenbank weg")
    }

    mock.method(console, "error", () => {})

    await assert.doesNotReject(notifySafely(failingSql, [{ userId: "a", payload: {} }]))
  })
})
