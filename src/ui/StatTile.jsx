import cn from "./cn.js"

export default function StatTile({ label, value, valueClassName, className }) {
  return (
    <div className={cn("surface rounded-2xl p-4", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[1.65rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-ink",
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  )
}
