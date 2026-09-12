"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  EMPTY_COMMUNITY_POST_FORM,
  initialCommunityPostFormState,
  type CommunityPostFormState,
} from "@/src/lib/communities/community-form-state";
import { POST_BODY_MAX, normalizePostBody } from "@/src/lib/social/post-validation";
import { POST_TYPES } from "@/src/lib/social/post-vocab";
import { POST_TYPE_HINT, POST_TYPE_LABEL } from "@/src/lib/social/post-labels";

type CreateCommunityPostAction = (
  state: CommunityPostFormState,
  formData: FormData,
) => Promise<CommunityPostFormState>;

// The community post composer. Always public visibility — no visibility
// field — since V1 community posts are always public social posts (see
// docs/COMMUNITIES_MODERATION.md). Otherwise mirrors PostComposer: controlled
// state, body preserved on error, pending state, live length indicator.
export function CommunityPostComposer({
  action,
}: {
  action: CreateCommunityPostAction;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialCommunityPostFormState(),
  );
  const [values, setValues] = useState(EMPTY_COMMUNITY_POST_FORM);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- clears the composer only
     on a new successful submit result, never during an unrelated re-render;
     see the identical, documented exception in post-composer.tsx. */
  useEffect(() => {
    if (state.status === "success") {
      setValues((current) => ({ ...current, body: "" }));
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (state.status === "error") {
      bodyRef.current?.focus();
    }
  }, [state]);

  const bodyLength = normalizePostBody(values.body).length;
  const over = bodyLength > POST_BODY_MAX;

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div>
        <label htmlFor="postType" className="block text-sm font-semibold">
          Post type
        </label>
        <select
          id="postType"
          name="postType"
          value={values.postType}
          onChange={(event) =>
            setValues((c) => ({ ...c, postType: event.target.value }))
          }
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          {POST_TYPES.map((type) => (
            <option key={type} value={type}>
              {POST_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[#69726c]">
          {POST_TYPE_HINT[values.postType as (typeof POST_TYPES)[number]] ??
            "Share something useful with this community."}
        </p>
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-semibold">
          Share something with this community
        </label>
        <textarea
          id="body"
          name="body"
          ref={bodyRef}
          value={values.body}
          onChange={(event) =>
            setValues((c) => ({ ...c, body: event.target.value }))
          }
          rows={4}
          required
          aria-invalid={state.status === "error"}
          aria-describedby="community-body-count community-body-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal leading-7 outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p
          id="community-body-count"
          className={`mt-1 text-xs ${over ? "font-semibold text-[#9b3829]" : "text-[#69726c]"}`}
        >
          {bodyLength.toLocaleString()} / {POST_BODY_MAX.toLocaleString()} characters
        </p>
        <p id="community-body-error" className="mt-1 min-h-5 text-sm text-[#9b3829]">
          {state.status === "error" ? state.message : ""}
        </p>
      </div>

      {state.status === "success" && (
        <p
          role="status"
          className="rounded-xl bg-[#eef2e5] px-4 py-3 text-sm text-[#44512e]"
        >
          Shared with this community.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || over || bodyLength === 0}
        className="min-h-12 rounded-full bg-[#263b2d] px-6 font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sharing…" : "Share"}
      </button>
    </form>
  );
}
