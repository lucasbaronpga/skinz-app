import {
  NavLink,
} from "react-router-dom"

import {
  motion,
} from "framer-motion"

import {
  Home,
  ClipboardList,
  Plus,
  Trophy,
  User,
} from "lucide-react"

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

export default function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 40,
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
        className="pointer-events-auto grid w-full max-w-md grid-cols-5 items-center rounded-full border border-white/60 bg-white/85 px-4 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              title={item.label}
              className="flex justify-center outline-none"
            >
              {({ isActive }) => {
                const isPrimaryActive =
                  item.primary && isActive

                return (
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
                    className={[
                      "relative flex items-center justify-center transition-all duration-300",
                      "focus-visible:ring-4 focus-visible:ring-emerald-100",
                      item.primary
                        ? [
                            "h-16 w-16 rounded-full text-white shadow-[0_15px_35px_rgba(16,185,129,0.42)]",
                            isPrimaryActive
                              ? "bg-emerald-600"
                              : "bg-emerald-500",
                          ].join(" ")
                        : [
                            "h-11 w-11 rounded-full",
                            isActive
                              ? "bg-slate-950 text-white shadow-sm"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                          ].join(" "),
                    ].join(" ")}
                  >
                    {isPrimaryActive && (
                      <motion.div
                        layoutId="primaryActiveGlow"
                        className="absolute inset-0 -z-10 rounded-full bg-emerald-400/40 blur-xl"
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 28,
                        }}
                      />
                    )}

                    {isActive && !item.primary && (
                      <motion.div
                        layoutId="activeDot"
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 28,
                        }}
                        className="absolute -bottom-3 h-1.5 w-1.5 rounded-full bg-slate-950"
                      />
                    )}

                    <Icon
                      size={item.primary ? 31 : 23}
                      strokeWidth={2.6}
                      aria-hidden="true"
                    />

                    <span className="sr-only">
                      {item.label}
                    </span>
                  </motion.div>
                )
              }}
            </NavLink>
          )
        })}
      </motion.div>
    </nav>
  )
}