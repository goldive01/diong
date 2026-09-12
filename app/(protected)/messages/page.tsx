import { requireCompletedProfile } from "@/src/lib/auth";
import { listConversations } from "@/src/lib/messages/message-data";
import { PAGE_SIZE } from "@/src/lib/messages/message-pagination";
import { ConversationList } from "@/src/components/messages/conversation-list";
import { loadMoreConversations } from "@/app/(protected)/messages/actions";

export const metadata = {
  title: "Messages",
};

export default async function MessagesPage() {
  const { supabase } = await requireCompletedProfile();
  const page = await listConversations(supabase, { limit: PAGE_SIZE });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Messages
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Conversations
        </h1>
      </header>

      <section aria-label="Your conversations">
        <ConversationList
          initialConversations={page.conversations}
          initialCursor={page.nextCursor}
          loadMore={loadMoreConversations}
          emptyText="No conversations yet. Start one from someone's profile."
        />
      </section>
    </main>
  );
}
