import cn from "./cn.js"

/** Filter-Pille wie "Latest" oder "Power Rankings" in der PGA-Tour-App. */
export default function Chip({ selected = false, className, children, ...props }) {
  return (
    <button type="button" aria-pressed={selected} className={cn("chip", className)} {...props}>
      {children}
    </button>
  )
}
