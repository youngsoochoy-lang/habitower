// Habitower online: keeps the app shell, 3D models and libraries on the phone, so it opens fast and offline.
// Pages and data (office.html, data/*.json, cloud.js) are fetched fresh when online and fall back to the copy;
// models and CDN libraries (pinned versions, never change) come from the copy first. Supabase calls are never cached.
const CACHE = 'habitower-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co') || url.pathname.includes('/auth/')) return;
  const pinned = url.hostname === 'cdn.jsdelivr.net' || /\.(glb|png|woff2?)$/.test(url.pathname);
  if (url.origin !== location.origin && !pinned) return;
  e.respondWith(pinned ? fromCacheFirst(req) : fromNetworkFirst(req));
});
async function fromCacheFirst(req) {
  const hit = await caches.match(req); if (hit) return hit;
  const res = await fetch(req); if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}
async function fromNetworkFirst(req) {
  try { const res = await fetch(req); if (res.ok) (await caches.open(CACHE)).put(req, res.clone()); return res; }
  catch (err) { const hit = await caches.match(req, { ignoreSearch: true }); if (hit) return hit; throw err; }
}
