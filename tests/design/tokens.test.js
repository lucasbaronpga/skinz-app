import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import tailwindConfig from "../../tailwind.config.js"

const css = readFileSync(new URL("../../src/index.css", import.meta.url), "utf8")

// Tailwind-v3-Standardfarben, die im Hellmodus unverändert bleiben müssen.
const TAILWIND_DEFAULTS = {
  white: { DEFAULT: [255, 255, 255] },
  slate: {
    50: [248, 250, 252], 100: [241, 245, 249], 200: [226, 232, 240], 300: [203, 213, 225],
    400: [148, 163, 184], 500: [100, 116, 139], 600: [71, 85, 105], 700: [51, 65, 85],
    800: [30, 41, 59], 900: [15, 23, 42], 950: [2, 6, 23],
  },
  emerald: {
    50: [236, 253, 245], 100: [209, 250, 229], 200: [167, 243, 208], 300: [110, 231, 183],
    600: [5, 150, 105], 700: [4, 120, 87], 800: [6, 95, 70], 900: [6, 78, 59], 950: [2, 44, 34],
  },
  red: { 50: [254, 242, 242], 100: [254, 226, 226], 200: [254, 202, 202], 600: [220, 38, 38], 700: [185, 28, 28] },
  amber: { 50: [255, 251, 235], 100: [254, 243, 199], 200: [253, 230, 138], 600: [217, 119, 6], 700: [180, 83, 9] },
  orange: { 50: [255, 247, 237], 100: [255, 237, 213], 200: [254, 215, 170], 300: [253, 186, 116], 600: [234, 88, 12] },
}

function extractBlock(selectorStart) {
  const start = css.indexOf(selectorStart)

  assert.ok(start >= 0, `Block nicht gefunden: ${selectorStart}`)

  const end = css.indexOf("}", start)

  return css.slice(start, end)
}

function parseTokens(block) {
  return new Map(
    [...block.matchAll(/--([a-z0-9-]+):\s*(\d+) (\d+) (\d+);/g)].map((match) => [
      match[1],
      [Number(match[2]), Number(match[3]), Number(match[4])],
    ])
  )
}

function collectUsages(extend) {
  const usages = []
  const properties = ["textColor", "backgroundColor", "borderColor", "ringColor"]

  properties.forEach((property) => {
    Object.entries(extend[property]).forEach(([palette, value]) => {
      const entries = typeof value === "string" ? [[null, value]] : Object.entries(value)

      entries.forEach(([shade, channel]) => {
        const name = /var\(--([a-z0-9-]+)\)/.exec(channel)?.[1]

        assert.ok(name, `Ungültige Farbe in ${property}.${palette}: ${channel}`)
        usages.push({ property, palette, shade, name })
      })
    })
  })

  return usages
}

describe("Design-Tokens", () => {
  const lightTokens = parseTokens(extractBlock(':root,\n[class*="bg-[#071819]"] {'))
  const darkTokens = parseTokens(extractBlock(':root[data-theme="dark"] {'))
  const usages = collectUsages(tailwindConfig.theme.extend)

  it("definiert jede in tailwind.config.js genutzte Variable für Hell und Dunkel", () => {
    assert.ok(usages.length > 40)

    usages.forEach(({ name }) => {
      assert.ok(lightTokens.has(name), `Hell fehlt: --${name}`)
      assert.ok(darkTokens.has(name), `Dunkel fehlt: --${name}`)
    })
  })

  it("lässt den Hellmodus exakt bei den Tailwind-Standardfarben", () => {
    usages.forEach(({ palette, shade, name }) => {
      const expected = TAILWIND_DEFAULTS[palette]?.[shade ?? "DEFAULT"]

      assert.deepEqual(lightTokens.get(name), expected, `--${name} weicht vom Standard ab`)
    })
  })

  it("verwendet für Dunkel gültige RGB-Werte", () => {
    ;[...darkTokens.values()].forEach((rgb) =>
      rgb.forEach((channel) => assert.ok(channel >= 0 && channel <= 255))
    )
  })

  it("macht Text im Dunkelmodus heller und Flächen dunkler als im Hellmodus", () => {
    const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

    assert.ok(luminance(darkTokens.get("tx-slate-950")) > luminance(lightTokens.get("tx-slate-950")))
    assert.ok(luminance(darkTokens.get("tx-slate-500")) > luminance(lightTokens.get("tx-slate-500")))
    assert.ok(luminance(darkTokens.get("bg-white")) < luminance(lightTokens.get("bg-white")))
    assert.ok(luminance(darkTokens.get("bg-emerald-100")) < luminance(lightTokens.get("bg-emerald-100")))
  })

  it("setzt dunkle Flächen auf die Hell-Tokens zurück", () => {
    assert.ok(css.includes('[class*="bg-[#071819]"]'))
    assert.match(css, /\[class\*="bg-\[#071819\]"\] \{\s*--page:/)
  })

  it("nutzt für Dunkel nur ein Dunkel-Attribut, kein doppeltes Token-Set", () => {
    assert.equal(css.match(/:root\[data-theme="dark"\] \{/g).length, 2)
    assert.ok(!css.includes("prefers-color-scheme"))
  })
})
