import webpush from "web-push"

const SEND_TIMEOUT_MS = 5000
const TIME_TO_LIVE_SECONDS = 6 * 60 * 60

let isConfigured = false

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
}

export function getPushPublicKey() {
  return isPushConfigured() ? process.env.VAPID_PUBLIC_KEY : null
}

/** web-push verlangt eine URL: eine bloße E-Mail-Adresse bekommt "mailto:" vorangestellt. */
export function normalizeVapidSubject(value) {
  const subject = String(value ?? "").trim()

  if (/^(mailto:|https:\/\/)/i.test(subject)) return subject

  return subject.includes("@") ? `mailto:${subject}` : subject
}

function configure() {
  if (isConfigured) return

  webpush.setVapidDetails(
    normalizeVapidSubject(process.env.VAPID_SUBJECT),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  isConfigured = true
}

/**
 * Sendet je Nutzer eine Nachricht an alle seine Geräte. Abgelaufene
 * Abonnements (404/410) werden gelöscht. notifications: [{ userId, payload }]
 */
export async function sendPushNotifications(sql, notifications) {
  if (!isPushConfigured() || notifications.length === 0) return { sent: 0 }

  configure()

  const payloads = new Map(notifications.map((entry) => [String(entry.userId), JSON.stringify(entry.payload)]))
  const subscriptions = await sql`
    SELECT id, user_id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ANY(${[...payloads.keys()]}::uuid[])
  `
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payloads.get(String(subscription.user_id)),
        { TTL: TIME_TO_LIVE_SECONDS, timeout: SEND_TIMEOUT_MS, urgency: "high" }
      )
    )
  )
  const expiredIds = []
  let sent = 0

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent += 1
    } else if ([404, 410].includes(result.reason?.statusCode)) {
      expiredIds.push(subscriptions[index].id)
    } else {
      console.warn("Push delivery failed.", result.reason?.statusCode ?? result.reason?.message)
    }
  })

  if (expiredIds.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE id = ANY(${expiredIds}::uuid[])`
  }

  return { sent }
}

/** Push darf nie eine fachliche Aktion scheitern lassen. */
export async function notifySafely(sql, notifications) {
  try {
    await sendPushNotifications(sql, notifications)
  } catch (error) {
    console.error("Push notification failed.", error)
  }
}
