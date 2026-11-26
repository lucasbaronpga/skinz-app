import { useId } from "react"
import cn from "./cn.js"
import { HOLE_SKETCH_VIEWBOX, getHoleSketch } from "./holeSketch.js"

const COLORS = {
  fairway: "rgb(var(--fw) / 0.5)",
  fairwayLine: "rgb(var(--ink) / 0.28)",
  sand: "rgb(var(--sand))",
  tee: "rgb(var(--ink) / 0.75)",
  pole: "rgb(var(--ink))",
  flag: "rgb(var(--gold))",
  greenStart: "rgb(var(--fw))",
  greenEnd: "rgb(var(--fw-deep))",
  greenRing: "rgb(255 255 255 / 0.45)",
}

/**
 * Stilisierte Loch-Skizze (Tee links, Grün rechts). Die Form hängt vom Par ab,
 * gerade Löcher werden gespiegelt, damit die Skizzen abwechslungsreicher wirken.
 * Farben stehen als Inline-Style, damit CSS-Variablen in allen Browsern greifen.
 */
export default function HoleSketch({ par, holeNumber = 1, className }) {
  const gradientId = useId()
  const sketch = getHoleSketch({ par, mirrored: holeNumber % 2 === 0 })
  const { width, height } = HOLE_SKETCH_VIEWBOX
  const { tee, green, bunkers, fairwayPath, fairwayWidth } = sketch
  const poleTop = green.y - 22

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Skizze von Loch ${holeNumber}, Par ${par}`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="40%" r="70%">
          <stop offset="0%" style={{ stopColor: COLORS.greenStart }} />
          <stop offset="100%" style={{ stopColor: COLORS.greenEnd }} />
        </radialGradient>
      </defs>
      <g transform={sketch.mirrored ? `translate(0 ${height}) scale(1 -1)` : undefined}>
        <path
          d={fairwayPath}
          fill="none"
          strokeWidth={fairwayWidth}
          strokeLinecap="round"
          style={{ stroke: COLORS.fairway }}
        />
        <path
          d={fairwayPath}
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          strokeLinecap="round"
          style={{ stroke: COLORS.fairwayLine }}
        />
        {bunkers.map((bunker) => (
          <ellipse
            key={`${bunker.cx}-${bunker.cy}`}
            cx={bunker.cx}
            cy={bunker.cy}
            rx={bunker.rx}
            ry={bunker.ry}
            transform={`rotate(${bunker.rotate} ${bunker.cx} ${bunker.cy})`}
            style={{ fill: COLORS.sand }}
          />
        ))}
        <circle cx={green.x} cy={green.y} r={green.r} fill={`url(#${gradientId})`} />
        <circle
          cx={green.x}
          cy={green.y}
          r={green.r}
          fill="none"
          strokeWidth="1.5"
          style={{ stroke: COLORS.greenRing }}
        />
        <rect
          x={tee.x - 9}
          y={tee.y - 5}
          width="18"
          height="10"
          rx="3"
          style={{ fill: COLORS.tee }}
        />
        <line
          x1={green.x}
          y1={green.y}
          x2={green.x}
          y2={poleTop}
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ stroke: COLORS.pole }}
        />
        <path
          d={`M ${green.x} ${poleTop} L ${green.x + 13} ${poleTop + 5} L ${green.x} ${poleTop + 10} Z`}
          style={{ fill: COLORS.flag }}
        />
      </g>
    </svg>
  )
}
