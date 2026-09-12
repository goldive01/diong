// Plain (non-"use server") module. Holds the form value shapes, action-state
// shapes and FormData readers used by both the social-content server actions and
// the client forms. Runtime values cannot be exported from a "use server" file.

import type { PostErrors, CommentErrors } from "./post-validation";

// ---------------------------------------------------------------------------
// Post composer / edit form
// ---------------------------------------------------------------------------

// String-only shape the fields hold, echoed back so a validation failure never
// loses what the writer typed (also covers the no-JS path).
export type PostFormValues = {
  postType: string;
  body: string;
  visibility: string;
};

export type PostFormState = {
  status: "idle" | "success" | "error";
  errors: PostErrors;
  message: string;
  values: PostFormValues;
  /** Set on a successful create, so the composer can link to the new post. */
  createdPostId?: number;
};

export const EMPTY_POST_FORM: PostFormValues = {
  postType: "update",
  body: "",
  visibility: "public",
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readPostFormValues(formData: FormData): PostFormValues {
  return {
    postType: readText(formData, "postType"),
    body: readText(formData, "body"),
    visibility: readText(formData, "visibility"),
  };
}

export function initialPostFormState(
  values: PostFormValues = EMPTY_POST_FORM,
): PostFormState {
  return { status: "idle", errors: {}, message: "", values };
}

// ---------------------------------------------------------------------------
// Comment / reply form
// ---------------------------------------------------------------------------

export type CommentFormState = {
  status: "idle" | "success" | "error";
  errors: CommentErrors;
  message: string;
  body: string;
};

export const INITIAL_COMMENT_FORM_STATE: CommentFormState = {
  status: "idle",
  errors: {},
  message: "",
  body: "",
};

export function readCommentBody(formData: FormData): string {
  return readText(formData, "body");
}

// ---------------------------------------------------------------------------
// Like / bookmark toggle actions
// ---------------------------------------------------------------------------

// The state AFTER the last toggle, so a client button reflects the change
// immediately while path revalidation happens in the background.
export type ToggleActionState = {
  status: "idle" | "success" | "error";
  active: boolean;
  /** Best-effort count for the toggled metric; the server revalidate corrects it. */
  count: number;
  message: string;
};

export function initialToggleState(
  active: boolean,
  count: number,
): ToggleActionState {
  return { status: "idle", active, count, message: "" };
}

// ---------------------------------------------------------------------------
// Delete post action
// ---------------------------------------------------------------------------

export type DeletePostState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_DELETE_POST_STATE: DeletePostState = {
  status: "idle",
  message: "",
};
