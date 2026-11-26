import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isValidEmail,
  isValidShortName,
  normalizeDisplayName,
  normalizeEmail,
  normalizeHandicapIndex,
  normalizeShortName,
  validatePassword,
  validateRegistration,
} from "../../lib/validation.js"
import { suggestShortName } from "../../src/utils/shortName.js"

function validRegistration(overrides = {}) {
  return {
    email: "lucas@beispiel.de",
    password: "ein-sicheres-passwort",
    displayName: "Lucas Baron",
    shortName: "LB",
    handicapIndex: 12.4,
    ...overrides,
  }
}

describe("Normalisierung", () => {
  it("normalisiert E-Mail, Name und Kürzel", () => {
    assert.equal(normalizeEmail("  Lucas@Beispiel.DE "), "lucas@beispiel.de")
    assert.equal(normalizeDisplayName("  Lucas    Baron "), "Lucas Baron")
    assert.equal(normalizeShortName(" lb "), "LB")
    assert.equal(normalizeEmail(undefined), "")
  })

  it("rundet das Handicap auf eine Nachkommastelle und erkennt Ungültiges", () => {
    assert.equal(normalizeHandicapIndex(""), null)
    assert.equal(normalizeHandicapIndex(null), null)
    assert.equal(normalizeHandicapIndex("12.44"), 12.4)
    assert.ok(Number.isNaN(normalizeHandicapIndex("abc")))
  })
})

describe("Prüfungen", () => {
  it("prüft E-Mail-Adressen", () => {
    assert.equal(isValidEmail("name@beispiel.de"), true)
    assert.equal(isValidEmail("name@beispiel"), false)
    assert.equal(isValidEmail("name beispiel.de"), false)
    assert.equal(isValidEmail(`${"a".repeat(250)}@b.de`), false)
  })

  it("akzeptiert nur Kürzel aus 2 bis 4 Großbuchstaben oder Ziffern", () => {
    ;["LB", "L1", "LB2", "ABCD", "12"].forEach((value) =>
      assert.equal(isValidShortName(value), true, value)
    )
    ;["", "L", "ABCDE", "lb", "L-B", "LÄ", "L B"].forEach((value) =>
      assert.equal(isValidShortName(value), false, value)
    )
  })

  it("verlangt mindestens 12 Zeichen und höchstens 72 Bytes im Passwort", () => {
    assert.ok(validatePassword("kurz"))
    assert.ok(validatePassword("12345678901"))
    assert.equal(validatePassword("123456789012"), null)
    assert.equal(validatePassword("a".repeat(72)), null)
    assert.ok(validatePassword("a".repeat(73)))
    assert.ok(validatePassword("ä".repeat(40)), "40 Umlaute sind 80 Bytes")
    assert.equal(validatePassword("ä".repeat(36)), null)
  })

  it("akzeptiert eine gültige Registrierung", () => {
    assert.equal(validateRegistration(validRegistration()), null)
    assert.equal(validateRegistration(validRegistration({ handicapIndex: null })), null)
  })

  it("lehnt ungültige Registrierungen mit passender Meldung ab", () => {
    const cases = [
      [{ email: "kaputt" }, "E-Mail"],
      [{ displayName: "L" }, "Name"],
      [{ displayName: "L".repeat(81) }, "Name"],
      [{ shortName: "L" }, "Kürzel"],
      [{ shortName: "lb" }, "Kürzel"],
      [{ password: "zu-kurz" }, "Passwort"],
      [{ handicapIndex: 60 }, "Handicap"],
      [{ handicapIndex: -11 }, "Handicap"],
      [{ handicapIndex: Number.NaN }, "Handicap"],
    ]

    cases.forEach(([overrides, expected]) => {
      const message = validateRegistration(validRegistration(overrides))

      assert.ok(message?.includes(expected), `${JSON.stringify(overrides)} → ${message}`)
    })
  })
})

describe("Kürzel-Vorschlag im Frontend", () => {
  it("bildet Kürzel aus den Initialen", () => {
    assert.equal(suggestShortName("Lucas Baron"), "LB")
    assert.equal(suggestShortName("  daniel   keller "), "DK")
    assert.equal(suggestShortName("Hans Peter Müller"), "HM")
    assert.equal(suggestShortName("Lucas"), "LU")
    assert.equal(suggestShortName("Jörg Müller"), "JM")
    assert.equal(suggestShortName(""), "")
    assert.equal(suggestShortName("123"), "")
  })
})
