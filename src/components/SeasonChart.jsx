import { formatCents } from "../utils/format.js"

const WIDTH = 320
const HEIGHT = 120
const PADDING = 8

/** Kumulierter Gewinn über die Saison als Linie mit Nulllinie. */
export default function SeasonChart({ series }) {
  if (!Array.isArray(series) || series.length === 0) {
    return <p className="py-6 text-center text-sm font-medium text-ink-mute">Noch keine Runden in dieser Saison.</p>
  }

  const values = [0, ...series.map((point) => point.totalCents)]
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = maximum - minimum || 1
  const stepX = (WIDTH - PADDING * 2) / Math.max(values.length - 1, 1)
  const toY = (value) => PADDING + (HEIGHT - PADDING * 2) * (1 - (value - minimum) / range)
  const points = values.map((value, index) => `${PADDING + index * stepX},${toY(value)}`).join(" ")
  const last = values[values.length - 1]

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-32 w-full" role="img" aria-label={`Saisonverlauf, aktuell ${formatCents(last, { signed: true })}`}>
        <line
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={toY(0)}
          y2={toY(0)}
          strokeDasharray="4 4"
          strokeWidth="1"
          style={{ stroke: "rgb(var(--line) / 0.25)" }}
        />
        <polyline
          points={points}
          fill="none"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ stroke: last < 0 ? "rgb(220 38 38)" : "rgb(var(--fw))" }}
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs font-medium text-ink-mute">
        <span>Saisonstart</span>
        <span>{series.length} {series.length === 1 ? "Runde" : "Runden"}</span>
      </div>
    </div>
  )
}
