/* Mobile Zone — minimal service worker: installable PWA, network-first (no stale shell delays). */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request).catch(() => {
      if (request.mode === "navigate") {
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title><style>body{font-family:system-ui;background:#09090b;color:#e4e4e7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}p{text-align:center;max-width:18rem;line-height:1.5}</style></head><body><p>You&apos;re offline. Check your connection and try again.</p></body></html>`,
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      return Response.error();
    })
  );
});
