const CACHE_NAME = "skinz-cache-v4"

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
]

function isSameOriginRequest(requestUrl) {
  return requestUrl.origin === self.location.origin
}

function isCacheableRequest(request) {
  if (request.method !== "GET") return false
  if (request.headers.has("range")) return false

  const url = new URL(request.url)

  return isSameOriginRequest(url)
}

function isCacheableResponse(response) {
  return Boolean(
    response &&
      response.status === 200 &&
      response.type === "basic"
  )
}

async function putInCache(request, response) {
  if (!isCacheableResponse(response)) return

  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  } catch {
    // Cache writes dürfen die eigentliche App-Response nicht blockieren.
  }
}

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request)
    await putInCache("/index.html", networkResponse)

    return networkResponse
  } catch {
    const cachedIndex = await caches.match("/index.html")
    const cachedRoot = await caches.match("/")

    return cachedIndex || cachedRoot || Response.error()
  }
}

async function cacheFirstAsset(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    await putInCache(request, networkResponse)

    return networkResponse
  } catch {
    const fallbackResponse = await caches.match(request)

    return fallbackResponse || Response.error()
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          APP_SHELL.map((url) =>
            cache.add(new Request(url, { cache: "reload" }))
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (!isCacheableRequest(request)) return

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  event.respondWith(cacheFirstAsset(request))
})