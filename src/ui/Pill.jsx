import cn from "./cn.js"

const TONES = {
  neutral: "border border-white/70 bg-white/50 text-slate-600",
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  dark: "bg-slate-950 text-white ring-1 ring-white/15",
}

export default function Pill({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-center text-[10px] font-black uppercase leading-none tracking-[0.18em]",
        TONES[tone] ?? TONES.neutral,
        className
      )}
    >
      {children}
    </span>
  )
}
