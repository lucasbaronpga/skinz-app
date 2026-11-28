/** Inhalte der Push-Nachrichten und Prüfung der Abonnements (reine Funktionen). */

export const DELETED_PLAYER_NAME = "Gelöschter Spieler"

const GAME_MODE_LABELS = Object.freeze({
  classic: "Classic Skinz",
  professional: "Skinz Professional",
  wolffn: "Wolffn",
})

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/

export class SubscriptionError extends Error {
  constructor(message) {
    super(message)
    this.name = "SubscriptionError"
  }
}

export function formatEuro(cents) {
  const euros = Math.abs(Math.round(Number(cents) || 0)) / 100

  return `${Number.isInteger(euros) ? euros : euros.toFixed(2).replace(".", ",")} €`
}

export function getCourseName(courseSnapshot) {
  return courseSnapshot?.clubName || courseSnapshot?.name || "Golfplatz"
}

export function buildInviteNotification({ flightId, scorerName, courseName, gameMode }) {
  return {
    title: "Neue Einladung",
    body: `${scorerName || "Ein Spieler"} lädt dich ein: ${courseName} · ${GAME_MODE_LABELS[gameMode] ?? "Skinz"}`,
    url: `/flights/${flightId}`,
    tag: `flight-${flightId}`,
  }
}

export function buildStartNotification({ matchId, matchCode, scorerName, courseName }) {
  return {
    title: "Match gestartet",
    body: `${matchCode} · ${courseName}. ${scorerName || "Der Scorer"} erfasst die Scores.`,
    url: `/live/${matchId}`,
    tag: `match-${matchId}`,
  }
}

/** Je Spieler eine Nachricht mit seinem Ergebnis aus dem Zahlungsplan. */
export function buildCompletionNotifications({ matchId, matchCode, courseName, players, payments }) {
  const names = new Map(players.map((player) => [player.userId, player.name]))

  return players.map((player) => {
    const pays = payments.filter((payment) => payment.fromPlayerId === player.userId)
    const receives = payments.filter((payment) => payment.toPlayerId === player.userId)
    const parts = [
      ...pays.map((payment) => `Du zahlst ${formatEuro(payment.amountCents)} an ${names.get(payment.toPlayerId) ?? "Mitspieler"}`),
      ...receives.map((payment) => `Du bekommst ${formatEuro(payment.amountCents)} von ${names.get(payment.fromPlayerId) ?? "Mitspieler"}`),
    ]

    return {
      userId: player.userId,
      payload: {
        title: "Match beendet",
        body: `${matchCode} · ${courseName}. ${parts.length ? parts.join(", ") : "Alles ausgeglichen"}.`,
        url: `/matches/${matchId}`,
        tag: `match-${matchId}`,
      },
    }
  })
}

/** Prüft ein Abonnement aus PushSubscription.toJSON(). */
export function normalizeSubscription(body) {
  const endpoint = String(body?.endpoint ?? "").trim()
  const p256dh = String(body?.keys?.p256dh ?? "").trim()
  const auth = String(body?.keys?.auth ?? "").trim()
  let url = null

  try {
    url = new URL(endpoint)
  } catch {
    url = null
  }

  if (!url || url.protocol !== "https:" || endpoint.length > 1000) {
    throw new SubscriptionError("Das Push-Abonnement ist ungültig.")
  }

  if (!BASE64URL_PATTERN.test(p256dh) || !BASE64URL_PATTERN.test(auth) || p256dh.length > 200 || auth.length > 100) {
    throw new SubscriptionError("Das Push-Abonnement ist ungültig.")
  }

  return { endpoint, p256dh, auth }
}
