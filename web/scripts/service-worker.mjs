export function createServiceWorker({ cacheName, bundleVersion, urls }) {
  const manifest = { bundleVersion };
  return `
const CACHE = ${JSON.stringify(cacheName)};
const VERSION = ${JSON.stringify(manifest.bundleVersion)};
const CORE = ${JSON.stringify([...urls, "/offline.json"])};
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Bound concurrency so an initial visit does not compete with every file.
    let next = 0;
    await Promise.all(Array.from({length: 4}, async () => {
      while (next < CORE.length) {
        const url = CORE[next++];
        const response = await fetch(new Request(url, {cache: 'reload'}));
        if (!response.ok) throw new Error('Offline asset unavailable: ' + url);
        await cache.put(url, response);
      }
    }));
    // The new bundle is complete. Do not leave it waiting behind open tabs.
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter(name => name.startsWith('pyrobridge-') && name !== CACHE);
    await self.clients.claim();
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    // Older app versions have no update listener. Navigate them from the worker
    // so their HTML, lazy chunks and science data all use the same new bundle.
    // Navigation fetches wait for activation. Starting them is safe; awaiting
    // them here would deadlock activation against its own pending navigations.
    if (previous.length) for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) client.navigate(client.url).catch(() => {});
    }
    for (const name of previous) await caches.delete(name);
    for (const client of await self.clients.matchAll()) client.postMessage({type: 'PYROBRIDGE_OFFLINE_STATUS', version: VERSION, ready: true});
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'OFFLINE_STATUS') event.source?.postMessage({type: 'PYROBRIDGE_OFFLINE_STATUS', version: VERSION, ready: true});
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // The worker and its own status must always remain updateable.
  if (url.pathname === '/service-worker.js') return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('/index.html')) || fetch(event.request);
    })());
    return;
  }
  if (!url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/data/') && url.pathname !== '/offline.json' && url.pathname !== '/favicon.svg') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(event.request);
    if (saved) return saved;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
`;
}
