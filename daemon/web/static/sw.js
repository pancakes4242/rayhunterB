/**
 * Rayhunter Service Worker
 *
 * Provides notification support for browser alerts.
 * Note: Service Workers require a secure context (HTTPS or localhost).
 * This file may fail to register when accessed over plain HTTP.
 */

const CACHE_NAME = 'rayhunter-v1';

// Install event - cache essential assets
self.addEventListener('install', () => {
    console.log('Rayhunter Service Worker installing...');
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Rayhunter Service Worker activated');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.notification.tag);
    event.notification.close();

    // Focus or open the Rayhunter window
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Try to focus an existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open a new window if none exists
            if (self.clients.openWindow) {
                return self.clients.openWindow('/');
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event.notification.tag);
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Basic fetch handler - network first, no aggressive caching
// This keeps the service worker minimal and focused on notifications
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // For API requests, always go to network
    if (event.request.url.includes('/api/')) {
        return;
    }

    // For other requests, use network-first strategy
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
