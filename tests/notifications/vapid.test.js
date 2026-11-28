import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { normalizeVapidSubject } from "../../lib/push.js"

describe("VAPID-Kontakt", () => {
  it("ergänzt mailto: bei einer bloßen E-Mail-Adresse", () => {
    assert.equal(normalizeVapidSubject("lucas@example.de"), "mailto:lucas@example.de")
    assert.equal(normalizeVapidSubject("  lucas@example.de "), "mailto:lucas@example.de")
  })

  it("lässt gültige Werte unverändert", () => {
    assert.equal(normalizeVapidSubject("mailto:lucas@example.de"), "mailto:lucas@example.de")
    assert.equal(normalizeVapidSubject("MAILTO:lucas@example.de"), "MAILTO:lucas@example.de")
    assert.equal(normalizeVapidSubject("https://skinz.example.de"), "https://skinz.example.de")
  })

  it("gibt Unbrauchbares unverändert zurück, damit web-push es meldet", () => {
    assert.equal(normalizeVapidSubject("kein kontakt"), "kein kontakt")
    assert.equal(normalizeVapidSubject(undefined), "")
  })
})
