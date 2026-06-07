import { useState } from "react"

import { motion } from "framer-motion"

import { ArrowRight, Flag } from "lucide-react"

import { useLocation, useNavigate } from "react-router-dom"

import AppBackground from "../components/AppBackground"

import { useAuth } from "../context/AuthContext"

export default function LoginScreen() {
  const [name, setName] = useState("")
  const [touched, setTouched] = useState(false)

  const { login } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const cleanedName = name.trim()
  const canLogin = cleanedName.length > 0

  const redirectPath = location.state?.from?.pathname || "/"

  function handleLogin() {
    setTouched(true)

    if (!canLogin) {
      return
    }

    const success = login(cleanedName)

    if (success) {
      navigate(redirectPath, {
        replace: true,
      })
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    handleLogin()
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] px-6 py-10 text-slate-950">
      <AppBackground />

      <motion.div
        initial={{
          opacity: 0,
          y: 24,
          scale: 0.98,
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
        className="relative w-full max-w-md"
      >
        <div className="overflow-hidden rounded-[44px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]">
          <div className="relative p-8 text-center">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
            />

            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
            />

            <div className="relative">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                  scale: 0.94,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  delay: 0.04,
                  duration: 0.35,
                  ease: "easeOut",
                }}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-xl"
              >
                <Flag size={38} strokeWidth={2.6} />
              </motion.div>

              <div className="mt-8 text-[12px] font-black uppercase tracking-[0.28em] text-emerald-200/85">
                Welcome to
              </div>

              <h1 className="mt-4 text-7xl font-black tracking-[-0.07em] text-white">
                Skinz
              </h1>

              <p className="mx-auto mt-5 max-w-xs text-base font-semibold leading-relaxed text-slate-400">
                Premium Livescoring für moderne Golf Matches.
              </p>
            </div>
          </div>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.08,
            duration: 0.35,
            ease: "easeOut",
          }}
          className="mt-6 rounded-[40px] border border-white/70 bg-white/[0.62] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
        >
          <label
            htmlFor="player-name"
            className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600"
          >
            Spielername
          </label>

          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            onBlur={() => {
              setTouched(true)
            }}
            placeholder="Lucas"
            autoFocus
            autoComplete="given-name"
            enterKeyHint="go"
            aria-invalid={touched && !canLogin}
            aria-describedby={
              touched && !canLogin
                ? "player-name-error"
                : undefined
            }
            className="mt-4 h-16 w-full rounded-[26px] border border-white/70 bg-white/[0.72] px-5 text-2xl font-black text-slate-950 shadow-sm outline-none backdrop-blur-xl transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />

          {touched && !canLogin && (
            <motion.div
              id="player-name-error"
              initial={{
                opacity: 0,
                y: -6,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
              className="mt-3 rounded-[22px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500 shadow-sm"
            >
              Bitte gib einen Spielernamen ein.
            </motion.div>
          )}

          <motion.button
            type="submit"
            whileTap={{
              scale: canLogin ? 0.98 : 1,
            }}
            disabled={!canLogin}
            className="mt-8 flex h-16 w-full items-center justify-between rounded-[30px] bg-slate-950 px-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-2xl font-black">Weiter</span>

            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
              <ArrowRight size={22} strokeWidth={2.8} />
            </span>
          </motion.button>
        </motion.form>

        <div className="mt-8 rounded-[26px] border border-white/70 bg-white/[0.42] px-5 py-4 text-center text-xs font-bold leading-relaxed text-slate-500 shadow-sm backdrop-blur-xl">
          Dein Name wird lokal auf diesem Gerät gespeichert.
        </div>
      </motion.div>
    </div>
  )
}