import cn from "./cn.js"

/**
 * Text-Tabs mit Unterstrich und Haarlinie, wie "News · Standings · Players".
 * Bei vielen Tabs scrollt die Leiste waagerecht.
 */
export default function Tabs({ tabs, value, onChange, label, className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "-mx-5 flex gap-7 overflow-x-auto border-b border-line/15 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {tabs.map((tab) => {
        const isSelected = tab.value === value

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative shrink-0 pb-3 pt-2 text-[1.35rem] font-bold leading-none tracking-[-0.03em] transition-colors",
              isSelected ? "text-ink" : "text-ink-mute"
            )}
          >
            {tab.label}
            {isSelected && (
              <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-ink" />
            )}
          </button>
        )
      })}
    </div>
  )
}
