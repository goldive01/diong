import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getConversation, listMessages } from "@/src/lib/messages/message-data";
import { markConversationRead } from "@/src/lib/messages/message-mutations";
import { PAGE_SIZE } from "@/src/lib/messages/message-pagination";
import { MessageThread } from "@/src/components/messages/message-thread";
import { loadMoreMessages, sendMessageAction } from "@/app/(protected)/messages/actions";

export const metadata = {
  title: "Conversation",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { conversationId } = await params;

  const id = /^\d+$/.test(conversationId) ? Number(conversationId) : Number.NaN;

  // get_conversation returns no row for a missing id, a non-member, or a
  // conversation where a block now stands between the two participants — all
  // collapse to a branded 404, with no hint that a hidden conversation exists.
  const conversation = await getConversation(supabase, id);
  if (!conversation) notFound();

  // Opening a conversation marks it read.
  await markConversationRead(supabase, conversation.id);

  const page = await listMessages(supabase, conversation.id, {
    limit: PAGE_SIZE,
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col px-5 py-6 sm:px-6 sm:py-10">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/messages"
          className="text-sm font-semibold text-[#59654a] hover:underline"
        >
          ← Messages
        </Link>
        <Link
          href={`/profile/${conversation.otherUsername}`}
          className="ml-auto flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-[#dfe6d2] text-sm font-semibold text-[#465331]"
          >
            {conversation.otherDisplayName.charAt(0).toUpperCase()}
          </span>
          <span className="font-semibold text-[#1d2420]">
            {conversation.otherDisplayName}
          </span>
        </Link>
      </header>

      <section
        aria-label={`Conversation with ${conversation.otherDisplayName}`}
        className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#ded7c9] bg-[#f7f4ee]"
      >
        <MessageThread
          initialMessages={page.messages}
          initialCursor={page.nextCursor}
          loadMore={loadMoreMessages.bind(null, conversation.id)}
          sendAction={sendMessageAction.bind(null, conversation.id)}
          emptyText={`Say hello to ${conversation.otherDisplayName}.`}
        />
      </section>
    </main>
  );
}
