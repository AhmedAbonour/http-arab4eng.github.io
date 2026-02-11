// Service Worker for مؤسسة النور PWA
const CACHE_NAME = 'noor-services-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/pages/furniture.html',
  '/pages/ac.html',
  '/pages/contact.html',
  '/pages/privacy.html',
  '/src/style.css',
  '/src/main.js',
  '/images/logo.jpg',
  '/images/furniture-moving.jpg',
  '/images/furniture-disassembly.jpg',
  '/images/furniture-wrapping.jpg',
  '/images/furniture-assembly.jpg',
  '/images/ac-installation.jpg',
  '/images/ac-disassembly.jpg',
  '/images/ac-moving.jpg',
  '/images/ac-cleaning.jpg',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Cache error:', err);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache the response
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Return cached version if network fails
        return caches.match(event.request)
          .then(response => {
            return response || new Response('Offline - Page not cached', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for notifications
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-services') {
    event.waitUntil(updateServices());
  }
});

// Helper functions
function syncMessages() {
  return Promise.resolve();
}

function updateServices() {
  return fetch('/api/services')
    .then(response => response.json())
    .then(data => {
      // Update services data
      console.log('Services updated:', data);
    })
    .catch(err => {
      console.log('Update error:', err);
    });
}

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'جديد من مؤسسة النور',
    icon: '/images/logo.jpg',
    badge: '/images/logo.jpg',
    tag: 'noor-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'فتح'
      },
      {
        action: 'close',
        title: 'إغلاق'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'مؤسسة النور', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
