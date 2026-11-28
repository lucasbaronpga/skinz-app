import cn from "../ui/cn.js"

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-2xl",
}

/** Kürzel im farbigen Kreis. Ohne eigene Farbe neutral grau. */
export default function Avatar({ shortName, name, color, size = "md", className }) {
  const label = shortName || String(name || "?").trim().charAt(0).toUpperCase()

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.02em]",
        color ? "text-white" : "bg-fill text-ink",
        SIZES[size] ?? SIZES.md,
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {label}
    </span>
  )
}
