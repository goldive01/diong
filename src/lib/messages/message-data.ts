import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationRow,
  ConversationSummaryRow,
  Database,
  MessageRow,
} from "@/src/types/database";
import { PAGE_SIZE, encodeCursor, type Cursor } from "./message-pagination";

// Typed reads for direct messages. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention) and
// wraps a SECURITY DEFINER RPC that already applies the full membership +
// block model. Reads never throw: a failure is logged server-side and yields
// an empty / null result so a transient database problem cannot break a page,
// and no raw database text reaches the browser.

export type ConversationSummary = {
  id: number;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  unread: boolean;
};

export type ConversationPage = {
  conversations: ConversationSummary[];
  nextCursor: string | null;
};

function mapConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  return {
    id: row.id,
    otherUserId: row.other_user_id,
    otherUsername: row.other_username,
    otherDisplayName: row.other_display_name,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at,
    unread: Boolean(row.unread),
  };
}

export type ListConversationsOptions = {
  cursor?: Cursor | null;
  limit?: number;
};

/** One page of the viewer's inbox, most recently active first, block filtered. */
export async function listConversations(
  supabase: SupabaseClient<Database>,
  options: ListConversationsOptions = {},
): Promise<ConversationPage> {
  const limit = options.limit ?? PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_conversations", {
      p_before_last_message_at: options.cursor?.beforeAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load conversations:", error.message);
      return { conversations: [], nextCursor: null };
    }
    const rows = (data ?? []) as ConversationSummaryRow[];
    const conversations = rows.map(mapConversationSummary);
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last?.last_message_at
        ? encodeCursor(last.last_message_at, last.id)
        : null;
    return { conversations, nextCursor };
  } catch (cause) {
    console.error(
      "Unable to load conversations:",
      cause instanceof Error ? cause.message : cause,
    );
    return { conversations: [], nextCursor: null };
  }
}

export type ConversationDetail = {
  id: number;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string;
  createdAt: string;
};

/**
 * One conversation from the viewer's point of view, or null when the caller
 * is not a member, the id does not exist, or a block now stands between the
 * two participants. The caller treats null as notFound().
 */
export async function getConversation(
  supabase: SupabaseClient<Database>,
  conversationId: number,
): Promise<ConversationDetail | null> {
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0) return null;
  try {
    const { data, error } = await supabase.rpc("get_conversation", {
      p_conversation_id: conversationId,
    });
    if (error) {
      console.error("Unable to load conversation:", error.message);
      return null;
    }
    const row = (data as ConversationRow[] | null)?.[0];
    if (!row) return null;
    return {
      id: row.id,
      otherUserId: row.other_user_id,
      otherUsername: row.other_username,
      otherDisplayName: row.other_display_name,
      createdAt: row.created_at,
    };
  } catch (cause) {
    console.error(
      "Unable to load conversation:",
      cause instanceof Error ? cause.message : cause,
    );
    return null;
  }
}

export type MessageItem = {
  id: number;
  senderId: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
};

export type MessagePage = {
  /** Oldest first, ready to render top-to-bottom. */
  messages: MessageItem[];
  /** Cursor for the next (older) page, or null when the earliest message was reached. */
  nextCursor: string | null;
};

function mapMessage(row: MessageRow): MessageItem {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    isOwn: Boolean(row.is_own),
  };
}

export type ListMessagesOptions = {
  cursor?: Cursor | null;
  limit?: number;
};

/**
 * One page of messages in a conversation, returned oldest-first for direct
 * rendering. `list_messages` itself returns newest-first (the same keyset
 * shape as list_feed); this function reverses it and derives the "load
 * older" cursor from the oldest row of the page.
 */
export async function listMessages(
  supabase: SupabaseClient<Database>,
  conversationId: number,
  options: ListMessagesOptions = {},
): Promise<MessagePage> {
  const limit = options.limit ?? PAGE_SIZE;
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
    return { messages: [], nextCursor: null };
  }
  try {
    const { data, error } = await supabase.rpc("list_messages", {
      p_conversation_id: conversationId,
      p_before_created_at: options.cursor?.beforeAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load messages:", error.message);
      return { messages: [], nextCursor: null };
    }
    const rows = (data ?? []) as MessageRow[];
    const oldest = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && oldest
        ? encodeCursor(oldest.created_at, oldest.id)
        : null;
    const messages = rows.map(mapMessage).reverse();
    return { messages, nextCursor };
  } catch (cause) {
    console.error(
      "Unable to load messages:",
      cause instanceof Error ? cause.message : cause,
    );
    return { messages: [], nextCursor: null };
  }
}

/** The viewer's total unread message count. Falls back to 0 on any read error. */
export async function getUnreadMessageCount(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_unread_message_count");
    if (error) {
      console.error("Unable to load unread message count:", error.message);
      return 0;
    }
    return typeof data === "number" ? data : 0;
  } catch (cause) {
    console.error(
      "Unable to load unread message count:",
      cause instanceof Error ? cause.message : cause,
    );
    return 0;
  }
}
