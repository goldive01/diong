import type { CommentNode } from "@/src/lib/social/post-data";
import { commentLabel } from "@/src/lib/social/post-labels";
import { CommentForm } from "@/src/components/social/comment-form";
import { CommentCard } from "@/src/components/social/comment-card";
import { submitComment } from "@/app/(protected)/posts/actions";

// The comment section for the post detail page: a labelled composer, then the
// thread (top-level comments, each with one reply level), oldest first.
export function CommentThread({
  postId,
  nodes,
  liveCommentCount,
}: {
  postId: number;
  nodes: CommentNode[];
  liveCommentCount: number;
}) {
  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mt-6 rounded-3xl border border-[#ded7c9] bg-[#faf8f3] p-5 sm:p-6"
    >
      <h2 id="comments-heading" className="text-lg font-semibold">
        {commentLabel(liveCommentCount)}
      </h2>

      <CommentForm
        action={submitComment.bind(null, postId, null)}
        label="Add a comment"
        fieldId="new-comment"
        submitLabel="Comment"
      />

      {nodes.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {nodes.map((node) => (
            <li key={node.comment.id}>
              <CommentCard node={node} postId={postId} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-[#68716b]">
          No comments yet. Be the first to add a supportive, useful thought.
        </p>
      )}
    </section>
  );
}
