import { ImageResponse } from "next/og";
import { brandMonogram } from "@/src/lib/pwa/brand-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(brandMonogram(20), size);
}
