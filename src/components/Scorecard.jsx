import { getResultLabel } from "../../lib/engine/index.js"
import cn from "../ui/cn.js"
import { getScoreTone } from "../ui/scoreStyles.js"

const CELL = "min-w-[2.25rem] px-0.5 py-2 text-center"

/**
 * Scorecard als Tabelle mit Scorekarten-Notation (Kreis, Quadrat).
 * rows: [{ key, label, scores: [Score je Loch oder null] }]
 * Mit onSelectHole werden die Lochnummern bis selectableUntil antippbar.
 */
export default function Scorecard({ pars, rows, activeHole = null, onSelectHole = null, selectableUntil = 0 }) {
  const holes = pars.map((_, index) => index + 1)
  const coursePar = pars.reduce((total, par) => total + par, 0)

  return (
    <div className="surface -mx-1 overflow-x-auto rounded-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <table className="w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-line/10 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-mute">
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left">Loch</th>
            {holes.map((holeNumber) => (
              <th key={holeNumber} className={CELL}>
                {onSelectHole && holeNumber <= selectableUntil ? (
                  <button
                    type="button"
                    onClick={() => onSelectHole(holeNumber)}
                    className={cn(
                      "h-7 w-7 rounded-full font-bold",
                      holeNumber === activeHole ? "bg-ink text-page" : "text-ink-soft"
                    )}
                  >
                    {holeNumber}
                  </button>
                ) : (
                  <span className={cn(holeNumber === activeHole && "font-bold text-ink")}>{holeNumber}</span>
                )}
              </th>
            ))}
            <th className="px-3 py-2 text-right">Ges.</th>
          </tr>
          <tr className="border-b border-line/10 text-xs font-medium text-ink-mute">
            <td className="sticky left-0 z-10 bg-card px-3 py-1.5">Par</td>
            {pars.map((par, index) => (
              <td key={index} className={CELL}>
                {par}
              </td>
            ))}
            <td className="px-3 py-1.5 text-right font-semibold">{coursePar}</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = row.scores.reduce((sum, score) => sum + (score || 0), 0)

            return (
              <tr key={row.key} className="border-b border-line/10 last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-bold text-ink">
                  {row.label}
                </th>
                {holes.map((holeNumber) => {
                  const score = row.scores[holeNumber - 1]

                  return (
                    <td key={holeNumber} className={cn(CELL, !score && "text-ink-mute")}>
                      {score ? (
                        <span
                          className={cn(
                            "mx-auto grid h-7 w-7 place-items-center text-sm font-bold tabular-nums",
                            getScoreTone(getResultLabel(score, pars[holeNumber - 1])).tile
                          )}
                        >
                          {score}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-right font-bold tabular-nums text-ink">{total || "–"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
