import type { MetadataRoute } from "next";
import { buildDiongManifest } from "@/src/lib/pwa/manifest-config";

// Served automatically at /manifest.webmanifest, with Next.js auto-injecting
// the <link rel="manifest"> tag — no manual reference needed in layout
// metadata. See docs/PWA_PERFORMANCE.md for the full PWA foundation.
export default function manifest(): MetadataRoute.Manifest {
  return buildDiongManifest();
}
