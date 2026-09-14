"use client";

import { useEffect } from "react";

// Registers the minimal static-asset service worker (public/sw.js).
// Production only: registering in dev would put a service worker in the
// loop with Fast Refresh / HMR for no benefit, since dev never needs an
// installable app shell. A failed registration never blocks the app.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
