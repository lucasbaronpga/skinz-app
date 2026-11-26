import cn from "./cn.js"

const VARIANTS = {
  primary: "btn-primary",
  accent: "btn-accent",
  glass: "btn-glass",
  danger: "btn-danger",
}

export default function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn("btn", VARIANTS[variant] ?? VARIANTS.primary, size === "lg" && "btn-lg", className)}
      {...props}
    >
      {children}
    </button>
  )
}
