// DriveGuard AI Service Worker for basic PWA caching
const CACHE_NAME = 'driveguard-ai-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch for camera and AI API endpoints
  if (event.request.url.includes('/api/')) {
    return;
  }
});
