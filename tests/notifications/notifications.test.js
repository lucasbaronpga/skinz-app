import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  SubscriptionError,
  buildCompletionNotifications,
  buildInviteNotification,
  buildStartNotification,
  formatEuro,
  getCourseName,
  normalizeSubscription,
} from "../../lib/notifications.js"
import { urlBase64ToUint8Array } from "../../src/utils/push.js"

const SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
}

describe("Push-Inhalte", () => {
  it("formatiert Beträge deutsch", () => {
    assert.equal(formatEuro(1200), "12 €")
    assert.equal(formatEuro(250), "2,50 €")
    assert.equal(formatEuro(-200), "2 €")
  })

  it("nutzt den Clubnamen als Platznamen", () => {
    assert.equal(getCourseName({ clubName: "Golfpark Weiherhof", name: "A-Kurs" }), "Golfpark Weiherhof")
    assert.equal(getCourseName({ name: "A-Kurs" }), "A-Kurs")
    assert.equal(getCourseName(null), "Golfplatz")
  })

  it("baut Einladung und Matchstart mit Link", () => {
    const invite = buildInviteNotification({ flightId: "f1", scorerName: "Lucas Baron", courseName: "Weiherhof", gameMode: "wolffn" })
    const start = buildStartNotification({ matchId: "m1", matchCode: "SKZ-0017", scorerName: "Lucas Baron", courseName: "Weiherhof" })

    assert.equal(invite.body, "Lucas Baron lädt dich ein: Weiherhof · Wolffn")
    assert.equal(invite.url, "/flights/f1")
    assert.equal(start.url, "/live/m1")
    assert.match(start.body, /SKZ-0017 · Weiherhof/)
  })

  it("schreibt jedem Spieler sein eigenes Ergebnis", () => {
    const notifications = buildCompletionNotifications({
      matchId: "m1",
      matchCode: "SKZ-0016",
      courseName: "Weiherhof",
      players: [
        { userId: "a", name: "Lucas" },
        { userId: "b", name: "Max" },
        { userId: "c", name: "Tom" },
      ],
      payments: [{ fromPlayerId: "b", toPlayerId: "a", amountCents: 200 }],
    })
    const bodies = Object.fromEntries(notifications.map((entry) => [entry.userId, entry.payload.body]))

    assert.equal(bodies.a, "SKZ-0016 · Weiherhof. Du bekommst 2 € von Max.")
    assert.equal(bodies.b, "SKZ-0016 · Weiherhof. Du zahlst 2 € an Lucas.")
    assert.equal(bodies.c, "SKZ-0016 · Weiherhof. Alles ausgeglichen.")
    assert.equal(notifications[0].payload.url, "/matches/m1")
  })
})

describe("Push-Abonnement", () => {
  it("übernimmt gültige Abonnements", () => {
    assert.deepEqual(normalizeSubscription(SUBSCRIPTION), {
      endpoint: SUBSCRIPTION.endpoint,
      p256dh: SUBSCRIPTION.keys.p256dh,
      auth: SUBSCRIPTION.keys.auth,
    })
  })

  it("lehnt unsichere oder kaputte Abonnements ab", () => {
    const cases = [
      { ...SUBSCRIPTION, endpoint: "http://fcm.googleapis.com/x" },
      { ...SUBSCRIPTION, endpoint: "kein link" },
      { ...SUBSCRIPTION, endpoint: `https://x.de/${"a".repeat(1000)}` },
      { ...SUBSCRIPTION, keys: { p256dh: "<script>", auth: "x" } },
      { ...SUBSCRIPTION, keys: {} },
      null,
    ]

    cases.forEach((body) => assert.throws(() => normalizeSubscription(body), SubscriptionError))
  })

  it("wandelt den VAPID-Schlüssel für den Browser um", () => {
    const bytes = urlBase64ToUint8Array("AQID_-8")

    assert.deepEqual([...bytes], [1, 2, 3, 255, 239])
  })
})
