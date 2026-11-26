import cn from "./cn.js"

/** Kopfbereich eines Screens: kleine graue Kategorie, kräftige Überschrift, optionale Aktion. */
export default function ScreenHeader({ eyebrow, title, subtitle, action, className }) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-mute">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 break-words text-[clamp(2rem,9vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.045em] text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-sm text-[15px] font-medium leading-snug text-ink-mute">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  )
}
