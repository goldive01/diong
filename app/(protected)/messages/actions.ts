"use server";

import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  getConversation,
  listConversations,
  listMessages,
  type ConversationSummary,
  type MessageItem,
} from "@/src/lib/messages/message-data";
import { sendMessage as sendMessageRpc } from "@/src/lib/messages/message-mutations";
import {
  hasErrors,
  normalizeMessageBody,
  validateMessageBody,
} from "@/src/lib/messages/message-validation";
import {
  readMessageBody,
  type MessageFormState,
} from "@/src/lib/messages/message-form-state";
import { clampLimit, parseCursor } from "@/src/lib/messages/message-pagination";

// Every export in this "use server" module is an async server action. The
// acting user always comes from requireCompletedProfile() (auth.uid()
// server-side); the RPCs re-derive it too. The conversation id is always
// bound as a leading server argument by the rendering component — never a
// form field — so the browser can never redirect a send to a conversation it
// does not belong to (the RPC re-checks membership + block regardless).

const GENERIC = "Something went wrong. Please try again.";
const NOT_AVAILABLE = "This conversation is not available.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function sendMessageAction(
  conversationId: number,
  _previousState: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const values = { body: readMessageBody(formData) };
  const errors = validateMessageBody(values.body);

  if (hasErrors(errors)) {
    return {
      status: "error",
      errors,
      message: "Check the highlighted field.",
      values,
    };
  }

  const id = toSafeId(conversationId);
  if (id === null) {
    return { status: "error", errors: {}, message: NOT_AVAILABLE, values };
  }

  const { supabase } = await requireCompletedProfile();
  const body = normalizeMessageBody(values.body);
  const result = await sendMessageRpc(supabase, { conversationId: id, body });

  if (result.status === "error") {
    return {
      status: "error",
      errors: {},
      message: result.reason === "not_available" ? NOT_AVAILABLE : GENERIC,
      values,
    };
  }

  revalidatePath(`/messages/${id}`);
  revalidatePath("/messages");

  return {
    status: "success",
    errors: {},
    message: "",
    values: { body: "" },
    // createdAt is a best-effort client-side stamp for immediate display; the
    // server value (from now()) will differ by a few milliseconds. The next
    // real page load reads the authoritative row from list_messages().
    sentMessage: { id: result.data, body, createdAt: new Date().toISOString() },
  };
}

export type ConversationBatch = {
  conversations: ConversationSummary[];
  nextCursor: string | null;
};

/** Client "Load more" for the inbox: the next page after `cursor`. */
export async function loadMoreConversations(
  cursor: string | null,
): Promise<ConversationBatch> {
  const { supabase } = await requireCompletedProfile();
  const page = await listConversations(supabase, {
    cursor: parseCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { conversations: page.conversations, nextCursor: page.nextCursor };
}

export type MessageBatch = {
  messages: MessageItem[];
  nextCursor: string | null;
};

/** Client "Load earlier messages": the next (older) page after `cursor`. */
export async function loadMoreMessages(
  conversationId: number,
  cursor: string | null,
): Promise<MessageBatch> {
  const { supabase } = await requireCompletedProfile();
  const id = toSafeId(conversationId);
  if (id === null) return { messages: [], nextCursor: null };

  // Defence in depth: confirm the caller can still see this conversation
  // before paging its history. list_messages() enforces this too.
  const conversation = await getConversation(supabase, id);
  if (!conversation) return { messages: [], nextCursor: null };

  const page = await listMessages(supabase, id, {
    cursor: parseCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { messages: page.messages, nextCursor: page.nextCursor };
}
