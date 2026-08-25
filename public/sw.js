// public/sw.js
const CACHE_NAME = 'nws-collect-cache-v4';

const STATIC_ASSETS = [
  '/',
  '/collect',
  '/collect/login',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas ao Supabase nem requisições não-GET
  if (event.request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  // Para arquivos estáticos do Next.js (CSS, JS, Fontes): Cache-First com gravação dinâmica
  if (url.pathname.startsWith('/_next/') || url.pathname.includes('/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // Para navegação de páginas (HTML)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          return (await cache.match('/collect/login')) || (await cache.match('/collect'));
        }
        return new Response('Offline', { status: 503 });
      }
    })
  );
});