import cn from "./cn.js"
import { getScoreTone } from "./scoreStyles.js"

/** Kleine Ergebnis-Pille, z. B. "Birdie". */
export default function ScoreBadge({ label, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.06em]",
        getScoreTone(label).badge,
        className
      )}
    >
      {label}
    </span>
  )
}
