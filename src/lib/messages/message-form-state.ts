// Plain (non-"use server") module. Holds the form value shapes, action-state
// shapes and FormData readers used by both the direct-message server actions
// and the client forms. Runtime values cannot be exported from a
// "use server" file, so they live here.

import type { MessageErrors } from "./message-validation";

// ---------------------------------------------------------------------------
// Message composer
// ---------------------------------------------------------------------------

export type MessageFormValues = {
  body: string;
};

export type MessageFormState = {
  status: "idle" | "success" | "error";
  errors: MessageErrors;
  message: string;
  values: MessageFormValues;
  /** Set on a successful send, so the thread can append it without a reload. */
  sentMessage?: { id: number; body: string; createdAt: string };
};

export const EMPTY_MESSAGE_FORM: MessageFormValues = { body: "" };

export function initialMessageFormState(
  values: MessageFormValues = EMPTY_MESSAGE_FORM,
): MessageFormState {
  return { status: "idle", errors: {}, message: "", values };
}

export function readMessageBody(formData: FormData): string {
  const value = formData.get("body");
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// "Message" button on a public profile
// ---------------------------------------------------------------------------

export type MessageButtonState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_MESSAGE_BUTTON_STATE: MessageButtonState = {
  status: "idle",
  message: "",
};
