"use client";

import { useActionState, useState } from "react";
import {
  initialBlockState,
  type BlockActionState,
} from "@/src/lib/social/social-form-state";

type BlockAction = (
  state: BlockActionState,
  formData: FormData,
) => Promise<BlockActionState>;

// Block / unblock control. Blocking is a deliberate action, so it takes a small
// confirm step; unblocking is a single button. The parent re-keys this
// component when the server-rendered block state changes.
export function BlockButton({
  blocked,
  blockAction,
  unblockAction,
  displayName,
}: {
  blocked: boolean;
  blockAction: BlockAction;
  unblockAction: BlockAction;
  displayName: string;
}) {
  const action: BlockAction = (state, formData) =>
    (state.blocked ? unblockAction : blockAction)(state, formData);

  const [state, formAction, pending] = useActionState(
    action,
    initialBlockState(blocked),
  );
  const [confirming, setConfirming] = useState(false);

  if (state.blocked) {
    return (
      <div>
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            aria-label={`Unblock ${displayName}`}
            className="min-h-11 rounded-full border border-[#cfc8bb] px-5 text-sm font-semibold text-[#3e4a41] transition hover:bg-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfc8bb] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {pending ? "Working…" : "Unblock"}
          </button>
        </form>
        {state.status === "error" && state.message && (
          <p role="alert" className="mt-2 text-sm text-[#9b3f37]">
            {state.message}
          </p>
        )}
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-full px-4 text-sm font-semibold text-[#6b746d] transition hover:text-[#9b3f37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfc8bb] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        Block
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e4ded2] bg-white p-4">
      <p className="text-sm leading-6 text-[#5f6962]">
        Block {displayName}? They will not be able to follow you, and any follow
        between you will be removed. You can unblock them later.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            aria-label={`Confirm blocking ${displayName}`}
            className="min-h-10 rounded-full bg-[#8c3527] px-4 text-sm font-semibold text-white transition hover:bg-[#75291d] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c3527] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {pending ? "Working…" : "Block"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold text-[#3e4a41] hover:bg-[#f7f4ee]"
        >
          Cancel
        </button>
      </div>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-2 text-sm text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </div>
  );
}
