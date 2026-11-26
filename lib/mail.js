const RESEND_ENDPOINT = "https://api.resend.com/emails"

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Der E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY, MAIL_FROM).")
    this.name = "MailNotConfiguredError"
  }
}

function isLocalDevelopment() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "development"

  return process.env.NODE_ENV !== "production"
}

/**
 * Basis-URL für Links in E-Mails. Der Host-Header wird nur lokal verwendet,
 * damit niemand Links auf fremde Adressen umleiten kann.
 */
export function getAppBaseUrl(request) {
  const configuredUrl = String(process.env.APP_BASE_URL || "").trim()

  if (configuredUrl) return configuredUrl.replace(/\/+$/, "")

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL

  if (process.env.VERCEL_ENV === "production" && productionHost) {
    return `https://${productionHost}`
  }

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  const host = String(request?.headers?.host || "").trim()

  if (isLocalDevelopment() && host) {
    const protocol = String(request.headers["x-forwarded-proto"] || "http")
      .split(",")[0]
      .trim()

    return `${protocol}://${host}`
  }

  throw new Error("APP_BASE_URL ist nicht gesetzt.")
}

/**
 * Versendet eine E-Mail über Resend. Lokal (vercel dev) wird die Nachricht
 * stattdessen im Terminal ausgegeben, damit keine Domain nötig ist.
 */
export async function sendMail({ to, subject, text, html }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim()
  const from = String(process.env.MAIL_FROM || "").trim()

  if (apiKey && from) {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    })

    if (!response.ok) {
      throw new Error(`E-Mail-Versand fehlgeschlagen (HTTP ${response.status}).`)
    }

    return
  }

  if (isLocalDevelopment()) {
    console.log(
      [
        "",
        "──────── E-Mail (nur lokal, nicht versendet) ────────",
        `An:      ${to}`,
        `Betreff: ${subject}`,
        "",
        text,
        "─────────────────────────────────────────────────────",
        "",
      ].join("\n")
    )
    return
  }

  throw new MailNotConfiguredError()
}
