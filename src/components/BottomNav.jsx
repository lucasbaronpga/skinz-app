import { motion } from "framer-motion"
import { ClipboardList, Home, Plus, Trophy, User } from "lucide-react"
import { NavLink } from "react-router-dom"
import cn from "../ui/cn.js"

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/matches", label: "Runden", icon: ClipboardList },
  { to: "/round", label: "Neue Runde", icon: Plus, primary: true },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profil", icon: User },
]

const SPRING = { type: "spring", stiffness: 420, damping: 34 }

/**
 * Schwebende Glas-Leiste im Stil der PGA-Tour-App: Outline-Icons, kleine
 * Beschriftung, der aktive Tab liegt auf einer grauen Pille. Die Mitte ist
 * der Einstieg in eine neue Runde.
 */
export default function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="nav-glass pointer-events-auto grid w-full max-w-[26rem] grid-cols-5 items-stretch rounded-full p-1.5"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="relative flex min-w-0 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            {({ isActive }) => (
              <motion.span
                whileTap={{ scale: 0.94 }}
                className="relative flex w-full flex-col items-center justify-center gap-1 px-0.5 py-2"
              >
                {isActive && (
                  <motion.span
                    layoutId="bottomNavActivePill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full bg-fill"
                  />
                )}
                {primary ? (
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-ink text-page">
                    <Icon size={16} strokeWidth={2.6} aria-hidden="true" />
                  </span>
                ) : (
                  <Icon
                    size={24}
                    strokeWidth={1.7}
                    aria-hidden="true"
                    className={cn("relative", isActive ? "text-ink" : "text-ink-soft")}
                  />
                )}
                <span
                  className={cn(
                    "relative max-w-full truncate text-[11px] font-semibold leading-none tracking-[-0.01em]",
                    isActive ? "text-ink" : "text-ink-soft"
                  )}
                >
                  {label}
                </span>
              </motion.span>
            )}
          </NavLink>
        ))}
      </motion.div>
    </nav>
  )
}
