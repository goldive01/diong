import { describe, expect, it } from "vitest";
import { buildCommentThread } from "./post-data";
import type { PostCommentRow } from "@/src/types/database";

function row(overrides: Partial<PostCommentRow>): PostCommentRow {
  return {
    id: 1,
    parent_comment_id: null,
    user_id: "u",
    author_username: "u",
    author_display_name: "U",
    body: "hi",
    created_at: "2026-09-10T10:00:00.000Z",
    edited_at: null,
    is_deleted: false,
    is_author: false,
    ...overrides,
  };
}

describe("buildCommentThread", () => {
  it("groups replies under their root, one level only", () => {
    const rows = [
      row({ id: 1, parent_comment_id: null }),
      row({ id: 2, parent_comment_id: 1 }),
      row({ id: 3, parent_comment_id: 1 }),
      row({ id: 4, parent_comment_id: null }),
    ];
    const thread = buildCommentThread(rows);
    expect(thread.map((n) => n.comment.id)).toEqual([1, 4]);
    expect(thread[0].replies.map((r) => r.id)).toEqual([2, 3]);
    expect(thread[1].replies).toEqual([]);
  });

  it("carries the deleted tombstone flag through", () => {
    const thread = buildCommentThread([
      row({ id: 1, is_deleted: true, body: null }),
      row({ id: 2, parent_comment_id: 1 }),
    ]);
    expect(thread[0].comment.isDeleted).toBe(true);
    expect(thread[0].comment.body).toBeNull();
    expect(thread[0].replies).toHaveLength(1);
  });

  it("drops a reply whose root is absent from the page", () => {
    const thread = buildCommentThread([row({ id: 9, parent_comment_id: 99 })]);
    expect(thread).toEqual([]);
  });
});
