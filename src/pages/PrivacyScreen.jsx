import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { Card } from "../ui/index.js"

// Vor dem Go-live ergänzen: Name und Kontakt des Verantwortlichen.
const RESPONSIBLE_PARTY = "Wird vor dem Go-live ergänzt."

const SECTIONS = [
  {
    title: "Welche Daten wir speichern",
    text: "Name, Kürzel, E-Mail-Adresse, Passwort (nur verschlüsselt), freiwillig offizielles HCP, Heimatclub, PayPal.me-Link und Avatarfarbe. Dazu deine Runden mit Scores, Skinz, Einsätzen und der Abrechnung.",
  },
  {
    title: "Wofür",
    text: "Ausschließlich für die Funktionen der App: Anmeldung, Matches, Abrechnung, Leaderboard und Statistik. Es gibt keine Werbung, kein Tracking und keine Weitergabe zu anderen Zwecken.",
  },
  {
    title: "Wer was sieht",
    text: "Mitspieler sehen in gemeinsamen Matches deinen Namen und deine Ergebnisse. Im Leaderboard erscheinen alle Spieler, auf Wunsch nur mit Kürzel. Offizielles HCP, Heimatclub und Statistik stellst du im Profil selbst auf sichtbar oder privat. Deine E-Mail-Adresse sehen nur du und der Admin. Deinen PayPal-Link sehen Mitspieler, die dir aus einem Match Geld schulden.",
  },
  {
    title: "Dienste",
    text: "Die App läuft bei Vercel, die Daten liegen in einer Neon-PostgreSQL-Datenbank. Push-Nachrichten werden über die Push-Dienste von Apple, Google oder Mozilla zugestellt, je nach Browser. E-Mails (Bestätigung, Passwort) werden über einen E-Mail-Dienst versendet.",
  },
  {
    title: "Speicherdauer",
    text: "Pausierte Matches werden nach 3 Tagen gelöscht, nie gestartete Flights nach 24 Stunden, Anmeldeversuche nach 30 Tagen. Abgeschlossene Matches bleiben für Leaderboard und Statistik erhalten.",
  },
  {
    title: "Deine Rechte",
    text: "Du kannst dein Profil jederzeit ändern und dein Konto im Profil unter „Konto löschen“ selbst löschen. Für Auskunft oder Fragen wende dich an den Verantwortlichen.",
  },
]

export default function PrivacyScreen() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Zurück"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="text-[1.6rem] font-bold tracking-[-0.04em]">Datenschutz</h1>
        </div>

        <div className="mt-6 space-y-3">
          {SECTIONS.map((section) => (
            <Card key={section.title} className="p-4">
              <h2 className="font-bold text-ink">{section.title}</h2>
              <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ink-soft">{section.text}</p>
            </Card>
          ))}
          <Card className="p-4">
            <h2 className="font-bold text-ink">Verantwortlich</h2>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ink-soft">{RESPONSIBLE_PARTY}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
