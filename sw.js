// Portfel.io Service Worker — v1.0
const CACHE_NAME = 'portfelio-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

// Instalacja — cache podstawowych zasobów
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS).catch(e => {
        console.warn('[SW] Some assets failed to cache:', e);
      });
    })
  );
  self.skipWaiting();
});

// Aktywacja — usuń stare cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — strategia: network first, fallback do cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls (Yahoo Finance, proxy) — zawsze network, bez cache
  if (
    url.hostname.includes('yahoo.com') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('corsproxy') ||
    url.hostname.includes('codetabs') ||
    url.hostname.includes('thingproxy')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({error: 'offline'}), {
          headers: {'Content-Type': 'application/json'}
        })
      )
    );
    return;
  }

  // Reszta zasobow: network first, fallback cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache udanych odpowiedzi
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background sync - refresh portfela gdy wroci internet
self.addEventListener('sync', event => {
  if (event.tag === 'portfolio-sync') {
    console.log('[SW] Background sync triggered');
  }
});
