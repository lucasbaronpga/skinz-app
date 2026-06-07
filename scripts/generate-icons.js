import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const __filename =
  fileURLToPath(import.meta.url)

const __dirname =
  path.dirname(__filename)

const rootDir =
  path.resolve(__dirname, "..")

const publicDir =
  path.join(rootDir, "public")

const sourceSvg =
  path.join(publicDir, "favicon.svg")

const ICONS = [
  {
    size: 192,
    outputName: "icon-192.png",
  },
  {
    size: 512,
    outputName: "icon-512.png",
  },
  {
    size: 180,
    outputName: "apple-touch-icon.png",
  },
]

async function ensureSourceIconExists() {
  try {
    await fs.access(sourceSvg)
  } catch {
    throw new Error(
      `Source icon not found: ${sourceSvg}`
    )
  }
}

async function ensurePublicDirectoryExists() {
  await fs.mkdir(publicDir, {
    recursive: true,
  })
}

async function createIcon(size, outputName) {
  await sharp(sourceSvg)
    .resize(size, size, {
      fit: "contain",
    })
    .png()
    .toFile(path.join(publicDir, outputName))
}

async function createMaskableIcon() {
  const size = 512
  const innerSize = 392

  const svgBuffer =
    await sharp(sourceSvg)
      .resize(innerSize, innerSize, {
        fit: "contain",
      })
      .png()
      .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#071819",
    },
  })
    .composite([
      {
        input: svgBuffer,
        left: Math.round((size - innerSize) / 2),
        top: Math.round((size - innerSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(publicDir, "icon-maskable-512.png"))
}

async function main() {
  await ensurePublicDirectoryExists()
  await ensureSourceIconExists()

  await Promise.all(
    ICONS.map((icon) =>
      createIcon(
        icon.size,
        icon.outputName
      )
    )
  )

  await createMaskableIcon()

  console.log("Skinz app icons generated successfully.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})