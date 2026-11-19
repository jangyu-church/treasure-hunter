const CACHE_NAME = 'treasure-hunter-x-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // 실시간 Firebase 통신이 항상 최신 데이터를 가져오도록 네트워크 우선(Network-first) 처리
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
