"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { CommentNode, PostCommentView } from "@/src/lib/social/post-data";
import { PostTimestamp } from "@/src/components/social/post-timestamp";
import { CommentForm } from "@/src/components/social/comment-form";
import {
  deleteCommentAction,
  editCommentAction,
  submitComment,
} from "@/app/(protected)/posts/actions";

function CommentBody({ comment }: { comment: PostCommentView }) {
  if (comment.isDeleted || comment.body === null) {
    return (
      <p className="mt-1 text-sm italic text-[#8b9384]">Comment removed</p>
    );
  }
  return (
    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#38423b]">
      {comment.body}
    </p>
  );
}

function SingleComment({
  comment,
  postId,
  onReplyClick,
  canReply,
}: {
  comment: PostCommentView;
  postId: number;
  onReplyClick?: () => void;
  canReply: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const deleted = comment.isDeleted || comment.body === null;

  function onDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteCommentAction(postId, comment.id);
      if (result.status === "error") setError(result.message);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <Link
          href={`/profile/${comment.authorUsername}`}
          className="font-semibold text-[#1d2420] hover:underline"
        >
          {comment.authorDisplayName}
        </Link>
        <span className="text-[#657052]">@{comment.authorUsername}</span>
        <span aria-hidden="true" className="text-[#c3bdae]">
          ·
        </span>
        <PostTimestamp
          iso={comment.createdAt}
          edited={Boolean(comment.editedAt)}
          className="text-xs text-[#7a8378]"
        />
      </div>

      {editing && !deleted ? (
        <CommentForm
          action={editCommentAction.bind(null, postId, comment.id)}
          label="Edit your comment"
          fieldId={`edit-comment-${comment.id}`}
          initialBody={comment.body ?? ""}
          submitLabel="Save"
          pendingLabel="Saving…"
          autoFocus
          compact
          onCancel={() => setEditing(false)}
          onSuccess={() => setEditing(false)}
        />
      ) : (
        <CommentBody comment={comment} />
      )}

      {!editing && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold">
          {canReply && onReplyClick && !deleted && (
            <button
              type="button"
              onClick={onReplyClick}
              className="min-h-9 rounded-full px-2.5 py-1 text-[#57615a] transition hover:bg-[#f2efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
            >
              Reply
            </button>
          )}
          {comment.isAuthor && !deleted && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-9 rounded-full px-2.5 py-1 text-[#57615a] transition hover:bg-[#f2efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="min-h-9 rounded-full px-2.5 py-1 text-[#6b746d] transition hover:text-[#9b3f37] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
              >
                {pending ? "Removing…" : "Delete"}
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1 text-xs text-[#9b3f37]">
          {error}
        </p>
      )}
    </div>
  );
}

// One top-level comment and its single reply level. `canReply` is false when the
// viewer cannot act on the post (e.g. their own private post has no audience, or
// the thread is shown read-only).
export function CommentCard({
  node,
  postId,
  canReply = true,
}: {
  node: CommentNode;
  postId: number;
  canReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <article className="rounded-2xl border border-[#e4ded2] bg-white p-4">
      <SingleComment
        comment={node.comment}
        postId={postId}
        canReply={canReply}
        onReplyClick={() => setReplying((v) => !v)}
      />

      {replying && (
        <CommentForm
          action={submitComment.bind(null, postId, node.comment.id)}
          label={`Reply to ${node.comment.authorDisplayName}`}
          fieldId={`reply-${node.comment.id}`}
          submitLabel="Reply"
          pendingLabel="Posting…"
          autoFocus
          compact
          onCancel={() => setReplying(false)}
          onSuccess={() => setReplying(false)}
        />
      )}

      {node.replies.length > 0 && (
        <ul className="mt-3 space-y-3 border-l border-[#e4ded2] pl-3 sm:pl-4">
          {node.replies.map((reply) => (
            <li key={reply.id}>
              <SingleComment
                comment={reply}
                postId={postId}
                canReply={false}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
