const MINUS = "\u2212"
const NBSP = "\u00A0"

/** Score relativ zu Par im Golf-Stil: E, +2, −1. */
export function formatToPar(value) {
  const toPar = Number(value)

  if (!Number.isFinite(toPar) || toPar === 0) return "E"

  return toPar > 0 ? `+${toPar}` : `${MINUS}${Math.abs(toPar)}`
}

/** Ganze Cent als Eurobetrag: 3600 → "36 €", 1250 → "12,50 €". */
export function formatCents(cents, { signed = false } = {}) {
  const value = Math.round(Number(cents) || 0)
  const absolute = Math.abs(value)
  const euros = absolute / 100
  const text = Number.isInteger(euros)
    ? String(euros)
    : euros.toFixed(2).replace(".", ",")
  let sign = ""

  if (value < 0) sign = MINUS
  else if (signed && value > 0) sign = "+"

  return `${sign}${text}${NBSP}€`
}

export function formatSkinz(count) {
  const amount = Math.max(Number(count) || 0, 0)

  return amount === 1 ? "1 Skin" : `${amount} Skinz`
}
