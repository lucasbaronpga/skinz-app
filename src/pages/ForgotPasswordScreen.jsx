import { useState } from "react"
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react"
import { Link } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import AuthField from "../components/AuthField"
import {
  AUTH_ERROR_CLASS_NAME,
  AUTH_LINK_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
} from "../components/authStyles"
import { useAuth } from "../context/AuthContext"

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const result = await forgotPassword(email)

      setSuccessMessage(
        result.message ||
          "Wenn ein Konto mit dieser Adresse existiert, haben wir dir eine E-Mail gesendet."
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Die Anfrage konnte nicht verarbeitet werden."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard subtitle="Passwort vergessen? Kein Problem.">
      {successMessage ? (
        <div
          role="status"
          className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-5 text-center"
        >
          <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
          <h2 className="mt-3 text-lg font-black text-emerald-950">E-Mail unterwegs</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
            {successMessage}
          </p>
          <p className="mt-2 text-xs font-bold leading-5 text-emerald-700/80">
            Der Link ist eine Stunde gültig. Schau auch im Spam-Ordner nach.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <h2 className="text-xl font-black tracking-tight text-slate-950">
            Passwort zurücksetzen
          </h2>
          <p className="text-sm font-semibold leading-6 text-slate-500">
            Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Festlegen eines
            neuen Passworts.
          </p>

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

          {errorMessage && (
            <div role="alert" className={AUTH_ERROR_CLASS_NAME}>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || isSubmitting}
            className={AUTH_PRIMARY_BUTTON_CLASS_NAME}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" size={20} />
                Bitte warten
              </>
            ) : (
              <>
                Link anfordern
                <ArrowRight size={20} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-5 text-center">
        <Link to="/login" className={AUTH_LINK_CLASS_NAME}>
          Zurück zur Anmeldung
        </Link>
      </div>
    </AuthCard>
  )
}
