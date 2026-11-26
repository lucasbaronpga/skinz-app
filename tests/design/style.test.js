import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { describe, it } from "node:test"
import tailwindConfig from "../../tailwind.config.js"

const SOURCE_FILES = [
  ...readdirSync(new URL("../../src/ui/", import.meta.url))
    .filter((name) => name.endsWith(".jsx"))
    .map((name) => `src/ui/${name}`),
  "src/components/BottomNav.jsx",
  "src/pages/DesignGallery.jsx",
]

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")
}

// Leitplanken für den ruhigen PGA-Stil: neue Bausteine dürfen nicht in den
// verspielten Look zurückfallen.
describe("Stil-Leitplanken", () => {
  it("nutzt in neuen Bausteinen kein font-black", () => {
    SOURCE_FILES.filter((file) => !file.endsWith("TopBar.jsx")).forEach((file) => {
      assert.ok(!read(file).includes("font-black"), `${file} nutzt font-black`)
    })
  })

  it("nutzt in neuen Bausteinen keine übergroßen Radien", () => {
    SOURCE_FILES.forEach((file) => {
      assert.doesNotMatch(read(file), /rounded-\[(2[6-9]|[3-9]\d)px\]/, `${file} hat zu große Radien`)
    })
  })

  it("zeigt Labels nicht mit weitem Buchstabenabstand", () => {
    SOURCE_FILES.forEach((file) => {
      assert.doesNotMatch(read(file), /tracking-\[0\.(1[2-9]|[2-9]\d*)em\]/, `${file} hat weite Label-Abstände`)
    })
  })

  it("setzt font-black in Bestandsscreens auf 800", () => {
    assert.equal(tailwindConfig.theme.extend.fontWeight.black, "800")
  })

  it("exportiert alle Bausteine und kein GlassCard mehr", () => {
    const index = read("src/ui/index.js")

    ;["Button", "Card", "Chip", "Tabs", "TopBar", "ListRow", "ScoreTile", "LeaderboardRow"].forEach((name) =>
      assert.match(index, new RegExp(`as ${name} `), `${name} fehlt`)
    )
    assert.ok(!index.includes("GlassCard"))
  })

  it("importiert in jeder Datei nur vorhandene Bausteine", () => {
    const available = new Set(
      readdirSync(new URL("../../src/ui/", import.meta.url)).map((name) => name.replace(/\.(jsx|js)$/, ""))
    )

    SOURCE_FILES.forEach((file) => {
      for (const match of read(file).matchAll(/from "\.\/([A-Za-z]+)\.(?:jsx|js)"/g)) {
        assert.ok(available.has(match[1]), `${file} importiert ./${match[1]}`)
      }
    })
  })
})
