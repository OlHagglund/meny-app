// Bumpa versionen när du ändrar SW så att den uppdateras hos klienten
const CACHE_NAME = 'meny-cache-v3'
const ASSETS = ['/', '/index.html', '/list.html', '/recipes.html', '/src/style.css']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request

  // Endast GET
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Endast same-origin och http/https (ignorera t.ex. chrome-extension://)
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  const isSameOrigin = url.origin === self.location.origin
  if (!isHttp || !isSameOrigin) return

  // Cache-first för navigeringar och statiska resurser
  e.respondWith(
    (async () => {
      const cached = await caches.match(req)
      if (cached) return cached

      try {
        const res = await fetch(req)
        // Cacha bara OK-svar
        if (res && res.ok) {
          const copy = res.clone()
          const cache = await caches.open(CACHE_NAME)
          await cache.put(req, copy)
        }
        return res
      } catch (err) {
        // Fallback till cache om nätverket faller
        if (cached) return cached
        // Som sista utväg, enkel felrespons
        return new Response('Offline', { status: 503, statusText: 'Offline' })
      }
    })(),
  )
})
