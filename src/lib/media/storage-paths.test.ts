import { describe, expect, it } from "vitest";
import {
  buildAvatarPath,
  buildCommunityAvatarPath,
  buildCommunityCoverPath,
  buildCoverPath,
  buildPostMediaPath,
  extensionForMimeType,
  isOwnedPath,
} from "./storage-paths";

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

describe("extensionForMimeType", () => {
  it("maps allowed mime types to their extension", () => {
    expect(extensionForMimeType("image/jpeg")).toBe("jpg");
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/webp")).toBe("webp");
  });

  it("returns null for unsupported mime types", () => {
    expect(extensionForMimeType("image/gif")).toBeNull();
    expect(extensionForMimeType("application/pdf")).toBeNull();
    expect(extensionForMimeType("")).toBeNull();
  });
});

describe("buildAvatarPath", () => {
  it("builds a profiles/<userId>/avatar/<uuid>.<ext> path", () => {
    const path = buildAvatarPath("user-1", "image/png");
    expect(path).toMatch(new RegExp(`^profiles/user-1/avatar/${UUID_RE}\\.png$`));
  });

  it("returns null for an unsupported mime type", () => {
    expect(buildAvatarPath("user-1", "image/gif")).toBeNull();
  });
});

describe("buildCoverPath", () => {
  it("builds a profiles/<userId>/cover/<uuid>.<ext> path", () => {
    const path = buildCoverPath("user-1", "image/jpeg");
    expect(path).toMatch(new RegExp(`^profiles/user-1/cover/${UUID_RE}\\.jpg$`));
  });

  it("returns null for an unsupported mime type", () => {
    expect(buildCoverPath("user-1", "application/pdf")).toBeNull();
  });
});

describe("buildPostMediaPath", () => {
  it("builds a posts/<userId>/<postId>/<uuid>.<ext> path", () => {
    const path = buildPostMediaPath("user-1", 42, "image/webp");
    expect(path).toMatch(new RegExp(`^posts/user-1/42/${UUID_RE}\\.webp$`));
  });

  it("accepts a string postId", () => {
    const path = buildPostMediaPath("user-1", "abc", "image/png");
    expect(path).toMatch(new RegExp(`^posts/user-1/abc/${UUID_RE}\\.png$`));
  });

  it("returns null for an unsupported mime type", () => {
    expect(buildPostMediaPath("user-1", 42, "image/gif")).toBeNull();
  });
});

describe("buildCommunityAvatarPath", () => {
  it("builds a communities/<ownerId>/<communityId>/avatar/<uuid>.<ext> path", () => {
    const path = buildCommunityAvatarPath("owner-1", 7, "image/png");
    expect(path).toMatch(new RegExp(`^communities/owner-1/7/avatar/${UUID_RE}\\.png$`));
  });

  it("returns null for an unsupported mime type", () => {
    expect(buildCommunityAvatarPath("owner-1", 7, "image/svg+xml")).toBeNull();
  });
});

describe("buildCommunityCoverPath", () => {
  it("builds a communities/<ownerId>/<communityId>/cover/<uuid>.<ext> path", () => {
    const path = buildCommunityCoverPath("owner-1", 7, "image/jpeg");
    expect(path).toMatch(new RegExp(`^communities/owner-1/7/cover/${UUID_RE}\\.jpg$`));
  });

  it("returns null for an unsupported mime type", () => {
    expect(buildCommunityCoverPath("owner-1", 7, "application/pdf")).toBeNull();
  });
});

describe("isOwnedPath", () => {
  it("is true when the path starts with the exact expected prefix", () => {
    expect(isOwnedPath("profiles/user-1/avatar/x.png", "profiles/user-1/")).toBe(true);
  });

  it("is false when the path has a different prefix", () => {
    expect(isOwnedPath("profiles/user-2/avatar/x.png", "profiles/user-1/")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isOwnedPath("Profiles/user-1/avatar/x.png", "profiles/user-1/")).toBe(false);
  });

  it("is false for null, undefined and empty paths", () => {
    expect(isOwnedPath(null, "profiles/user-1/")).toBe(false);
    expect(isOwnedPath(undefined, "profiles/user-1/")).toBe(false);
    expect(isOwnedPath("", "profiles/user-1/")).toBe(false);
  });
});
