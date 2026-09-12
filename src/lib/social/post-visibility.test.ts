import { describe, expect, it } from "vitest";
import { canViewPost } from "./post-visibility";

const AUTHOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VIEWER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("canViewPost", () => {
  it("the author always sees their own live post, any visibility", () => {
    for (const visibility of ["public", "followers", "private"] as const) {
      expect(
        canViewPost({ viewerId: AUTHOR, authorId: AUTHOR, visibility }),
      ).toBe(true);
    }
  });

  it("a deleted post is visible to nobody, including the author", () => {
    expect(
      canViewPost({
        viewerId: AUTHOR,
        authorId: AUTHOR,
        visibility: "public",
        deleted: true,
      }),
    ).toBe(false);
  });

  it("public: any viewer with no block", () => {
    expect(
      canViewPost({ viewerId: VIEWER, authorId: AUTHOR, visibility: "public" }),
    ).toBe(true);
  });

  it("followers: only a current follower", () => {
    expect(
      canViewPost({
        viewerId: VIEWER,
        authorId: AUTHOR,
        visibility: "followers",
        viewerFollowsAuthor: false,
      }),
    ).toBe(false);
    expect(
      canViewPost({
        viewerId: VIEWER,
        authorId: AUTHOR,
        visibility: "followers",
        viewerFollowsAuthor: true,
      }),
    ).toBe(true);
  });

  it("private: nobody but the author", () => {
    expect(
      canViewPost({
        viewerId: VIEWER,
        authorId: AUTHOR,
        visibility: "private",
        viewerFollowsAuthor: true,
      }),
    ).toBe(false);
  });

  it("a block in either direction hides a public post", () => {
    expect(
      canViewPost({
        viewerId: VIEWER,
        authorId: AUTHOR,
        visibility: "public",
        blockedBetween: true,
      }),
    ).toBe(false);
    expect(
      canViewPost({
        viewerId: VIEWER,
        authorId: AUTHOR,
        visibility: "followers",
        viewerFollowsAuthor: true,
        blockedBetween: true,
      }),
    ).toBe(false);
  });

  it("rejects missing ids", () => {
    expect(
      canViewPost({ viewerId: "", authorId: AUTHOR, visibility: "public" }),
    ).toBe(false);
  });
});
