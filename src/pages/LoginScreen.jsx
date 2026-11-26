import { useMemo, useState } from "react"
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import AuthField from "../components/AuthField"
import PasswordField from "../components/PasswordField"
import {
  AUTH_ERROR_CLASS_NAME,
  AUTH_LINK_CLASS_NAME,
  AUTH_NOTICE_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
} from "../components/authStyles"
import { useAuth } from "../context/AuthContext"
import { SHORT_NAME_PATTERN, suggestShortName } from "../utils/shortName"

const MINIMUM_PASSWORD_LENGTH = 12

function getRedirectPath(location) {
  const pathname = location?.state?.from?.pathname

  return typeof pathname === "string" && pathname.length > 0 ? pathname : "/"
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}

export default function LoginScreen() {
  const [mode, setMode] = useState("login")
  const [displayName, setDisplayName] = useState("")
  const [shortName, setShortName] = useState("")
  const [isShortNameEdited, setIsShortNameEdited] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [handicapIndex, setHandicapIndex] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const { login, register, resendVerification } = useAuth()
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
      SHORT_NAME_PATTERN.test(shortName) &&
      password.length >= MINIMUM_PASSWORD_LENGTH &&
      password === passwordConfirmation
    )
  }, [displayName, email, isRegistration, password, passwordConfirmation, shortName])

  function changeMode(nextMode) {
    setMode(nextMode)
    setErrorMessage("")
    setSuccessMessage("")
    setNeedsVerification(false)
    setResendMessage("")
    setPassword("")
    setPasswordConfirmation("")
  }

  function handleDisplayNameChange(value) {
    setDisplayName(value)

    if (!isShortNameEdited) setShortName(suggestShortName(value))
  }

  function handleShortNameChange(value) {
    setIsShortNameEdited(true)
    setShortName(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))
  }

  async function handleResendVerification() {
    setResendMessage("")
    setIsSubmitting(true)

    try {
      const result = await resendVerification(email)

      setResendMessage(result.message || "Wir haben dir eine neue E-Mail gesendet.")
    } catch (error) {
      setResendMessage(getErrorMessage(error, "Die E-Mail konnte nicht gesendet werden."))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")
    setNeedsVerification(false)
    setResendMessage("")

    if (!email.trim() || !password) {
      setErrorMessage("Bitte E-Mail-Adresse und Passwort eingeben.")
      return
    }

    if (isRegistration) {
      if (displayName.trim().length < 2) {
        setErrorMessage("Der Name muss mindestens 2 Zeichen enthalten.")
        return
      }

      if (!SHORT_NAME_PATTERN.test(shortName)) {
        setErrorMessage("Das Kürzel muss aus 2 bis 4 Buchstaben oder Ziffern bestehen.")
        return
      }

      if (password.length < MINIMUM_PASSWORD_LENGTH) {
        setErrorMessage(`Das Passwort muss mindestens ${MINIMUM_PASSWORD_LENGTH} Zeichen enthalten.`)
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
          shortName,
          email,
          password,
          handicapIndex: handicapIndex === "" ? null : Number(handicapIndex),
          homeClubId: null,
        })

        setSuccessMessage(
          result.message || "Wir senden dir eine E-Mail mit einem Bestätigungslink."
        )
        setPassword("")
        setPasswordConfirmation("")
        return
      }

      await login({ email, password, rememberMe })
      navigate(redirectPath, { replace: true })
    } catch (error) {
      setNeedsVerification(error?.code === "EMAIL_NOT_VERIFIED")
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

  return (
    <AuthCard>
      <div className="mt-5 grid grid-cols-2 rounded-[22px] bg-slate-950/5 p-1">
        {[
          ["login", "Anmelden"],
          ["register", "Registrieren"],
        ].map(([tabMode, label]) => (
          <button
            key={tabMode}
            type="button"
            onClick={() => changeMode(tabMode)}
            className={`h-11 rounded-[18px] text-sm font-black transition-all ${
              mode === tabMode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {successMessage ? (
        <div
          role="status"
          className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-5 text-center"
        >
          <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
          <h2 className="mt-3 text-lg font-black text-emerald-950">Bestätige deine E-Mail</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
            {successMessage}
          </p>
          <p className="mt-2 text-xs font-bold leading-5 text-emerald-700/80">
            Schau auch im Spam-Ordner nach. Danach kannst du dich sofort anmelden.
          </p>
          <button
            type="button"
            onClick={() => changeMode("login")}
            className={`mt-5 ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
          >
            Zur Anmeldung
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {isRegistration && (
            <>
              <AuthField
                label="Name"
                type="text"
                value={displayName}
                onChange={(event) => handleDisplayNameChange(event.target.value)}
                placeholder="Lucas Baron"
                autoComplete="name"
                disabled={isSubmitting}
              />
              <AuthField
                label="Kürzel"
                hint="2–4 Zeichen, z. B. LB"
                type="text"
                value={shortName}
                onChange={(event) => handleShortNameChange(event.target.value)}
                placeholder="LB"
                maxLength={4}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={isSubmitting}
              />
            </>
          )}

          <AuthField
            label="E-Mail-Adresse"
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
          />

          <PasswordField
            label="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegistration ? "Mindestens 12 Zeichen" : "Passwort"}
            autoComplete={isRegistration ? "new-password" : "current-password"}
            disabled={isSubmitting}
          />

          {isRegistration ? (
            <>
              <PasswordField
                label="Passwort wiederholen"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <AuthField
                label="Handicap"
                hint="optional"
                type="number"
                value={handicapIndex}
                onChange={(event) => setHandicapIndex(event.target.value)}
                placeholder="z. B. 12,4"
                min="-10"
                max="54"
                step="0.1"
                inputMode="decimal"
                disabled={isSubmitting}
              />
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 px-1">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  disabled={isSubmitting}
                  className="h-5 w-5 rounded-md accent-emerald-600"
                />
                Angemeldet bleiben
              </label>
              <Link to="/forgot-password" className={AUTH_LINK_CLASS_NAME}>
                Passwort vergessen?
              </Link>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className={AUTH_ERROR_CLASS_NAME}>
              {errorMessage}
            </div>
          )}

          {needsVerification && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSubmitting}
                className={`${AUTH_SECONDARY_BUTTON_CLASS_NAME} disabled:opacity-60`}
              >
                Bestätigungs-E-Mail erneut senden
              </button>
              {resendMessage && (
                <div role="status" className={AUTH_NOTICE_CLASS_NAME}>
                  {resendMessage}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className={AUTH_PRIMARY_BUTTON_CLASS_NAME}
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
              ? "Nach der Registrierung bestätigst du deine E-Mail-Adresse per Link."
              : "Melde dich mit deiner registrierten E-Mail-Adresse an."}
          </p>
        </form>
      )}
    </AuthCard>
  )
}
