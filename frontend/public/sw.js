// LuminaRead PWA Service Worker (luminaread-pwa-v8)
// Preserves TTS voice cache (lumina-tts-cache-v1) and purges only legacy PWA shell caches.
const CACHE_NAME = 'luminaread-pwa-v8'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => {
            // Only prune legacy PWA app-shell versions; NEVER delete audio/data caches!
            if (k.startsWith('luminaread-pwa-') && k !== CACHE_NAME) {
              return caches.delete(k)
            }
            return Promise.resolve(false)
          })
        )
      )
      .then(() => self.clients.claim())
  )
})
