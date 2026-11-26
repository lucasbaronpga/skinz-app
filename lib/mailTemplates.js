const APP_NAME = "Skinz"

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderHtml({ greeting, paragraphs, buttonLabel, link, footer }) {
  const paragraphHtml = paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;">${escapeHtml(paragraph)}</p>`)
    .join("")
  const buttonHtml = buttonLabel
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#071819;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:14px;">${escapeHtml(buttonLabel)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#64748b;">Funktioniert der Button nicht? Kopiere diesen Link in deinen Browser:<br>${escapeHtml(link)}</p>`
    : ""

  return (
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#020617;max-width:480px;margin:0 auto;padding:24px;">` +
    `<p style="margin:0 0 24px;font-size:24px;font-weight:900;letter-spacing:-0.03em;">${APP_NAME}</p>` +
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px;">${escapeHtml(greeting)}</p>` +
    paragraphHtml +
    buttonHtml +
    `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#64748b;">${escapeHtml(footer)}</p>` +
    `</div>`
  )
}

function renderText({ greeting, paragraphs, link, footer }) {
  return [greeting, "", ...paragraphs.flatMap((paragraph) => [paragraph, ""]), link, "", footer].join("\n")
}

function buildMail({ subject, ...content }) {
  return {
    subject,
    text: renderText(content),
    html: renderHtml(content),
  }
}

export function verificationMail({ displayName, link }) {
  return buildMail({
    subject: `Bestätige deine E-Mail-Adresse für ${APP_NAME}`,
    greeting: `Hallo ${displayName},`,
    paragraphs: [
      `schön, dass du dabei bist! Bitte bestätige deine E-Mail-Adresse, damit du dich bei ${APP_NAME} anmelden kannst. Der Link ist 24 Stunden gültig.`,
    ],
    buttonLabel: "E-Mail-Adresse bestätigen",
    link,
    footer: "Du hast dich nicht registriert? Dann kannst du diese E-Mail ignorieren.",
  })
}

export function passwordResetMail({ displayName, link }) {
  return buildMail({
    subject: `Passwort für ${APP_NAME} zurücksetzen`,
    greeting: `Hallo ${displayName},`,
    paragraphs: [
      "du hast darum gebeten, dein Passwort zurückzusetzen. Der Link ist eine Stunde gültig und kann nur einmal verwendet werden. Danach wirst du auf allen Geräten abgemeldet.",
    ],
    buttonLabel: "Neues Passwort festlegen",
    link,
    footer: "Du hast das nicht angefordert? Dann kannst du diese E-Mail ignorieren, dein Passwort bleibt unverändert.",
  })
}

export function accountExistsMail({ displayName, link }) {
  return buildMail({
    subject: `Du hast bereits ein ${APP_NAME}-Konto`,
    greeting: `Hallo ${displayName},`,
    paragraphs: [
      `mit dieser E-Mail-Adresse wurde versucht, ein neues ${APP_NAME}-Konto zu erstellen. Es gibt aber bereits ein Konto. Falls du dein Passwort vergessen hast, kannst du es hier zurücksetzen.`,
    ],
    buttonLabel: "Passwort zurücksetzen",
    link,
    footer: "Das warst du nicht? Dann kannst du diese E-Mail ignorieren.",
  })
}
