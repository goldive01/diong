# Diong PWA & Performance Foundation — Pass 8, Step 1

This document covers the **first step only** of Pass 8: fixing the
`next/image` "fill" warnings, the `scroll-behavior` warning, the repeated
`/sw.js` 404, and laying a minimal, production-safe PWA foundation
(manifest, icons, service worker). It does **not** cover database
performance, N+1 query work, a full accessibility audit, error boundaries,
deployment, analytics, push notifications or offline data sync — those are
explicitly deferred to a later Pass 8 step or Pass 9.

No database migration was needed for this step. Nothing here touches RLS,
RPCs, or any existing table.

## 1. Next/Image `fill` + `sizes` audit

Every `next/image` usage with the `fill` prop now carries an explicit
`sizes` prop, so the browser can pick the right responsive image source
instead of Next.js warning and falling back to a full-viewport assumption.

| File | Usage | `sizes` |
| --- | --- | --- |
| `src/components/media/post-media-grid.tsx` | grid tile | `(max-width: 640px) 100vw, 640px` (already present) |
| `src/components/media/post-media-grid.tsx` | lightbox | `90vw` (already present) |
| `src/components/media/post-media-editor.tsx` | edit-form thumbnail (`grid-cols-2 sm:grid-cols-4`) | `(max-width: 640px) 50vw, 25vw` |
| `src/components/media/post-image-picker.tsx` | staged-upload thumbnail (same grid) | `(max-width: 640px) 50vw, 25vw` |
| `src/components/media/image-upload-field.tsx` | avatar preview (`shape="circle"`, fixed 80px) | `80px` |
| `src/components/media/image-upload-field.tsx` | cover preview (`shape="banner"`, full width) | `(max-width: 640px) 100vw, 640px` |
| `app/(protected)/profile/[username]/page.tsx` | profile cover | `768px` (already present) |
| `app/(protected)/communities/[slug]/page.tsx` | community cover | `640px` (already present) |

`src/components/media/avatar.tsx` uses fixed `width`/`height`, not `fill`,
so it was never affected.

`unoptimized` is used in exactly one place — `post-image-picker.tsx`'s
staged-image preview — because that `<Image>` points at a local
`URL.createObjectURL()` blob before the file has been uploaded to Storage;
there is no remote URL for Next's image optimizer to fetch. It now also
carries `sizes` alongside `unoptimized`. No other `unoptimized` usage was
added.

## 2. `scroll-behavior` warning

`app/globals.css` sets `html { scroll-behavior: smooth; }` (kept — this is
the deliberate calm/purposeful smooth scrolling described in the brand
personality, not accidental). Next.js's App Router turns on native scroll
restoration by default, which conflicts with CSS `scroll-behavior: smooth`
during route transitions unless the app opts in explicitly. The supported
fix is the `data-scroll-behavior="smooth"` attribute on `<html>`
(`app/layout.tsx`), which tells Next.js's scroll-restoration logic to
respect the CSS smooth-scroll instead of warning about it. No CSS was
removed.

## 3. `/sw.js` 404

No file in the repository requested `/sw.js` before this pass — there was
no service worker registration anywhere in the codebase and no
`public/sw.js` file. The repeated 404 in a dev browser session is best
explained as a **stale service-worker update check**: once a browser tab has
ever registered a service worker at `/sw.js` for this origin (e.g. from
earlier manual testing), the browser keeps re-fetching that exact URL on
navigation to check for updates, independent of whatever the current page's
code does. Serving a real file at `/sw.js` (below) resolves that 404
regardless of the exact history that caused it.

## 4. PWA foundation

### Manifest

`app/manifest.ts` is a Next.js App Router metadata route — it is served
automatically at `/manifest.webmanifest`, and Next.js auto-injects the
`<link rel="manifest">` tag into every page's `<head>`; nothing in
`app/layout.tsx` references it directly. The manifest's data lives in
`src/lib/pwa/manifest-config.ts` (`buildDiongManifest()`), a plain function
so it is unit-tested (`src/lib/pwa/manifest-config.test.ts`) without needing
Next's route-convention runtime.

```json
{
  "name": "Diong",
  "short_name": "Diong",
  "description": "Prime your mind. Act on your goals. Become more.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f7f4ee",
  "theme_color": "#1d2420",
  "icons": [
    { "src": "/icons/icon-192", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`background_color`/`theme_color` reuse the app's existing brand colors
(`--background: #f7f4ee`, `--foreground: #1d2420` in `app/globals.css`,
and the same `#1d2420` already used for the skip-to-content pill). The root
layout also sets `viewport.themeColor` (`app/layout.tsx`) so the browser
chrome / address bar matches outside of PWA installs too.

### Icons

No Diong-branded image asset existed anywhere in the repo — only the
default `create-next-app` placeholder SVGs (`public/*.svg`, all Next.js/
Vercel starter artwork) and the default `app/favicon.ico`. Per the Pass 8
instruction not to invent third-party artwork, none of those were reused as
Diong's icon. Instead, every icon is **code-generated** with Next.js's
built-in `next/og` `ImageResponse` (no new dependency) from one shared
JSX monogram (`src/lib/pwa/brand-icon.tsx`): a rounded "D" in the app's own
`#1d2420`/`#f7f4ee` palette.

| File | Route | Size | Purpose |
| --- | --- | --- | --- |
| `app/icon.tsx` | `/icon` (auto favicon) | 32×32 | Browser tab icon |
| `app/apple-icon.tsx` | `/apple-icon` | 180×180 | iOS home-screen icon |
| `app/icons/icon-192/route.tsx` | `/icons/icon-192` | 192×192 | Manifest install icon |
| `app/icons/icon-512/route.tsx` | `/icons/icon-512` | 512×512 | Manifest install icon |

**This is a placeholder, not final production artwork.** Before release,
replace the monogram with real designed artwork and add, at minimum:

- A proper maskable icon (512×512, content inside the ~80% safe zone) —
  the current icons are `purpose: "any"` only; a true maskable variant is
  still needed for Android's adaptive-icon masking.
- A designed (not code-generated) favicon/app-icon set if the brand wants
  more than a monogram — standard sizes: 16×16, 32×32, 180×180 (apple
  touch), 192×192, 512×512, plus an `og:image` (1200×630) for link
  previews, which is out of scope for this step.

### Service worker

`public/sw.js` is intentionally minimal and matches the V1 goals in the
Pass 8 brief:

- **Installs and activates successfully**, no 404.
- **Caches only three fixed, public, unauthenticated paths**:
  `/manifest.webmanifest`, `/icons/icon-192`, `/icons/icon-512`. The
  `fetch` handler checks the request's path against that exact allowlist
  and calls `event.respondWith()` only for a match — every other request
  (every app page, every Supabase RPC call, and in particular every
  authenticated Goals / Habits / Journal / direct-message request) is left
  completely untouched and goes straight to the network, exactly as if the
  service worker were not installed.
- **No offline private-data persistence, no stale-authenticated-HTML
  strategy, no precached app shell** — deliberately, since Diong's
  authenticated pages must never be served stale from cache.
- `activate` clears any cache from a previous `CACHE_NAME`, so a future
  change to the static-asset allowlist doesn't accumulate stale caches.

`src/components/pwa/service-worker-registration.tsx` is a small client
component (rendered once in `app/layout.tsx`) that calls
`navigator.serviceWorker.register("/sw.js")`, gated to
`process.env.NODE_ENV === "production"` — registering in dev would put a
service worker in the request loop with Turbopack's Fast Refresh/HMR for no
benefit, since dev never needs an installable app shell. A failed
registration is swallowed and never blocks the app.

### Privacy implications

- The service worker cannot see or cache Prime Protocol content, Goals,
  Habits, Journal entries, direct messages, notifications, or any other
  authenticated response — its `fetch` handler only intercepts the three
  static paths listed above.
- No IndexedDB/Cache Storage is used to persist any user data for offline
  use in this step. "Offline" currently means: the three static assets may
  serve from cache if the network is unavailable; every other request fails
  normally when offline, exactly as it would without a service worker.
- Push notifications and background/offline sync are **not** implemented —
  deferred, per the Pass 8 instructions, to a later pass. The service
  worker has no `push` or `sync` event listener.

## 5. Deferred (explicitly out of scope for this step)

- Database performance / N+1 query optimization.
- Full accessibility audit.
- Error boundaries.
- Deployment changes.
- Analytics.
- Push notifications (`push` event, `Notification` API, subscription
  storage).
- Offline data sync (background sync, IndexedDB queueing of writes made
  while offline).
- Designed production icon set (see "Icons" above).
