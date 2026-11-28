import { useState } from "react"
import { CheckCircle2, LoaderCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import PasswordField from "../components/PasswordField"
import { AUTH_ERROR_CLASS_NAME, AUTH_LINK_CLASS_NAME } from "../components/authStyles"
import { useAuth } from "../context/AuthContext"
import { Button, Card } from "../ui/index.js"

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

  const canSubmit = password.length >= MINIMUM_PASSWORD_LENGTH && password === passwordConfirmation

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

  if (isDone) {
    return (
      <AuthCard title="Passwort geändert" subtitle="Du wurdest auf allen Geräten abgemeldet.">
        <Card className="p-5">
          <CheckCircle2 className="text-fairway" size={28} aria-hidden="true" />
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-ink">
            Melde dich jetzt mit deinem neuen Passwort an.
          </p>
        </Card>
        <Link to="/login" replace className="btn btn-primary btn-lg mt-4 w-full">
          Zur Anmeldung
        </Link>
      </AuthCard>
    )
  }

  if (!token) {
    return (
      <AuthCard title="Link unvollständig" subtitle="Öffne den Link direkt aus der E-Mail oder fordere einen neuen an.">
        <Link to="/forgot-password" className="btn btn-primary btn-lg w-full">
          Neuen Link anfordern
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Neues Passwort" subtitle="Lege ein neues Passwort mit mindestens 12 Zeichen fest.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordField
          label="Neues Passwort"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mindestens 12 Zeichen"
          autoComplete="new-password"
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

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
              Bitte warten
            </>
          ) : (
            "Passwort speichern"
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
