// 🌱 Service Worker — Le jardin de Lolo
// Stratégie:
//  - App shell (HTML/CSS/JS/icônes) : cache-first
//  - SDK Supabase CDN : stale-while-revalidate
//  - API Supabase (auth/rest) : toujours réseau (pas de cache)
//
// Pour déployer une nouvelle version, change CACHE_VERSION ci-dessous.

const CACHE_VERSION = 'v11';
const APP_CACHE = 'jardin-app-' + CACHE_VERSION;
const CDN_CACHE = 'jardin-cdn-' + CACHE_VERSION;

// Fichiers à mettre en cache immédiatement (chemins relatifs = marche sur GitHub Pages).
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './plant-calendar.js',
  './moon.js',
  './weather.js',
  './projets.js',
  './actions-calendar.js',
  './potager.js',
  './social.js',
  './supabase-config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache =>
      // addAll échoue si un fichier manque → on utilise des add individuels tolérants
      Promise.all(APP_SHELL.map(url =>
        cache.add(url).catch(err => console.warn('[SW] skip', url, err.message))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== APP_CACHE && k !== CDN_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // laisse passer POST/PUT/DELETE

  const url = new URL(req.url);

  // Requêtes Supabase API/Auth : toujours réseau (données vivantes).
  if (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')) {
    return; // fallback au comportement par défaut
  }

  // SDK Supabase depuis jsDelivr : stale-while-revalidate
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(staleWhileRevalidate(req, CDN_CACHE));
    return;
  }

  // Même origine → app shell : cache-first avec fallback réseau
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, APP_CACHE));
  }
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    // Offline + pas en cache → fallback sur index.html pour les navigations
    if (req.mode === 'navigate') {
      const index = await caches.match('./index.html');
      if (index) return index;
    }
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(resp => {
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Permet à l'app de déclencher un update manuel
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
