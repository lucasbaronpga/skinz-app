import cn from "./cn.js"

/** Kopfbereich eines Screens: kleine Kategorie, große Überschrift, optionale Aktion. */
export default function ScreenHeader({ eyebrow, title, subtitle, action, className }) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 break-words text-[clamp(2.6rem,13vw,3.6rem)] font-black leading-[0.95] tracking-[-0.06em] text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-sm text-sm font-bold leading-relaxed text-ink-mute">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  )
}
