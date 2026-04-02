/* Mobile Zone — minimal service worker: installable PWA, network-first (no stale shell delays). */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `mobile-zone-static-${CACHE_VERSION}`;
const NAV_CACHE = `mobile-zone-nav-${CACHE_VERSION}`;

function isStaticAsset(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon.ico" ||
    /\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?)$/i.test(pathname)
  );
}
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNavigate = request.mode === "navigate";
  const offlineHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title><style>body{font-family:system-ui;background:#09090b;color:#e4e4e7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}p{text-align:center;max-width:18rem;line-height:1.5}</style></head><body><p>You&apos;re offline. Check your connection and try again.</p></body></html>`;

  // Static assets: cache-first (faster + usable offline after first load).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches
        .open(STATIC_CACHE)
        .then(async (cache) => {
          const cached = await cache.match(request);
          if (cached) return cached;
          const res = await fetch(request);
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => Response.error())
    );
    return;
  }

  // Navigations: network-first, but if offline show last cached page (or a fallback offline page).
  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res && res.ok) {
            const cache = await caches.open(NAV_CACHE);
            cache.put(request, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(NAV_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(offlineHtml, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // Everything else: keep the current behavior (network-first).
  event.respondWith(fetch(request).catch(() => Response.error()));
});
