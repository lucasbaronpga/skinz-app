import { motion } from "framer-motion"
import { Flag } from "lucide-react"
import AppBackground from "./AppBackground"

export default function AuthCard({
  eyebrow = "Welcome to",
  subtitle = "Premium Livescoring für moderne Golf Matches.",
  children,
}) {
  return (
    <>
      <AppBackground />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md overflow-hidden rounded-[36px] border border-white/70 bg-white/45 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-3xl sm:p-7"
        >
          <div className="rounded-[30px] bg-[#071819] px-6 py-7 text-white shadow-xl shadow-emerald-950/20">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-[#071819]">
              <Flag size={22} strokeWidth={2.5} />
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-[clamp(2.8rem,14vw,4.4rem)] font-black leading-none tracking-[-0.07em]">
              Skinz
            </h1>
            {subtitle && (
              <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/65">
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </motion.section>
      </main>
    </>
  )
}
