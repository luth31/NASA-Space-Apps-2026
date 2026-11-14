import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(root, "data/manifest.json"), "utf8"),
);
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(path.join(directory, e.name))
          : path.join(directory, e.name),
      ),
    )
  ).flat();
}
const assets = (await walk(path.join(root, "assets"))).map(
  (file) => "/" + path.relative(root, file),
);
const selected = manifest.cases
  .flatMap((c) => [
    `/context/${c.id}/${c.date.slice(0, 7)}.json`,
    `/observations/${c.id}/${c.date.slice(0, 7)}.json`,
    `/scenes/${c.id}.json`,
  ])
  .map((file) => "/data" + file);
const urls = [
  "/index.html",
  "/favicon.svg",
  "/data/manifest.json",
  "/data/global.json",
  "/data/models.json",
  "/data/coverage.json",
  "/data/release.json",
  "/data/schema.json",
  ...selected,
  ...assets,
];
const hash = createHash("sha256");
let bytes = 0;
for (const url of urls) {
  const content = await readFile(path.join(root, url));
  bytes += content.length;
  hash.update(url).update(content);
}
const cacheName = "pyrobridge-" + hash.digest("hex").slice(0, 16);
const offline = {
  bundleVersion: manifest.bundleVersion,
  cacheName,
  bytes,
  files: urls.length,
  scope:
    "Global snapshot, three featured case months, complete calendar summaries, methods, provenance and local imagery. Additional month partitions are cached when viewed online.",
};
await writeFile(path.join(root, "offline.json"), JSON.stringify(offline));
const worker = `
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
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('pyrobridge-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
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
await writeFile(path.join(root, "service-worker.js"), worker);
console.log(
  `Offline rehearsal bundle: ${urls.length + 1} files, ${(bytes / 1e6).toFixed(1)} MB. Other months cache on first use.`,
);
