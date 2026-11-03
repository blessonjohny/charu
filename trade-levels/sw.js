/* Trade Levels service worker: caches the app itself so it opens fast and offline.
   Price data requests (other websites) always go to the network and are never cached. */
const CACHE = "trade-levels-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== location.origin) {
    // Google Fonts only: keep a copy so the text looks the same offline. Everything else goes straight to the network.
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      e.respondWith(caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      }));
    }
    return;
  }
  // The app: network first so updates arrive, cache when offline.
  e.respondWith(fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req).then((m) => m || caches.match("./index.html"))));
});
