// Diong service worker — minimal PWA foundation (Pass 8, Step 1).
//
// Scope: caches ONLY the exact static, public, non-authenticated paths
// listed in STATIC_ASSETS below. Every other request — every app page, every
// Supabase RPC/API call, and in particular every authenticated Goals /
// Habits / Journal / direct-message request — is left completely alone and
// goes straight to the network. This worker never calls respondWith() for
// anything outside that fixed allowlist, so it cannot serve stale or private
// data offline. See docs/PWA_PERFORMANCE.md for the full rationale.

const CACHE_NAME = "diong-static-v1";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icons/icon-192", "/icons/icon-512"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const path = new URL(request.url).pathname;
  if (!STATIC_ASSETS.includes(path)) return;

  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
