const PENDING_INVITE_KEY = "skinz-pending-invite"
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/

/** Der Token steht im Hash (#token=…), damit er nicht in Server-Logs landet. */
export function readInviteToken(hash) {
  const token = new URLSearchParams(String(hash || "").replace(/^#/, "")).get("token") || ""

  return TOKEN_PATTERN.test(token) ? token : ""
}

export function buildInviteUrl(origin, token) {
  return `${String(origin).replace(/\/+$/, "")}/join#token=${token}`
}

/** Merkt sich eine Einladung über Anmeldung und Registrierung hinweg. */
export function savePendingInvite(token) {
  if (!TOKEN_PATTERN.test(token)) return

  try {
    window.localStorage.setItem(PENDING_INVITE_KEY, token)
  } catch {
    // Ohne Speicher muss der Link nach der Anmeldung erneut geöffnet werden.
  }
}

export function takePendingInvite() {
  try {
    const token = window.localStorage.getItem(PENDING_INVITE_KEY) || ""

    window.localStorage.removeItem(PENDING_INVITE_KEY)

    return TOKEN_PATTERN.test(token) ? token : ""
  } catch {
    return ""
  }
}

export function clearPendingInvite() {
  try {
    window.localStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    // nichts zu tun
  }
}
