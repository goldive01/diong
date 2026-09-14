import { ImageResponse } from "next/og";
import { brandMonogram } from "@/src/lib/pwa/brand-icon";

// Standalone route (rather than a manifest.ts-only reference) so the 192x192
// PWA install icon has a stable, directly fetchable URL independent of the
// favicon/apple-icon conventions above.
export async function GET() {
  return new ImageResponse(brandMonogram(104), { width: 192, height: 192 });
}
