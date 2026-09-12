import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationRow } from "@/src/types/database";
import { encodeCursor, type Cursor, PAGE_SIZE } from "./pagination";

// Typed reads for notifications. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention) and
// wraps public.list_notifications() / public.get_unread_notification_count(),
// which already apply the full block + deleted-content model. Reads never
// throw: a failure is logged server-side and yields an empty / zero result so
// a transient database problem cannot break a page.

export type NotificationItem = {
  id: number;
  notificationType: NotificationRow["notification_type"];
  entityType: NotificationRow["entity_type"];
  entityId: number | null;
  actorUserId: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  targetPostId: number | null;
  targetAvailable: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  notifications: NotificationItem[];
  nextCursor: string | null;
};

function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    notificationType: row.notification_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorUserId: row.actor_user_id,
    actorUsername: row.actor_username,
    actorDisplayName: row.actor_display_name,
    targetPostId: row.target_post_id,
    targetAvailable: Boolean(row.target_available),
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export type ListNotificationsOptions = {
  cursor?: Cursor | null;
  limit?: number;
};

/** One page of the viewer's notifications, newest first, block filtered. */
export async function listNotifications(
  supabase: SupabaseClient<Database>,
  options: ListNotificationsOptions = {},
): Promise<NotificationPage> {
  const limit = options.limit ?? PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_notifications", {
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load notifications:", error.message);
      return { notifications: [], nextCursor: null };
    }
    const rows = (data ?? []) as NotificationRow[];
    const notifications = rows.map(mapNotification);
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? encodeCursor(last.created_at, last.id)
        : null;
    return { notifications, nextCursor };
  } catch (cause) {
    console.error(
      "Unable to load notifications:",
      cause instanceof Error ? cause.message : cause,
    );
    return { notifications: [], nextCursor: null };
  }
}

/** The viewer's unread notification count. Falls back to 0 on any read error. */
export async function getUnreadNotificationCount(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc(
      "get_unread_notification_count",
    );
    if (error) {
      console.error("Unable to load unread notification count:", error.message);
      return 0;
    }
    return typeof data === "number" ? data : 0;
  } catch (cause) {
    console.error(
      "Unable to load unread notification count:",
      cause instanceof Error ? cause.message : cause,
    );
    return 0;
  }
}
