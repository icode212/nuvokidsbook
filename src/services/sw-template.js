const CACHE = 'nuvo-shell-__SHELL_VERSION__';
const SHELL = __SHELL_FILES__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('nuvo-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    // Pages redirects /index.html to /. Cache the canonical navigation response,
    // because returning a redirected Response to an offline reload is rejected.
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('/', { ignoreVary: true }))));
  } else if (SHELL.includes(url.pathname)) {
    // These are immutable same-origin build assets. Vite/Pages may emit Vary: Origin;
    // module requests carry Origin while install-time precache requests do not.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request, { ignoreVary: true })).then(cached => cached || fetch(event.request)));
  }
});
