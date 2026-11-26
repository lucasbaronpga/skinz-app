import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import {
  applyTheme,
  getThemePreference,
  resolveTheme,
  setThemePreference,
} from "../../src/utils/theme.js"

let store
let systemPrefersDark
let metaContent
let htmlDataset

beforeEach(() => {
  store = new Map()
  systemPrefersDark = false
  metaContent = null
  htmlDataset = {}

  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    matchMedia: () => ({ matches: systemPrefersDark }),
  }
  globalThis.document = {
    documentElement: { dataset: htmlDataset },
    head: { appendChild() {} },
    querySelector: () => ({ setAttribute: (name, value) => { if (name === "content") metaContent = value } }),
    createElement: () => ({ setAttribute() {} }),
  }
})

afterEach(() => {
  delete globalThis.window
  delete globalThis.document
})

describe("Farbmodus", () => {
  it("folgt standardmäßig der Systemeinstellung", () => {
    assert.equal(getThemePreference(), "auto")
    assert.equal(resolveTheme(), "light")

    systemPrefersDark = true

    assert.equal(resolveTheme(), "dark")
  })

  it("lässt eine gespeicherte Wahl über das System gewinnen", () => {
    systemPrefersDark = true
    setThemePreference("light")

    assert.equal(getThemePreference(), "light")
    assert.equal(htmlDataset.theme, "light")

    systemPrefersDark = false
    setThemePreference("dark")

    assert.equal(htmlDataset.theme, "dark")
  })

  it("kehrt mit auto zur Systemeinstellung zurück und löscht die Wahl", () => {
    setThemePreference("dark")
    systemPrefersDark = false
    setThemePreference("auto")

    assert.equal(store.has("skinz-theme"), false)
    assert.equal(htmlDataset.theme, "light")
  })

  it("setzt die Browser-Farbe passend zum Modus", () => {
    applyTheme("dark")
    assert.equal(metaContent, "#06100d")

    applyTheme("light")
    assert.equal(metaContent, "#e8ebe5")
  })

  it("ignoriert unbekannte gespeicherte Werte", () => {
    store.set("skinz-theme", "pink")

    assert.equal(getThemePreference(), "auto")
  })

  it("funktioniert auch ohne Zugriff auf localStorage", () => {
    globalThis.window.localStorage = {
      getItem() { throw new Error("blockiert") },
      setItem() { throw new Error("blockiert") },
      removeItem() { throw new Error("blockiert") },
    }

    assert.equal(getThemePreference(), "auto")
    assert.doesNotThrow(() => setThemePreference("dark"))
    assert.equal(htmlDataset.theme, "dark")
  })
})
