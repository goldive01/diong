import { describe, expect, it } from "vitest";
import { buildDiongManifest } from "./manifest-config";

describe("buildDiongManifest", () => {
  it("carries the Diong identity: name, tagline description, standalone display", () => {
    const manifest = buildDiongManifest();
    expect(manifest.name).toBe("Diong");
    expect(manifest.short_name).toBe("Diong");
    expect(manifest.description).toBe("Prime your mind. Act on your goals. Become more.");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("declares installable 192x192 and 512x512 PNG icons", () => {
    const manifest = buildDiongManifest();
    expect(manifest.icons?.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of manifest.icons ?? []) {
      expect(icon.type).toBe("image/png");
    }
  });
});
