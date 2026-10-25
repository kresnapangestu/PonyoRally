/*
 * Ponyo Rally service worker: keeps the app opening with no signal.
 * Data never goes through here (it lives in localStorage); this only caches
 * the app's own files.
 *  - Pages: network first, so updates arrive; the cached copy when offline.
 *  - Built assets (/_next/static, /brand, /icons): cache first; their names
 *    change on every build, so they never go stale.
 * Bump CACHE when this file's behaviour changes.
 */
const CACHE = "ponyo-v1";
const PAGES = ["/", "/new", "/tournament", "/settings", "/404.html"];
const ASSET_PATTERN = /\/_next\/static\/[^"'\s)]+/g;

/** Caches a page plus every built asset it references, so it works offline from day one. */
async function precachePage(cache, path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) return;
  await cache.put(path, response.clone());
  const html = await response.text();
  const assets = [...new Set(html.match(ASSET_PATTERN) ?? [])];
  await Promise.allSettled(assets.map((asset) => cache.add(asset)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled([...PAGES.map((p) => precachePage(cache, p)), cache.add("/brand/splash.webp")]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Page cache key without the query: /tournament?id=… is one page. */
const pageKey = (url) => url.pathname.replace(/\/$/, "") || "/";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(pageKey(url), copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(pageKey(url))) ?? (await caches.match("/404.html")) ?? Response.error()),
    );
    return;
  }

  const isAsset = /^\/(_next\/static|brand|icons)\//.test(url.pathname);
  if (isAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
