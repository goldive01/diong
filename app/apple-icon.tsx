import { ImageResponse } from "next/og";
import { brandMonogram } from "@/src/lib/pwa/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(brandMonogram(96), size);
}
