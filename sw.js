// VetHelper Service Worker v1.1.0
const CACHE_NAME = 'vethelper-v2';
const OFFLINE_URL = '/';

// Ресурсы для предварительного кэширования
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Установка — кэшируем основные ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегия: Network First с fallback на кэш
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Не кэшируем API-запросы
  if (request.url.includes('api.vetpodobed.pro') ||
      request.url.includes('webhook') ||
      request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Кэшируем только успешные ответы с того же origin
        if (response.ok && response.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // При ошибке сети — берём из кэша
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Обработка share_target — приём данных через Web Share Target
self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('/share-target') && event.request.method === 'POST') {
    event.respondWith(Response.redirect('/?shared=true', 303));
  }
});
