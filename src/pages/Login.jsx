import {
  useState,
} from "react"

import {
  motion,
} from "framer-motion"

import {
  ArrowRight,
  Flag,
} from "lucide-react"

import {
  useAuth,
} from "../context/AuthContext"

export default function Login() {

  const [
    name,
    setName,
  ] = useState("")

  const [
    touched,
    setTouched,
  ] = useState(false)

  const {
    login,
  } = useAuth()

  const cleanedName =
    name.trim()

  const canLogin =
    cleanedName.length > 0

  function handleLogin() {

    setTouched(true)

    if (!canLogin) {
      return
    }

    login(
      cleanedName
    )
  }

  return (

    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6 py-10 text-slate-950">

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

        className="w-full max-w-md"
      >

        {/* App Hero */}
        <div className="text-center">

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-slate-950 text-white shadow-2xl">

            <Flag
              size={38}
              strokeWidth={2.6}
            />

          </div>

          <div className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
            Welcome to
          </div>

          <h1 className="mt-4 text-7xl font-black tracking-tight text-slate-950">
            Skinz
          </h1>

          <p className="mx-auto mt-5 max-w-xs text-lg font-medium leading-relaxed text-slate-500">
            Premium Livescoring
            für moderne Golf
            Matches.
          </p>

        </div>

        {/* Login Card */}
        <motion.div

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
          }}

          className="mt-10 rounded-[42px] border border-slate-100 bg-white p-6 shadow-sm"
        >

          <div>

            <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Spielername
            </div>

            <input
              type="text"

              value={name}

              onChange={(event) =>
                setName(
                  event.target.value
                )
              }

              onBlur={() =>
                setTouched(true)
              }

              onKeyDown={(event) => {

                if (
                  event.key ===
                  "Enter"
                ) {
                  handleLogin()
                }
              }}

              placeholder="Lucas"

              autoFocus

              className="mt-4 h-16 w-full rounded-[26px] border border-slate-100 bg-white px-5 text-2xl font-black text-slate-950 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400"
            />

            {touched &&
              !canLogin && (

              <div className="mt-3 rounded-[20px] border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-500 shadow-sm">
                Bitte gib einen Spielernamen ein.
              </div>

            )}

          </div>

          {/* Button */}
          <motion.button

            whileTap={{
              scale: 0.98,
            }}

            disabled={
              !canLogin
            }

            onClick={
              handleLogin
            }

            className="mt-8 flex h-16 w-full items-center justify-between rounded-[28px] bg-slate-950 px-6 text-white shadow-2xl transition-all disabled:opacity-40"
          >

            <div className="text-2xl font-black">
              Weiter
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">

              <ArrowRight
                size={22}
                strokeWidth={2.8}
              />

            </div>

          </motion.button>

        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs font-bold leading-relaxed text-slate-400">
          Dein Name wird lokal auf diesem Gerät gespeichert.
        </div>

      </motion.div>

    </div>
  )
}