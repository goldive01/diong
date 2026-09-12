import { requireCompletedProfile } from "@/src/lib/auth";
import { getUnreadNotificationCount } from "@/src/lib/social/notification-data";
import { getUnreadMessageCount } from "@/src/lib/messages/message-data";
import { AppHeader } from "@/src/components/app/app-header";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireCompletedProfile();
  const [unreadCount, unreadMessageCount] = await Promise.all([
    getUnreadNotificationCount(supabase),
    getUnreadMessageCount(supabase),
  ]);
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1d2420]">
      <AppHeader unreadCount={unreadCount} unreadMessageCount={unreadMessageCount} />
      <div id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </div>
    </div>
  );
}
