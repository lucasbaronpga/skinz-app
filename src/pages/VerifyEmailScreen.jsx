import { useEffect, useRef, useState } from "react"
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import AuthCard from "../components/AuthCard"
import { AUTH_SECONDARY_BUTTON_CLASS_NAME } from "../components/authStyles"
import { useAuth } from "../context/AuthContext"

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

  return (
    <AuthCard subtitle="Wir prüfen deine E-Mail-Adresse.">
      <div
        role={status === "error" ? "alert" : "status"}
        className="mt-5 rounded-[24px] border border-white/70 bg-white/70 p-6 text-center"
      >
        {status === "loading" && (
          <>
            <LoaderCircle className="mx-auto animate-spin text-slate-500" size={30} />
            <p className="mt-3 text-sm font-bold text-slate-600">Einen Moment bitte …</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
            <h2 className="mt-3 text-lg font-black text-emerald-950">
              E-Mail-Adresse bestätigt
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
              Dein Konto ist aktiv. Du kannst dich jetzt anmelden.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <CircleAlert className="mx-auto text-red-500" size={30} />
            <h2 className="mt-3 text-lg font-black text-red-700">Bestätigung fehlgeschlagen</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-red-700">{errorMessage}</p>
          </>
        )}
      </div>

      {status !== "loading" && (
        <Link to="/login" replace className={`mt-5 ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}>
          Zur Anmeldung
        </Link>
      )}
    </AuthCard>
  )
}
