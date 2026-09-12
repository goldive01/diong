"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPost } from "@/app/(protected)/feed/actions";
import {
  EMPTY_POST_FORM,
  initialPostFormState,
} from "@/src/lib/social/post-form-state";
import {
  POST_BODY_MAX,
  normalizePostBody,
} from "@/src/lib/social/post-validation";
import { POST_TYPES, POST_VISIBILITIES } from "@/src/lib/social/post-vocab";
import {
  POST_TYPE_HINT,
  POST_TYPE_LABEL,
  POST_VISIBILITY_LABEL,
} from "@/src/lib/social/post-labels";

// The calm feed composer. Controlled state, body preserved on error, pending
// state, live length indicator, accessible errors, one explicit submit.
export function PostComposer() {
  const [state, formAction, pending] = useActionState(
    createPost,
    initialPostFormState(),
  );
  const [values, setValues] = useState(EMPTY_POST_FORM);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Clear the body once per successful share. Keyed only on `state` (the
  // useActionState result), so this only re-runs when a *new* action result
  // arrives — never on an unrelated re-render such as typing in another
  // field — which is what makes this safe: there is no dependency that
  // changes as a consequence of this effect running, so it cannot cascade.
  // react-hooks/set-state-in-effect flags any setState call inside an effect
  // on principle (a React Compiler-era rule that also fires through an Effect
  // Event wrapper), but "clear a form after a successful submit" has no
  // render-time derivation to fall back to — `values.body` must stay ordinary,
  // user-editable local state after the reset. This is the documented,
  // narrow exception, not the render-time-adjustment anti-pattern this file
  // used to have (which updated two state variables unconditionally inside
  // the render body itself).
  /* eslint-disable react-hooks/set-state-in-effect -- see comment above */
  useEffect(() => {
    if (state.status === "success") {
      setValues((current) => ({ ...current, body: "" }));
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (state.status === "error" && state.errors.body) {
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
            "Share something useful from your progress."}
        </p>
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-semibold">
          Share something useful from your progress
        </label>
        <textarea
          id="body"
          name="body"
          ref={bodyRef}
          value={values.body}
          onChange={(event) =>
            setValues((c) => ({ ...c, body: event.target.value }))
          }
          rows={5}
          required
          aria-invalid={Boolean(state.status === "error" && state.errors.body)}
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

      {state.status === "success" && (
        <p
          role="status"
          className="rounded-xl bg-[#eef2e5] px-4 py-3 text-sm text-[#44512e]"
        >
          Shared with your feed.{" "}
          {state.createdPostId ? (
            <Link
              href={`/posts/${state.createdPostId}`}
              className="font-semibold underline"
            >
              View it
            </Link>
          ) : null}
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
