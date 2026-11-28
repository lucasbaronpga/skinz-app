import { useEffect, useRef, useState } from "react"
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import { useAuth } from "../context/AuthContext"
import { Card } from "../ui/index.js"

const MISSING_TOKEN_MESSAGE =
  "Der Bestätigungslink ist unvollständig. Bitte öffne ihn direkt aus der E-Mail."

function readToken(hash) {
  return new URLSearchParams(String(hash || "").replace(/^#/, "")).get("token") || ""
}

export default function VerifyEmailScreen() {
  const { verifyEmail } = useAuth()
  const location = useLocation()
  const token = readToken(location.hash)
  const hasStartedRef = useRef(false)
  const [status, setStatus] = useState(token ? "loading" : "error")
  const [errorMessage, setErrorMessage] = useState(token ? "" : MISSING_TOKEN_MESSAGE)

  useEffect(() => {
    // Das Token ist nur einmal gültig, deshalb nie doppelt einlösen (auch nicht im StrictMode).
    if (!token || hasStartedRef.current) return

    hasStartedRef.current = true

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((error) => {
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Die E-Mail-Adresse konnte nicht bestätigt werden."
        )
        setStatus("error")
      })
  }, [token, verifyEmail])

  const titles = {
    loading: "Einen Moment …",
    success: "E-Mail bestätigt",
    error: "Bestätigung fehlgeschlagen",
  }

  return (
    <AuthCard title={titles[status]} subtitle="Wir prüfen deine E-Mail-Adresse.">
      <Card className="p-5" role={status === "error" ? "alert" : "status"}>
        {status === "loading" && <LoaderCircle className="animate-spin text-ink-mute" size={28} aria-hidden="true" />}
        {status === "success" && (
          <>
            <CheckCircle2 className="text-fairway" size={28} aria-hidden="true" />
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-ink">
              Dein Konto ist aktiv. Du kannst dich jetzt anmelden.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <CircleAlert className="text-red-600" size={28} aria-hidden="true" />
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-red-700">{errorMessage}</p>
          </>
        )}
      </Card>

      {status !== "loading" && (
        <Link to="/login" replace className="btn btn-primary btn-lg mt-4 w-full">
          Zur Anmeldung
        </Link>
      )}
    </AuthCard>
  )
}
