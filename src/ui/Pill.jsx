import cn from "./cn.js"

const TONES = {
  neutral: "bg-fill text-ink-soft",
  positive: "bg-emerald-100 text-emerald-800",
  negative: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  dark: "bg-ink text-page",
}

/** Kleine Statusmarke, z. B. "Live" oder "Pausiert". */
export default function Pill({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-center text-[11px] font-bold uppercase leading-none tracking-[0.06em]",
        TONES[tone] ?? TONES.neutral,
        className
      )}
    >
      {children}
    </span>
  )
}
