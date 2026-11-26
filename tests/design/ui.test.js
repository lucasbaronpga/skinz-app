import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { RESULT_LABELS } from "../../lib/engine/constants.js"
import { formatCents, formatSkinz, formatToPar } from "../../src/utils/format.js"
import cn from "../../src/ui/cn.js"
import { getMoneyTextClass, getScoreTone, getToParTextClass } from "../../src/ui/scoreStyles.js"

describe("Formatierung", () => {
  it("zeigt To-Par im Golf-Stil", () => {
    assert.equal(formatToPar(0), "E")
    assert.equal(formatToPar(3), "+3")
    assert.equal(formatToPar(-2), "\u22122")
    assert.equal(formatToPar(undefined), "E")
  })

  it("formatiert Cent-Beträge deutsch", () => {
    assert.equal(formatCents(3600), "36\u00A0€")
    assert.equal(formatCents(1250), "12,50\u00A0€")
    assert.equal(formatCents(5), "0,05\u00A0€")
    assert.equal(formatCents(-1200), "\u221212\u00A0€")
    assert.equal(formatCents(1200, { signed: true }), "+12\u00A0€")
    assert.equal(formatCents(0, { signed: true }), "0\u00A0€")
    assert.equal(formatCents(null), "0\u00A0€")
  })

  it("schreibt Skin und Skinz korrekt", () => {
    assert.equal(formatSkinz(1), "1 Skin")
    assert.equal(formatSkinz(0), "0 Skinz")
    assert.equal(formatSkinz(12), "12 Skinz")
    assert.equal(formatSkinz(-3), "0 Skinz")
  })
})

describe("Ergebnis-Farben", () => {
  it("kennt jedes Ergebnis-Label der Spiel-Engine", () => {
    Object.values(RESULT_LABELS).forEach((label) => {
      const tone = getScoreTone(label)

      assert.ok(tone.tile.length > 0, label)
      assert.ok(tone.badge.length > 0, label)
    })
  })

  it("gibt für unbekannte Labels die Par-Darstellung zurück", () => {
    assert.equal(getScoreTone("Unbekannt"), getScoreTone("Par"))
  })

  it("färbt Birdie rot und Bogey blau", () => {
    assert.match(getScoreTone("Birdie").badge, /red/)
    assert.match(getScoreTone("Bogey").badge, /blue/)
    assert.match(getScoreTone("Albatross").badge, /amber/)
  })

  it("färbt To-Par und Geld nachvollziehbar", () => {
    assert.match(getToParTextClass(-2), /red/)
    assert.match(getToParTextClass(2), /slate-500/)
    assert.match(getToParTextClass(0), /slate-950/)
    assert.match(getMoneyTextClass(100), /amber/)
    assert.match(getMoneyTextClass(-100), /red/)
    assert.match(getMoneyTextClass(0), /slate-950/)
  })
})

describe("Scorekarten-Notation", () => {
  it("zeichnet Birdie und Eagle als Kreis, Bogey und Double Bogey als Quadrat", () => {
    assert.match(getScoreTone("Birdie").tile, /rounded-full/)
    assert.match(getScoreTone("Eagle").tile, /rounded-full/)
    assert.match(getScoreTone("Bogey").tile, /rounded-\[28%\]/)
    assert.match(getScoreTone("Double Bogey").tile, /rounded-\[28%\]/)
  })

  it("markiert Eagle und Double Bogey mit doppeltem Rahmen", () => {
    assert.match(getScoreTone("Eagle").tile, /outline-2/)
    assert.match(getScoreTone("Double Bogey").tile, /outline-2/)
    assert.doesNotMatch(getScoreTone("Birdie").tile, /outline-2/)
    assert.doesNotMatch(getScoreTone("Bogey").tile, /outline-2/)
  })

  it("lässt Par ohne Rahmen und füllt Albatross und Triple+", () => {
    assert.match(getScoreTone("Par").tile, /border-transparent/)
    assert.match(getScoreTone("Albatross").tile, /bg-amber/)
    assert.match(getScoreTone("Triple+").tile, /bg-blue/)
  })
})

describe("cn", () => {
  it("ignoriert leere Werte", () => {
    assert.equal(cn("a", false, null, undefined, "", "b"), "a b")
  })
})
