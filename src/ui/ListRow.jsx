import cn from "./cn.js"

/**
 * Listeneintrag im Stil der PGA-Tour-Nachrichten: kleine graue Zeile oben,
 * fette Überschrift, optional Vorschau rechts. Einträge trennt eine Haarlinie.
 */
export default function ListRow({ eyebrow, title, meta, thumbnail, className, ...props }) {
  return (
    <article
      className={cn("flex items-start justify-between gap-4 border-b border-line/10 py-5", className)}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-ink-mute">
            {eyebrow}
          </p>
        )}
        <h3 className="mt-2 text-[1.3rem] font-bold leading-[1.15] tracking-[-0.035em] text-ink">
          {title}
        </h3>
        {meta && <p className="mt-2 text-sm font-medium text-ink-mute">{meta}</p>}
      </div>
      {thumbnail && (
        <div className="h-[5.2rem] w-[5.2rem] shrink-0 overflow-hidden rounded-xl bg-fill">
          {thumbnail}
        </div>
      )}
    </article>
  )
}
