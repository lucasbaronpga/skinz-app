import cn from "./cn.js"
import { getScoreTone } from "./scoreStyles.js"

/** Score in Scorekarten-Notation (Kreis, Quadrat, Doppelrahmen), eingefärbt nach Ergebnis. */
export default function ScoreTile({ score, label, size = "md", className }) {
  const isLarge = size === "lg"

  return (
    <div
      className={cn(
        "grid shrink-0 select-none place-items-center text-center",
        isLarge ? "h-24 w-24" : "h-10 w-10",
        getScoreTone(label).tile,
        className
      )}
      role="img"
      aria-label={`${score} Schläge, ${label}`}
    >
      <span
        className={cn(
          "font-bold leading-none tabular-nums tracking-[-0.03em]",
          isLarge ? "text-[3.6rem]" : "text-lg"
        )}
      >
        {score}
      </span>
    </div>
  )
}
