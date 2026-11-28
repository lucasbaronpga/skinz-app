import AppBackground from "./AppBackground"

/**
 * Gemeinsamer Rahmen für Anmeldung, Registrierung, Passwort und Bestätigung
 * im PGA-Stil: Logo, große Überschrift, darunter der Inhalt.
 */
export default function AuthCard({ title, subtitle, children, footer = null }) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden text-ink">
      <AppBackground />
      <main className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-lg font-bold leading-none text-page"
          >
            S
          </div>
          <span className="text-xl font-bold tracking-[-0.04em]">Skinz</span>
        </div>

        <h1 className="mt-10 break-words text-[clamp(2.2rem,10vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.045em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-sm text-[15px] font-medium leading-snug text-ink-mute">{subtitle}</p>
        )}

        <div className="mt-8">{children}</div>

        {footer && <div className="mt-8 text-center">{footer}</div>}
      </main>
    </div>
  )
}
