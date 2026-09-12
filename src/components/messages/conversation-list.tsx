"use client";

import { useState, useTransition } from "react";
import type { ConversationSummary } from "@/src/lib/messages/message-data";
import { ConversationRow } from "@/src/components/messages/conversation-row";

type LoadMore = (
  cursor: string | null,
) => Promise<{ conversations: ConversationSummary[]; nextCursor: string | null }>;

// The inbox list with an accessible "Load more" control. The first page is
// server-rendered; later pages are appended via a server action. Most
// recently active conversation first.
export function ConversationList({
  initialConversations,
  initialCursor,
  loadMore,
  emptyText,
}: {
  initialConversations: ConversationSummary[];
  initialCursor: string | null;
  loadMore: LoadMore;
  emptyText: string;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialConversations,
  );
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onLoadMore() {
    setError("");
    startTransition(async () => {
      try {
        const batch = await loadMore(cursor);
        setConversations((current) => {
          const seen = new Set(current.map((c) => c.id));
          return [
            ...current,
            ...batch.conversations.filter((c) => !seen.has(c.id)),
          ];
        });
        setCursor(batch.nextCursor);
      } catch {
        setError("Could not load more conversations. Please try again.");
      }
    });
  }

  if (conversations.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
        {emptyText}
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationRow conversation={conversation} />
          </li>
        ))}
      </ul>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={pending}
            className="min-h-11 rounded-full border border-[#cfc8bb] px-6 text-sm font-semibold text-[#3e4a41] transition hover:bg-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-[#9b3f37]">
          {error}
        </p>
      )}
    </div>
  );
}
