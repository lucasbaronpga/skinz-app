import { useMemo, useState } from "react"
import { CheckCircle2, LoaderCircle } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import AuthField from "../components/AuthField"
import PasswordField from "../components/PasswordField"
import {
  AUTH_ERROR_CLASS_NAME,
  AUTH_LINK_CLASS_NAME,
  AUTH_NOTICE_CLASS_NAME,
} from "../components/authStyles"
import { useAuth } from "../context/AuthContext"
import { Button, Card, Segmented } from "../ui/index.js"
import { SHORT_NAME_PATTERN, suggestShortName } from "../utils/shortName"

const MINIMUM_PASSWORD_LENGTH = 12

const MODE_OPTIONS = [
  { value: "login", label: "Anmelden" },
  { value: "register", label: "Registrieren" },
]

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
  const [isRegistered, setIsRegistered] = useState(false)
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
    setIsRegistered(false)
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
        await register({
          displayName,
          shortName,
          email,
          password,
          handicapIndex: handicapIndex === "" ? null : Number(handicapIndex),
          homeClubId: null,
        })

        setIsRegistered(true)
        setPassword("")
        setPasswordConfirmation("")
        return
      }

      await login({ email, password, rememberMe })
      navigate(redirectPath, { replace: true })
    } catch (error) {
      const notVerified = error?.code === "EMAIL_NOT_VERIFIED"

      setNeedsVerification(notVerified)
      setErrorMessage(
        notVerified
          ? "Dein Konto ist noch nicht freigeschaltet. Bitte warte auf die Freigabe oder bestätige deine E-Mail, falls du eine bekommen hast."
          : getErrorMessage(
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

  const footer = (
    <Link to="/privacy" className="text-xs font-semibold text-ink-mute underline underline-offset-4">
      Datenschutz
    </Link>
  )

  if (isRegistered) {
    return (
      <AuthCard title="Konto angelegt" subtitle="Fast geschafft." footer={footer}>
        <Card className="p-5">
          <CheckCircle2 className="text-fairway" size={28} aria-hidden="true" />
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-ink">
            Du kannst dich anmelden, sobald dein Konto freigeschaltet ist. Das passiert über den Link in der
            Bestätigungs-E-Mail oder durch den Admin.
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink-mute">
            Wenn du keine E-Mail bekommst, melde dich kurz beim Admin.
          </p>
        </Card>
        <Button variant="primary" size="lg" className="mt-4 w-full" onClick={() => changeMode("login")}>
          Zur Anmeldung
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={isRegistration ? "Konto erstellen" : "Willkommen zurück"}
      subtitle={
        isRegistration
          ? "Registrieren, Runden spielen und im Leaderboard dabei sein."
          : "Melde dich an, um deine Runden und Einladungen zu sehen."
      }
      footer={footer}
    >
      <Segmented label="Anmelden oder registrieren" options={MODE_OPTIONS} value={mode} onChange={changeMode} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
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
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isSubmitting}
                className="h-5 w-5 rounded-md"
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
            <Button variant="glass" className="w-full" disabled={isSubmitting} onClick={handleResendVerification}>
              Bestätigungs-E-Mail erneut senden
            </Button>
            {resendMessage && (
              <div role="status" className={AUTH_NOTICE_CLASS_NAME}>
                {resendMessage}
              </div>
            )}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
              Bitte warten
            </>
          ) : isRegistration ? (
            "Konto erstellen"
          ) : (
            "Anmelden"
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
