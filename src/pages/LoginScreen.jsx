import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  LoaderCircle,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"

function getRedirectPath(location) {
  const pathname = location?.state?.from?.pathname
  return typeof pathname === "string" && pathname.length > 0 ? pathname : "/"
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

export default function LoginScreen() {
  const [mode, setMode] = useState("login")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [handicapIndex, setHandicapIndex] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = getRedirectPath(location)
  const isRegistration = mode === "register"

  const canSubmit = useMemo(() => {
    const hasCredentials = email.trim().length > 0 && password.length > 0

    if (!isRegistration) return hasCredentials

    return (
      hasCredentials &&
      displayName.trim().length >= 2 &&
      password.length >= 12 &&
      password === passwordConfirmation
    )
  }, [
    displayName,
    email,
    isRegistration,
    password,
    passwordConfirmation,
  ])

  function changeMode(nextMode) {
    setMode(nextMode)
    setErrorMessage("")
    setSuccessMessage("")
    setPassword("")
    setPasswordConfirmation("")
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!email.trim() || !password) {
      setErrorMessage("Bitte E-Mail-Adresse und Passwort eingeben.")
      return
    }

    if (isRegistration) {
      if (displayName.trim().length < 2) {
        setErrorMessage("Der Name muss mindestens 2 Zeichen enthalten.")
        return
      }

      if (password.length < 12) {
        setErrorMessage("Das Passwort muss mindestens 12 Zeichen enthalten.")
        return
      }

      if (password !== passwordConfirmation) {
        setErrorMessage("Die eingegebenen Passwörter stimmen nicht überein.")
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (isRegistration) {
        const result = await register({
          displayName,
          email,
          password,
          handicapIndex: handicapIndex === "" ? null : Number(handicapIndex),
          homeClubId: null,
        })

        setSuccessMessage(
          result.message ||
            "Dein Benutzerkonto wurde erstellt und wartet auf Freigabe."
        )
        setPassword("")
        setPasswordConfirmation("")
        return
      }

      await login({ email, password })
      navigate(redirectPath, { replace: true })
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          isRegistration
            ? "Die Registrierung ist derzeit nicht möglich."
            : "Die Anmeldung ist derzeit nicht möglich."
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName =
    "mt-2 h-14 w-full min-w-0 rounded-[22px] border border-white/70 bg-white/[0.72] px-5 text-base font-bold text-slate-950 shadow-sm outline-none backdrop-blur-xl transition-all placeholder:font-medium placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"

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
              Welcome to
            </p>
            <h1 className="mt-1 text-[clamp(2.8rem,14vw,4.4rem)] font-black leading-none tracking-[-0.07em]">
              Skinz
            </h1>
            <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/65">
              Premium Livescoring für moderne Golf Matches.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-[22px] bg-slate-950/5 p-1">
            <button
              type="button"
              onClick={() => changeMode("login")}
              className={`h-11 rounded-[18px] text-sm font-black transition-all ${
                !isRegistration
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => changeMode("register")}
              className={`h-11 rounded-[18px] text-sm font-black transition-all ${
                isRegistration
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Registrieren
            </button>
          </div>

          {successMessage ? (
            <div
              role="status"
              className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-5 text-center"
            >
              <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
              <h2 className="mt-3 text-lg font-black text-emerald-950">
                Registrierung erfolgreich
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                {successMessage}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-emerald-700/80">
                Eine Anmeldung ist möglich, sobald dein Konto freigegeben wurde.
              </p>
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="mt-5 h-12 w-full rounded-[20px] bg-[#071819] px-5 text-sm font-black text-white transition-transform active:scale-[0.98]"
              >
                Zur Anmeldung
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {isRegistration && (
                <label className="block text-sm font-black text-slate-800">
                  Name
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Lucas Baron"
                    autoComplete="name"
                    disabled={isSubmitting}
                    className={inputClassName}
                  />
                </label>
              )}

              <label className="block text-sm font-black text-slate-800">
                E-Mail-Adresse
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@beispiel.de"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                  disabled={isSubmitting}
                  className={inputClassName}
                />
              </label>

              <label className="block text-sm font-black text-slate-800">
                Passwort
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isRegistration ? "Mindestens 12 Zeichen" : "Passwort"
                    }
                    autoComplete={
                      isRegistration ? "new-password" : "current-password"
                    }
                    disabled={isSubmitting}
                    className={`${inputClassName} pr-14`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute bottom-0 right-1 flex h-14 w-12 items-center justify-center rounded-[18px] text-slate-500"
                    aria-label={
                      showPassword ? "Passwort ausblenden" : "Passwort anzeigen"
                    }
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>

              {isRegistration && (
                <>
                  <label className="block text-sm font-black text-slate-800">
                    Passwort wiederholen
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      placeholder="Passwort wiederholen"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block text-sm font-black text-slate-800">
                    Handicap
                    <span className="ml-2 text-xs font-bold text-slate-400">
                      optional
                    </span>
                    <input
                      type="number"
                      value={handicapIndex}
                      onChange={(event) => setHandicapIndex(event.target.value)}
                      placeholder="z. B. 12,4"
                      min="-10"
                      max="54"
                      step="0.1"
                      inputMode="decimal"
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </label>
                </>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-[20px] border border-red-200 bg-red-50/90 px-4 py-3 text-center text-sm font-bold leading-5 text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#071819] px-5 text-base font-black text-white shadow-lg shadow-emerald-950/15 transition-all enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={20} />
                    Bitte warten
                  </>
                ) : (
                  <>
                    {isRegistration ? "Konto erstellen" : "Anmelden"}
                    <ArrowRight size={20} strokeWidth={2.5} />
                  </>
                )}
              </button>

              <p className="px-2 text-center text-xs font-semibold leading-5 text-slate-500">
                {isRegistration
                  ? "Neue Konten werden nach einer kurzen Prüfung freigegeben."
                  : "Melde dich mit deiner registrierten E-Mail-Adresse an."}
              </p>
            </form>
          )}
        </motion.section>
      </main>
    </>
  )
}
