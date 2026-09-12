import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the notification-read-state SECURITY DEFINER RPCs.
// Application code must never write public.notifications directly — there is
// no INSERT/UPDATE/DELETE grant on it. These wrappers never surface raw
// Postgres text; a failure is logged and reported as a boolean so a page can
// preserve its previous state.

export async function markNotificationRead(
  supabase: SupabaseClient<Database>,
  notificationId: number,
): Promise<boolean> {
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  if (error) {
    console.error("mark_notification_read failed:", error.message);
    return false;
  }
  return true;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) {
    console.error("mark_all_notifications_read failed:", error.message);
    return false;
  }
  return true;
}
