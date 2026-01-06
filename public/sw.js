// YOMI Service Worker
// Cache-First for static assets, Network-First for API

const CACHE_NAME = 'yomi-v1';
const STATIC_CACHE = 'yomi-static-v1';
const DICT_CACHE = 'yomi-dict-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
];

// Dictionary files - cache on first use
const DICT_PATTERN = /\/dict\/.+\.dat\.gz$/;

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('yomi-') && name !== STATIC_CACHE && name !== DICT_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control immediately
    self.clients.claim();
});

// Fetch event - routing strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Dictionary files: Cache-First (these are static and large)
    if (DICT_PATTERN.test(url.pathname)) {
        event.respondWith(
            caches.open(DICT_CACHE).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    if (cached) {
                        return cached;
                    }
                    return fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                });
            })
        );
        return;
    }

    // API requests: Network-First with no cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                });
            })
        );
        return;
    }

    // Static assets (JS, CSS, images): Stale-While-Revalidate
    if (
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|eot)$/) ||
        url.pathname.startsWith('/_next/')
    ) {
        event.respondWith(
            caches.open(STATIC_CACHE).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    const fetchPromise = fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                    return cached || fetchPromise;
                });
            })
        );
        return;
    }

    // HTML pages: Network-First with offline fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful HTML responses
                if (response.ok && event.request.headers.get('accept')?.includes('text/html')) {
                    const responseClone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('/offline.html');
                });
            })
    );
});

// Background sync for vocabulary (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-vocab') {
        console.log('[SW] Syncing vocabulary...');
    }
});
