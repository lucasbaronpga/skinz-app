import { fail } from "./errors.js"

/** Rechnet einen Euro-Betrag exakt in ganze Cent um. */
export function eurosToCents(value) {
  const euros = Number(value)

  if (!Number.isFinite(euros)) {
    fail("INVALID_MONEY", "Der Geldbetrag ist ungültig.")
  }

  return Math.round(euros * 100)
}

export function centsToEuros(cents) {
  return Math.round(cents) / 100
}
