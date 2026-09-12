// Plain (non-"use server") module. Holds the form value/state shapes and
// FormData readers used by both the community server actions and the client
// forms. Runtime values cannot be exported from a "use server" file.

import type { CommunityErrors } from "./community-validation";

// ---------------------------------------------------------------------------
// Create-community form
// ---------------------------------------------------------------------------

export type CommunityFormValues = {
  name: string;
  slug: string;
  description: string;
  rules: string;
};

export const EMPTY_COMMUNITY_FORM: CommunityFormValues = {
  name: "",
  slug: "",
  description: "",
  rules: "",
};

export type CreateCommunityState = {
  errors: CommunityErrors;
  message: string;
  values: CommunityFormValues;
};

export const INITIAL_CREATE_COMMUNITY_STATE: CreateCommunityState = {
  errors: {},
  message: "",
  values: EMPTY_COMMUNITY_FORM,
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readCommunityFormValues(formData: FormData): CommunityFormValues {
  return {
    name: readText(formData, "name"),
    slug: readText(formData, "slug"),
    description: readText(formData, "description"),
    rules: readText(formData, "rules"),
  };
}

// ---------------------------------------------------------------------------
// Join / leave toggle
// ---------------------------------------------------------------------------

export type CommunityMembershipState = {
  status: "idle" | "success" | "error";
  joined: boolean;
  message: string;
};

export function initialCommunityMembershipState(
  joined: boolean,
): CommunityMembershipState {
  return { status: "idle", joined, message: "" };
}

// ---------------------------------------------------------------------------
// Community post composer (always public visibility — no visibility field)
// ---------------------------------------------------------------------------

export type CommunityPostFormValues = {
  postType: string;
  body: string;
};

export const EMPTY_COMMUNITY_POST_FORM: CommunityPostFormValues = {
  postType: "update",
  body: "",
};

export type CommunityPostFormState = {
  status: "idle" | "success" | "error";
  message: string;
  values: CommunityPostFormValues;
  createdPostId?: number;
};

export function initialCommunityPostFormState(
  values: CommunityPostFormValues = EMPTY_COMMUNITY_POST_FORM,
): CommunityPostFormState {
  return { status: "idle", message: "", values };
}

export function readCommunityPostFormValues(
  formData: FormData,
): CommunityPostFormValues {
  return {
    postType: readText(formData, "postType"),
    body: readText(formData, "body"),
  };
}

// ---------------------------------------------------------------------------
// Simple confirm-style moderation action state (promote / demote / remove /
// ban / unban / remove-post) — one shared shape, since each is a single
// button with an optional reason and no other fields.
// ---------------------------------------------------------------------------

export type ModerationActionState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_MODERATION_ACTION_STATE: ModerationActionState = {
  status: "idle",
  message: "",
};
