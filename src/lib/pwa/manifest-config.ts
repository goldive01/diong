import type { MetadataRoute } from "next";

// Pure data, pulled out of app/manifest.ts so the PWA identity (name, colors,
// icon set) is unit-testable without needing Next's route-convention runtime.
export function buildDiongManifest(): MetadataRoute.Manifest {
  return {
    name: "Diong",
    short_name: "Diong",
    description: "Prime your mind. Act on your goals. Become more.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#1d2420",
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
