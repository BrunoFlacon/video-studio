self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('videostudio-v1').then(cache =>
      cache.addAll([
        './',
        './index.php',
        'assets/css/editor.css',
        'assets/js/core/timeline.js'
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
