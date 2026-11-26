import { motion } from "framer-motion"
import { ClipboardList, Flag, Home, Trophy, User } from "lucide-react"
import { NavLink } from "react-router-dom"
import cn from "../ui/cn.js"

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/matches", label: "Runden", icon: ClipboardList },
  { to: "/round", label: "Neue Runde", icon: Flag, primary: true },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profil", icon: User },
]

const SPRING = { type: "spring", stiffness: 380, damping: 30 }

export default function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))]"
    >
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="nav-glass pointer-events-auto grid w-full max-w-[24rem] grid-cols-5 items-end rounded-[34px] px-2 pb-2 pt-2"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="relative flex min-w-0 flex-col items-center rounded-[22px] outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            {({ isActive }) =>
              primary ? (
                <motion.span whileTap={{ scale: 0.92 }} className="flex flex-col items-center">
                  <span className="nav-primary -mt-8 flex h-[3.9rem] w-[3.9rem] items-center justify-center rounded-full">
                    <Icon size={26} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 text-[9px] font-black uppercase leading-none tracking-[0.12em] text-ink">
                    {label}
                  </span>
                </motion.span>
              ) : (
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  className="relative flex w-full flex-col items-center gap-1 px-1 py-2"
                >
                  {isActive && (
                    <motion.span
                      layoutId="bottomNavActivePill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-[22px] bg-ink/10"
                    />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.7 : 2.2}
                    aria-hidden="true"
                    className={cn("relative", isActive ? "text-ink" : "text-ink-mute")}
                  />
                  <span
                    className={cn(
                      "relative max-w-full truncate text-[9px] font-black uppercase leading-none tracking-[0.1em]",
                      isActive ? "text-ink" : "text-ink-mute"
                    )}
                  >
                    {label}
                  </span>
                </motion.span>
              )
            }
          </NavLink>
        ))}
      </motion.div>
    </nav>
  )
}
