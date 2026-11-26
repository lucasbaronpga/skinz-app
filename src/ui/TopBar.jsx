import cn from "./cn.js"

/** Kopfzeile mit Logo links und freiem Platz rechts, z. B. für das Profil. */
export default function TopBar({ right, className }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-xl font-black leading-none tracking-[-0.06em] text-ink shadow-[var(--shadow-chip)]"
        aria-label="Skinz"
      >
        S
      </div>
      {right}
    </div>
  )
}
