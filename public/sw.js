const CACHE_NAME = "skinz-cache-v3"

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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          APP_SHELL.map((url) =>
            cache.add(url)
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

self.addEventListener("fetch", (event) => {
  const {
    request,
  } = event

  if (request.method !== "GET") {
    return
  }

  const url =
    new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone =
            response.clone()

          caches
            .open(CACHE_NAME)
            .then((cache) =>
              cache.put("/index.html", responseClone)
            )
            .catch(() => {
              // Cache-Update darf Navigation nicht blockieren.
            })

          return response
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then((cachedResponse) =>
              cachedResponse || caches.match("/")
            )
        )
    )

    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse
          }

          const responseClone =
            networkResponse.clone()

          caches
            .open(CACHE_NAME)
            .then((cache) =>
              cache.put(request, responseClone)
            )
            .catch(() => {
              // Cache-Write darf die Response nicht verhindern.
            })

          return networkResponse
        })
        .catch(() => caches.match(request))
    })
  )
})