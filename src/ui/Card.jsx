import cn from "./cn.js"

const VARIANTS = {
  flat: "surface rounded-[18px]",
  glass: "glass rounded-[22px]",
  hero: "relative overflow-hidden rounded-[22px] bg-[#071819] text-white shadow-hero",
}

/**
 * Inhaltsfläche. "flat" ist der Standard (Haarlinie, kein Glas), "glass" ist
 * für Bedienebenen wie Sheets gedacht, "hero" ist die dunkle Live-Karte.
 */
export default function Card({
  as: Component = "div",
  variant = "flat",
  className,
  children,
  ...props
}) {
  const isHero = variant === "hero"

  return (
    <Component className={cn(VARIANTS[variant] ?? VARIANTS.flat, className)} {...props}>
      {isHero && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-emerald-400/20 to-transparent"
        />
      )}
      {isHero ? <div className="relative">{children}</div> : children}
    </Component>
  )
}
