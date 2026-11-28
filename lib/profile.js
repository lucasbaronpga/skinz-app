/** Profil-Einstellungen: Validierung, Sichtbarkeit und Avatarfarben. */

export const AVATAR_COLORS = Object.freeze([
  "#0a0a0a",
  "#006847",
  "#1e5aa8",
  "#b3261e",
  "#c27c0e",
  "#6b3fa0",
  "#0f766e",
  "#64748b",
])

// Datensparsame Voreinstellung: Name im Leaderboard, Statistik sichtbar,
// offizielles HCP und Heimatclub privat.
export const DEFAULT_VISIBILITY = Object.freeze({
  leaderboardAnonymous: false,
  showStats: true,
  showHandicap: false,
  showHomeClub: false,
})

const SHORT_NAME_PATTERN = /^[A-Z0-9]{2,4}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const PAYPAL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:paypal\.me|paypal\.com\/paypalme)\/([A-Za-z0-9._-]{1,64})\/?$/i

export class ProfileError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = "ProfileError"
    this.status = status
  }
}

export function readVisibility(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}

  return Object.fromEntries(
    Object.entries(DEFAULT_VISIBILITY).map(([key, fallback]) => [
      key,
      typeof source[key] === "boolean" ? source[key] : fallback,
    ])
  )
}

/** PayPal.me-Link vereinheitlichen, null bei leerer Eingabe. */
export function normalizePayPalLink(value) {
  const text = String(value ?? "").trim()

  if (!text) return null

  const match = PAYPAL_PATTERN.exec(text)

  if (!match) throw new ProfileError("Bitte einen PayPal.me-Link eingeben, z. B. paypal.me/deinname.")

  return `https://paypal.me/${match[1]}`
}

/** Prüft und normalisiert die Eingaben aus dem Profilformular. */
export function normalizeProfileInput(body) {
  const displayName = String(body?.displayName ?? "").trim().replace(/\s+/g, " ")
  const shortName = String(body?.shortName ?? "").trim().toUpperCase()
  const homeClubId = String(body?.homeClubId ?? "").trim().toLowerCase() || null
  const avatarColor = String(body?.avatarColor ?? "").trim().toLowerCase() || null
  const rawHandicap = body?.handicapIndex

  if (displayName.length < 2 || displayName.length > 80) {
    throw new ProfileError("Der Name muss 2 bis 80 Zeichen lang sein.")
  }

  if (!SHORT_NAME_PATTERN.test(shortName)) {
    throw new ProfileError("Das Kürzel muss aus 2 bis 4 Buchstaben oder Ziffern (A–Z, 0–9) bestehen.")
  }

  let handicapIndex = null

  if (rawHandicap !== null && rawHandicap !== undefined && rawHandicap !== "") {
    handicapIndex = Math.round(Number(rawHandicap) * 10) / 10

    if (!Number.isFinite(handicapIndex) || handicapIndex < -10 || handicapIndex > 54) {
      throw new ProfileError("Das Handicap muss zwischen -10 und 54 liegen.")
    }
  }

  if (homeClubId && !UUID_PATTERN.test(homeClubId)) {
    throw new ProfileError("Der Heimatclub ist ungültig.")
  }

  if (avatarColor && !AVATAR_COLORS.includes(avatarColor)) {
    throw new ProfileError("Die Farbe ist ungültig.")
  }

  return {
    displayName,
    shortName,
    handicapIndex,
    homeClubId,
    avatarColor,
    paypalLink: normalizePayPalLink(body?.paypalLink),
    visibility: readVisibility(body?.visibility),
  }
}
