import cn from "./cn.js"

/** Umschalter mit mehreren Optionen, z. B. Auto / Hell / Dunkel. */
export default function Segmented({ options, value, onChange, label, className }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-1 rounded-full bg-fill p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-full text-sm font-bold transition-colors",
              isSelected ? "bg-card text-ink shadow-[var(--shadow-chip)]" : "text-ink-mute"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
