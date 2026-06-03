import sharp from "sharp"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, "..")
const publicDir = path.join(rootDir, "public")
const sourceSvg = path.join(publicDir, "favicon.svg")

async function createIcon(size, outputName) {
  await sharp(sourceSvg)
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, outputName))
}

async function createMaskableIcon() {
  const size = 512
  const innerSize = 392

  const svgBuffer = await sharp(sourceSvg)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#020617",
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
  await createIcon(192, "icon-192.png")
  await createIcon(512, "icon-512.png")
  await createIcon(180, "apple-touch-icon.png")
  await createMaskableIcon()

  console.log("Skinz app icons generated successfully.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})