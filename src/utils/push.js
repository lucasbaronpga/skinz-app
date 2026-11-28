import { apiRequest } from "./api.js"

const READY_TIMEOUT_MS = 5000

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/** iPhone und iPad erlauben Web-Push nur in der installierten App (Home-Bildschirm). */
export function needsHomeScreenInstall() {
  if (typeof window === "undefined") return false

  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true

  return isAppleMobile && !isStandalone
}

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)

  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

async function getRegistration() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      window.setTimeout(() => reject(new Error("Der Service Worker ist nicht bereit.")), READY_TIMEOUT_MS)
    ),
  ])
}

export async function getPushState() {
  if (!isPushSupported()) return { supported: false, permission: "unsupported", subscribed: false }

  const registration = await getRegistration().catch(() => null)
  const subscription = registration ? await registration.pushManager.getSubscription() : null

  return { supported: true, permission: Notification.permission, subscribed: Boolean(subscription) }
}

export async function enablePush(publicKey) {
  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    throw new Error("Benachrichtigungen wurden im Browser nicht erlaubt.")
  }

  const registration = await getRegistration()
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  await apiRequest("/api/auth/push-subscribe", { method: "POST", body: subscription.toJSON() })
}

export async function disablePush() {
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) return

  await apiRequest("/api/auth/push-unsubscribe", { method: "POST", body: { endpoint: subscription.endpoint } })
  await subscription.unsubscribe()
}
