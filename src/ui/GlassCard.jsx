import cn from "./cn.js"

const VARIANTS = {
  glass: "glass rounded-[32px]",
  strong: "glass-strong rounded-[32px]",
  hero: "relative overflow-hidden rounded-[34px] border border-white/20 bg-[#071819] text-white shadow-hero",
}

/**
 * Glas-Karte im Liquid-Glass-Stil. Die Variante "hero" ist die dunkle
 * Fairway-Karte (in beiden Farbmodi gleich).
 */
export default function GlassCard({
  as: Component = "div",
  variant = "glass",
  glow = true,
  className,
  children,
  ...props
}) {
  const isHero = variant === "hero"

  return (
    <Component className={cn(VARIANTS[variant] ?? VARIANTS.glass, className)} {...props}>
      {isHero && glow && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-emerald-400/30 via-emerald-500/8 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
          />
        </>
      )}
      {isHero ? <div className="relative">{children}</div> : children}
    </Component>
  )
}
