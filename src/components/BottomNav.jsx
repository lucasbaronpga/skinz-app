import { motion } from "framer-motion"

import {
  ClipboardList,
  Home,
  Plus,
  Trophy,
  User,
} from "lucide-react"

import { NavLink } from "react-router-dom"

const navItems = [
  {
    to: "/",
    label: "Home",
    icon: Home,
    end: true,
  },
  {
    to: "/matches",
    label: "Verlauf",
    icon: ClipboardList,
  },
  {
    to: "/round",
    label: "Neue Runde",
    icon: Plus,
    primary: true,
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
  {
    to: "/profile",
    label: "Profil",
    icon: User,
  },
]

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function getItemClasses({ isActive, isPrimary }) {
  if (isPrimary) {
    return cn(
      "h-14 w-14 rounded-full text-white",
      "shadow-[0_14px_34px_rgba(16,185,129,0.42)]",
      isActive ? "bg-emerald-600" : "bg-emerald-500"
    )
  }

  return cn(
    "h-10 w-10 rounded-full",
    isActive
      ? "bg-slate-950 text-white shadow-sm"
      : "text-slate-500 hover:bg-white/35 hover:text-slate-800"
  )
}

export default function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-6 pb-[calc(1.35rem+env(safe-area-inset-bottom))]"
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 36,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.35,
          ease: "easeOut",
        }}
        className="pointer-events-auto grid w-full max-w-[22.25rem] grid-cols-5 items-center rounded-full border border-white/35 bg-white/[0.28] px-3 py-3 shadow-[0_18px_54px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isPrimary = Boolean(item.primary)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              title={item.label}
              className="flex min-h-14 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
            >
              {({ isActive }) => (
                <motion.div
                  whileTap={{
                    scale: 0.9,
                  }}
                  animate={{
                    y: isActive ? -2 : 0,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "relative flex items-center justify-center",
                    "transition-all duration-300 will-change-transform",
                    getItemClasses({
                      isActive,
                      isPrimary,
                    })
                  )}
                >
                  {isActive && isPrimary && (
                    <motion.div
                      layoutId="primaryActiveGlow"
                      className="absolute inset-0 -z-10 rounded-full bg-emerald-400/45 blur-xl"
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                      }}
                    />
                  )}

                  {isActive && !isPrimary && (
                    <motion.div
                      layoutId="bottomNavActiveDot"
                      className="absolute -bottom-2.5 h-1.5 w-1.5 rounded-full bg-slate-950"
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                      }}
                    />
                  )}

                  <Icon
                    size={isPrimary ? 29 : 21}
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />

                  <span className="sr-only">{item.label}</span>
                </motion.div>
              )}
            </NavLink>
          )
        })}
      </motion.div>
    </nav>
  )
}