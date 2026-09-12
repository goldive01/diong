import type {
  NotificationEntityType,
  NotificationType,
} from "@/src/types/database";

// The controlled vocabularies for notifications. These mirror the
// notifications_type_allowed / notifications_entity_type_allowed /
// notifications_type_entity_consistent CHECK constraints, which stay
// authoritative.

export const NOTIFICATION_TYPES = [
  "new_follower",
  "post_like",
  "post_comment",
  "comment_reply",
] as const satisfies readonly NotificationType[];

export const NOTIFICATION_ENTITY_TYPES = [
  "profile",
  "post",
  "comment",
] as const satisfies readonly NotificationEntityType[];

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

export function isNotificationEntityType(
  value: unknown,
): value is NotificationEntityType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_ENTITY_TYPES as readonly string[]).includes(value)
  );
}
