"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  INITIAL_DELETE_POST_STATE,
  type DeletePostState,
} from "@/src/lib/social/post-form-state";
import { deletePostAction } from "@/app/(protected)/posts/actions";

// Edit link + delete-with-confirm for the author's own post. Delete is a soft
// delete on the server; on success the action redirects to /feed.
export function PostOwnerActions({ postId }: { postId: number }) {
  const action = deletePostAction.bind(null, postId);
  const [state, formAction, pending] = useActionState(
    (s: DeletePostState) => action(s),
    INITIAL_DELETE_POST_STATE,
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <Link
        href={`/posts/${postId}/edit`}
        className="min-h-11 rounded-full px-3 py-2 font-semibold text-[#4d574f] transition hover:bg-[#f2efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
      >
        Edit
      </Link>

      {confirming ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[#5f6962]">Delete this post?</span>
          <form action={formAction}>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-full bg-[#8c3527] px-4 font-semibold text-white transition hover:bg-[#75291d] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c3527]"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-full border border-[#cfc8bb] px-4 font-semibold text-[#3e4a41] hover:bg-white"
          >
            Keep
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 rounded-full px-3 py-2 font-semibold text-[#6b746d] transition hover:text-[#9b3f37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
        >
          Delete
        </button>
      )}

      {state.status === "error" && state.message && (
        <p role="alert" className="w-full text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </div>
  );
}
