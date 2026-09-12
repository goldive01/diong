"use server";

import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  listNotifications,
  type NotificationItem,
} from "@/src/lib/social/notification-data";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/src/lib/social/notification-mutations";
import { clampLimit, parseCursor } from "@/src/lib/social/pagination";

// Every export in this "use server" module is an async server action. The
// acting user always comes from requireCompletedProfile() (auth.uid()
// server-side); the RPCs re-derive it too.

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Bound with a notification id; used both as a plain form action (the
 * per-row "Mark as read" fallback) and directly from the open route handler. */
export async function markNotificationReadAction(
  notificationId: number,
): Promise<void> {
  const id = toSafeId(notificationId);
  if (id === null) return;

  const { supabase } = await requireCompletedProfile();
  await markNotificationRead(supabase, id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { supabase } = await requireCompletedProfile();
  await markAllNotificationsRead(supabase);
  revalidatePath("/notifications");
}

export type NotificationBatch = {
  notifications: NotificationItem[];
  nextCursor: string | null;
};

/** Client "Load more": the next page after `cursor`. */
export async function loadMoreNotifications(
  cursor: string | null,
): Promise<NotificationBatch> {
  const { supabase } = await requireCompletedProfile();
  const page = await listNotifications(supabase, {
    cursor: parseCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { notifications: page.notifications, nextCursor: page.nextCursor };
}
