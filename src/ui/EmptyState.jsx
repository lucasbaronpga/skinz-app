import cn from "./cn.js"

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("surface rounded-[18px] px-6 py-10 text-center", className)}>
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fill text-ink">
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
        </div>
      )}
      <h2 className="mt-4 text-xl font-bold tracking-[-0.03em] text-ink">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-ink-mute">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
