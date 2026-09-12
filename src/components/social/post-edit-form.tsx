"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { updatePostAction } from "@/app/(protected)/posts/actions";
import {
  initialPostFormState,
  type PostFormState,
} from "@/src/lib/social/post-form-state";
import {
  POST_BODY_MAX,
  normalizePostBody,
} from "@/src/lib/social/post-validation";
import { POST_VISIBILITIES } from "@/src/lib/social/post-vocab";
import {
  POST_TYPE_LABEL,
  POST_VISIBILITY_LABEL,
  postTypeLabel,
} from "@/src/lib/social/post-labels";
import type { FeedPost } from "@/src/lib/social/post-data";

// Edit body + visibility of an existing post. Post type and creation time are
// fixed and shown for context only.
export function PostEditForm({ post }: { post: FeedPost }) {
  const action = updatePostAction.bind(null, post.id);
  const [state, formAction, pending] = useActionState(
    action,
    initialPostFormState({
      postType: post.postType,
      body: post.body,
      visibility: post.visibility,
    }),
  );
  const [values, setValues] = useState({
    body: post.body,
    visibility: post.visibility as string,
  });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.status === "error" && (state as PostFormState).errors.body) {
      bodyRef.current?.focus();
    }
  }, [state]);

  const bodyLength = normalizePostBody(values.body).length;
  const over = bodyLength > POST_BODY_MAX;

  return (
    <form action={formAction} noValidate className="space-y-4">
      <p className="text-sm text-[#5f6962]">
        <span className="font-semibold">{postTypeLabel(post.postType)}</span> ·
        the post type cannot be changed.
        <span className="sr-only">
          {" "}
          {POST_TYPE_LABEL[post.postType]}
        </span>
      </p>

      <div>
        <label htmlFor="body" className="block text-sm font-semibold">
          Post
        </label>
        <textarea
          id="body"
          name="body"
          ref={bodyRef}
          value={values.body}
          onChange={(event) =>
            setValues((c) => ({ ...c, body: event.target.value }))
          }
          rows={7}
          required
          aria-invalid={Boolean(
            state.status === "error" && state.errors.body,
          )}
          aria-describedby="body-count body-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal leading-7 outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p
          id="body-count"
          className={`mt-1 text-xs ${over ? "font-semibold text-[#9b3829]" : "text-[#69726c]"}`}
        >
          {bodyLength.toLocaleString()} / {POST_BODY_MAX.toLocaleString()} characters
        </p>
        <p id="body-error" className="mt-1 min-h-5 text-sm text-[#9b3829]">
          {state.status === "error" ? (state.errors.body ?? "") : ""}
        </p>
      </div>

      <div>
        <label htmlFor="visibility" className="block text-sm font-semibold">
          Who can see this
        </label>
        <select
          id="visibility"
          name="visibility"
          value={values.visibility}
          onChange={(event) =>
            setValues((c) => ({ ...c, visibility: event.target.value }))
          }
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          {POST_VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {POST_VISIBILITY_LABEL[v]}
            </option>
          ))}
        </select>
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#8c3527]"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-[#ece7de] pt-5">
        <button
          type="submit"
          disabled={pending || over || bodyLength === 0}
          className="min-h-12 rounded-full bg-[#263b2d] px-6 font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/posts/${post.id}`}
          className="min-h-12 rounded-full px-4 py-3 font-semibold text-[#4d574f] hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
