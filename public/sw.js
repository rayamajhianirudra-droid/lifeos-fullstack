const CACHE_NAME = 'lifeos-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('LifeOS PWA: Caching app shell');
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

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
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