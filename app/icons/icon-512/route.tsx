import { ImageResponse } from "next/og";
import { brandMonogram } from "@/src/lib/pwa/brand-icon";

export async function GET() {
  return new ImageResponse(brandMonogram(280), { width: 512, height: 512 });
}
