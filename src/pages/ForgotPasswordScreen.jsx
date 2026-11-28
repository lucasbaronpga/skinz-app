import { useState } from "react"
import { CheckCircle2, LoaderCircle } from "lucide-react"
import { Link } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import AuthField from "../components/AuthField"
import { AUTH_ERROR_CLASS_NAME, AUTH_LINK_CLASS_NAME } from "../components/authStyles"
import { useAuth } from "../context/AuthContext"
import { Button, Card } from "../ui/index.js"

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

  const footer = (
    <Link to="/login" className={AUTH_LINK_CLASS_NAME}>
      Zurück zur Anmeldung
    </Link>
  )

  if (successMessage) {
    return (
      <AuthCard title="E-Mail unterwegs" subtitle="Schau auch im Spam-Ordner nach." footer={footer}>
        <Card className="p-5">
          <CheckCircle2 className="text-fairway" size={28} aria-hidden="true" />
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-ink">{successMessage}</p>
          <p className="mt-2 text-sm font-medium text-ink-mute">Der Link ist eine Stunde gültig.</p>
        </Card>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Passwort zurücksetzen"
      subtitle="Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Festlegen eines neuen Passworts."
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

        {errorMessage && (
          <div role="alert" className={AUTH_ERROR_CLASS_NAME}>
            {errorMessage}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!email.trim() || isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
              Bitte warten
            </>
          ) : (
            "Link anfordern"
          )}
        </Button>

        <p className="text-center text-xs font-medium leading-relaxed text-ink-mute">
          Der E-Mail-Versand startet in Kürze. Bis dahin schreib dem Admin, er setzt dein Passwort zurück.
        </p>
      </form>
    </AuthCard>
  )
}
