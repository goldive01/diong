"use client";

import { useState, useTransition } from "react";
import type { MessageItem } from "@/src/lib/messages/message-data";
import type { MessageFormState } from "@/src/lib/messages/message-form-state";
import { MessageBubble } from "@/src/components/messages/message-bubble";
import { MessageComposer } from "@/src/components/messages/message-composer";

type LoadMore = (
  cursor: string | null,
) => Promise<{ messages: MessageItem[]; nextCursor: string | null }>;

type SendAction = (
  state: MessageFormState,
  formData: FormData,
) => Promise<MessageFormState>;

// One conversation's message history (oldest first) plus the composer. The
// first page is server-rendered; "Load earlier messages" prepends an older
// page through a server action, and a successful send appends the new
// message immediately without a full reload.
export function MessageThread({
  initialMessages,
  initialCursor,
  loadMore,
  sendAction,
  emptyText,
}: {
  initialMessages: MessageItem[];
  initialCursor: string | null;
  loadMore: LoadMore;
  sendAction: SendAction;
  emptyText: string;
}) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onLoadOlder() {
    setError("");
    startTransition(async () => {
      try {
        const batch = await loadMore(cursor);
        setMessages((current) => {
          const seen = new Set(current.map((m) => m.id));
          return [...batch.messages.filter((m) => !seen.has(m.id)), ...current];
        });
        setCursor(batch.nextCursor);
      } catch {
        setError("Could not load earlier messages. Please try again.");
      }
    });
  }

  function onSent(sent: { id: number; body: string; createdAt: string }) {
    setMessages((current) => {
      if (current.some((m) => m.id === sent.id)) return current;
      return [
        ...current,
        {
          id: sent.id,
          senderId: "",
          body: sent.body,
          createdAt: sent.createdAt,
          isOwn: true,
        },
      ];
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {cursor && (
          <div className="text-center">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={pending}
              className="min-h-9 rounded-full border border-[#cfc8bb] px-4 text-xs font-semibold text-[#3e4a41] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-center text-sm text-[#9b3f37]">
            {error}
          </p>
        )}

        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
            {emptyText}
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => (
              <li key={message.id}>
                <MessageBubble message={message} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <MessageComposer action={sendAction} onSent={onSent} />
    </div>
  );
}
