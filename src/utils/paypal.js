// Erlaubt sind PayPal.me-Links: paypal.me/name oder paypal.com/paypalme/name.
const PAYPAL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:paypal\.me|paypal\.com\/paypalme)\/([A-Za-z0-9._-]{1,64})\/?$/i

/**
 * Baut einen PayPal.me-Link mit vorausgefülltem Betrag, z. B.
 * https://paypal.me/lucas/12.50EUR. Liefert null bei ungültigem Link oder Betrag.
 */
export function buildPayPalUrl(link, amountCents) {
  const match = PAYPAL_PATTERN.exec(String(link ?? "").trim())
  const cents = Math.round(Number(amountCents))

  if (!match || !Number.isFinite(cents) || cents <= 0) return null

  return `https://paypal.me/${match[1]}/${(cents / 100).toFixed(2)}EUR`
}
