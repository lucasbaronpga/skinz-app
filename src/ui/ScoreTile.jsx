import cn from "./cn.js"
import { getScoreTone } from "./scoreStyles.js"

/** Große Score-Kachel wie in der Live-Eingabe, eingefärbt nach Ergebnis. */
export default function ScoreTile({ score, label, size = "md", className }) {
  return (
    <div
      className={cn(
        "grid shrink-0 select-none place-items-center rounded-[28px] text-center",
        size === "lg" ? "h-[6.55rem] w-[6.55rem] rounded-[32px]" : "h-16 w-16",
        getScoreTone(label).tile,
        className
      )}
      role="img"
      aria-label={`${score} Schläge, ${label}`}
    >
      <span
        className={cn(
          "font-black leading-none tabular-nums tracking-[-0.015em]",
          size === "lg" ? "text-[4.8rem]" : "text-[2.4rem]"
        )}
      >
        {score}
      </span>
    </div>
  )
}
