import { useState } from "react"
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import PasswordField from "../components/PasswordField"
import {
  AUTH_ERROR_CLASS_NAME,
  AUTH_LINK_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
} from "../components/authStyles"
import { useAuth } from "../context/AuthContext"

const MINIMUM_PASSWORD_LENGTH = 12

function readToken(hash) {
  return new URLSearchParams(String(hash || "").replace(/^#/, "")).get("token") || ""
}

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth()
  const location = useLocation()
  const token = readToken(location.hash)
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDone, setIsDone] = useState(false)

  const canSubmit =
    password.length >= MINIMUM_PASSWORD_LENGTH && password === passwordConfirmation

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")

    if (!canSubmit) {
      setErrorMessage(
        password.length < MINIMUM_PASSWORD_LENGTH
          ? `Das Passwort muss mindestens ${MINIMUM_PASSWORD_LENGTH} Zeichen enthalten.`
          : "Die eingegebenen Passwörter stimmen nicht überein."
      )
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword({ token, password })
      setIsDone(true)
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Das Passwort konnte nicht zurückgesetzt werden."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  let content

  if (isDone) {
    content = (
      <div
        role="status"
        className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-5 text-center"
      >
        <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
        <h2 className="mt-3 text-lg font-black text-emerald-950">Passwort geändert</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
          Du wurdest auf allen Geräten abgemeldet. Melde dich jetzt mit deinem neuen
          Passwort an.
        </p>
        <Link to="/login" replace className={`mt-5 ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}>
          Zur Anmeldung
        </Link>
      </div>
    )
  } else if (!token) {
    content = (
      <div className="mt-5 space-y-4">
        <div role="alert" className={AUTH_ERROR_CLASS_NAME}>
          Der Link ist unvollständig. Bitte öffne ihn direkt aus der E-Mail oder fordere
          einen neuen an.
        </div>
        <Link to="/forgot-password" className={AUTH_SECONDARY_BUTTON_CLASS_NAME}>
          Neuen Link anfordern
        </Link>
      </div>
    )
  } else {
    content = (
      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          Neues Passwort festlegen
        </h2>

        <PasswordField
          label="Neues Passwort"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mindestens 12 Zeichen"
          autoComplete="new-password"
          autoFocus
          disabled={isSubmitting}
        />
        <PasswordField
          label="Passwort wiederholen"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          placeholder="Passwort wiederholen"
          autoComplete="new-password"
          disabled={isSubmitting}
        />

        {errorMessage && (
          <div role="alert" className={AUTH_ERROR_CLASS_NAME}>
            {errorMessage}
            <div className="mt-2">
              <Link to="/forgot-password" className={AUTH_LINK_CLASS_NAME}>
                Neuen Link anfordern
              </Link>
            </div>
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
              Passwort speichern
              <ArrowRight size={20} strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    )
  }

  return <AuthCard subtitle="Lege ein neues Passwort fest.">{content}</AuthCard>
}
