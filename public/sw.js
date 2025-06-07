const CACHE_NAME = 'safeconnect-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
  '/logosc.png'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate SW
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch with network-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              if (event.request.method === 'GET') {
                cache.put(event.request, responseToCache);
              }
            });
        }
        
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Bạn có thông báo mới từ SafeConnect',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Xem chi tiết'
      },
      {
        action: 'close',
        title: 'Đóng'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SafeConnect', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/map')
    );
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sos') {
    event.waitUntil(
      // Implement background sync logic here
      Promise.resolve()
    );
  }
});