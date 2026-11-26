import cn from "./cn.js"

export default function StatTile({ label, value, valueClassName, className }) {
  return (
    <div className={cn("glass rounded-[24px] p-4 text-center", className)}>
      <div
        className={cn(
          "text-[1.7rem] font-black leading-none tracking-[-0.05em] tabular-nums text-ink",
          valueClassName
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-mute">
        {label}
      </div>
    </div>
  )
}
