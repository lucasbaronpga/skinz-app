import {
  NavLink,
} from "react-router-dom"

import {
  motion,
} from "framer-motion"

import {
  Home,
  History,
  Plus,
  User,
} from "lucide-react"

const navItems = [
  {
    to: "/",
    icon: Home,
  },

  {
    to: "/matches",
    icon: History,
  },

  {
    to: "/round",
    icon: Plus,
    primary: true,
  },

  {
    to: "/profile",
    icon: User,
  },
]

export default function BottomNav() {

  return (

    <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-[100] flex justify-center px-5">

      <motion.div

        initial={{
          opacity: 0,
          y: 40,
        }}

        animate={{
          opacity: 1,
          y: 0,
        }}

        transition={{
          duration: 0.35,
          ease: "easeOut",
        }}

        className="pointer-events-auto flex w-full max-w-xs items-center justify-between rounded-full border border-white/50 bg-white/85 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.10)] backdrop-blur-2xl"
      >

        {navItems.map(
          (item) => {

            const Icon =
              item.icon

            return (

              <NavLink
                key={item.to}
                to={item.to}
              >

                {({
                  isActive,
                }) => (

                  <motion.div

                    whileTap={{
                      scale: 0.9,
                    }}

                    animate={{
                      y: isActive
                        ? -2
                        : 0,
                    }}

                    transition={{
                      duration: 0.2,
                      ease: "easeOut",
                    }}

                    className={`relative flex items-center justify-center transition-all duration-300 ${
                      item.primary
                        ? "h-16 w-16 rounded-full bg-emerald-500 text-white shadow-[0_15px_35px_rgba(16,185,129,0.42)]"
                        : isActive
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  >

                    {/* Active Dot */}
                    {isActive &&
                      !item.primary && (

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
                      size={
                        item.primary
                          ? 30
                          : 24
                      }

                      strokeWidth={
                        2.5
                      }
                    />

                  </motion.div>

                )}

              </NavLink>

            )
          }
        )}

      </motion.div>

    </div>
  )
}