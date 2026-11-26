import { Buffer } from "node:buffer"

export const MINIMUM_PASSWORD_LENGTH = 12
export const MAXIMUM_PASSWORD_BYTES = 72
export const MINIMUM_DISPLAY_NAME_LENGTH = 2
export const MAXIMUM_DISPLAY_NAME_LENGTH = 80
export const MINIMUM_HANDICAP_INDEX = -10
export const MAXIMUM_HANDICAP_INDEX = 54

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SHORT_NAME_PATTERN = /^[A-Z0-9]{2,4}$/
const MAXIMUM_EMAIL_LENGTH = 254

export function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

export function normalizeDisplayName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
}

export function normalizeShortName(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
}

/** Liefert null (nicht angegeben), NaN (ungültig) oder die auf eine Nachkommastelle gerundete Zahl. */
export function normalizeHandicapIndex(value) {
  if (value === null || value === undefined || value === "") return null

  const handicapIndex = Number(value)

  if (!Number.isFinite(handicapIndex)) return Number.NaN

  return Math.round(handicapIndex * 10) / 10
}

export function isValidEmail(email) {
  return email.length <= MAXIMUM_EMAIL_LENGTH && EMAIL_PATTERN.test(email)
}

export function isValidShortName(shortName) {
  return SHORT_NAME_PATTERN.test(shortName)
}

/** Liefert eine Fehlermeldung oder null. */
export function validatePassword(password) {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MINIMUM_PASSWORD_LENGTH} Zeichen enthalten.`
  }

  if (Buffer.byteLength(password, "utf8") > MAXIMUM_PASSWORD_BYTES) {
    return `Das Passwort darf in UTF-8 maximal ${MAXIMUM_PASSWORD_BYTES} Bytes lang sein.`
  }

  return null
}

/** Erwartet bereits normalisierte Werte. Liefert eine Fehlermeldung oder null. */
export function validateRegistration({
  email,
  password,
  displayName,
  shortName,
  handicapIndex,
}) {
  if (!isValidEmail(email)) {
    return "Bitte eine gültige E-Mail-Adresse eingeben."
  }

  if (displayName.length < MINIMUM_DISPLAY_NAME_LENGTH) {
    return `Der Name muss mindestens ${MINIMUM_DISPLAY_NAME_LENGTH} Zeichen enthalten.`
  }

  if (displayName.length > MAXIMUM_DISPLAY_NAME_LENGTH) {
    return `Der Name darf maximal ${MAXIMUM_DISPLAY_NAME_LENGTH} Zeichen enthalten.`
  }

  if (!isValidShortName(shortName)) {
    return "Das Kürzel muss aus 2 bis 4 Buchstaben oder Ziffern (A–Z, 0–9) bestehen."
  }

  const passwordError = validatePassword(password)

  if (passwordError) return passwordError

  if (
    Number.isNaN(handicapIndex) ||
    (handicapIndex !== null &&
      (handicapIndex < MINIMUM_HANDICAP_INDEX || handicapIndex > MAXIMUM_HANDICAP_INDEX))
  ) {
    return `Das Handicap muss zwischen ${MINIMUM_HANDICAP_INDEX} und ${MAXIMUM_HANDICAP_INDEX} liegen.`
  }

  return null
}
