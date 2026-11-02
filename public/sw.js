// Bump the version whenever the caching rules change so old caches are dropped.
const CACHE_NAME = 'lifeos-v2';
// Only files that exist in every build. Built JS/CSS have hashed names, so they
// are cached on first use by the fetch handler instead of listed here. (v1 listed
// /static/js/bundle.js, which only exists in dev, so install always failed.)
const urlsToCache = [
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// FETCH - Network first, cache fallback
self.addEventListener('fetch', event => {
  // Skip API calls - always use network for data
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('localhost:8080') ||
      event.request.url.includes('nal.usda.gov') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Only GET requests for static files are cached. Pages (HTML) are never cached,
  // so users always get the newest deploy; cached files are an offline fallback.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic' ||
            event.request.mode === 'navigate') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// PUSH NOTIFICATIONS
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Time to log your meal!',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
  };
  event.waitUntil(
    self.registration.showNotification('LifeOS Health', options)
  );
});