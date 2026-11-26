import cn from "./cn.js"

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("glass rounded-[32px] p-8 text-center", className)}>
      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon size={26} aria-hidden="true" />
        </div>
      )}
      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-ink">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-sm font-bold leading-relaxed text-ink-mute">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
