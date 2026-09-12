import Link from "next/link";
import type { ConversationSummary } from "@/src/lib/messages/message-data";
import {
  formatMessageTimestamp,
  messageSnippet,
} from "@/src/lib/messages/message-labels";

// One inbox row. Unread is marked with visible text ("New"), never colour
// alone, matching NotificationRow. Message content is only ever shown here
// and inside the conversation itself — never in Discover, Search, the feed
// or a public profile.
export function ConversationRow({
  conversation,
}: {
  conversation: ConversationSummary;
}) {
  const snippet = messageSnippet(conversation.lastMessageBody);
  const timestamp = formatMessageTimestamp(conversation.lastMessageAt);

  return (
    <Link
      href={`/messages/${conversation.id}`}
      aria-label={
        conversation.unread
          ? `Conversation with ${conversation.otherDisplayName}. Unread.`
          : `Conversation with ${conversation.otherDisplayName}`
      }
      className="flex items-start gap-3 rounded-2xl border border-[#e0dacd] bg-white p-4 outline-none transition hover:border-[#b9c3a3] focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/30"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dfe6d2] text-sm font-semibold text-[#465331]"
      >
        {conversation.otherDisplayName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-[#1d2420]">
            {conversation.otherDisplayName}
          </p>
          <span className="shrink-0 text-xs text-[#7a8378]">{timestamp}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${conversation.unread ? "font-semibold text-[#1d2420]" : "text-[#5f6962]"}`}
          >
            {snippet}
          </p>
          {conversation.unread && (
            <span className="shrink-0 rounded-full bg-[#eef2e5] px-2 py-0.5 text-xs font-semibold text-[#465331]">
              New
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
