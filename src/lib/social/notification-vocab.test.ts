import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  isNotificationEntityType,
  isNotificationType,
} from "./notification-vocab";

describe("notification vocab", () => {
  it("exposes the four notification types", () => {
    expect([...NOTIFICATION_TYPES]).toEqual([
      "new_follower",
      "post_like",
      "post_comment",
      "comment_reply",
    ]);
  });

  it("exposes the three entity types", () => {
    expect([...NOTIFICATION_ENTITY_TYPES]).toEqual([
      "profile",
      "post",
      "comment",
    ]);
  });

  it("isNotificationType accepts only known types", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(isNotificationType(type)).toBe(true);
    }
    for (const value of ["", "message", "mention", 1, null, undefined, {}]) {
      expect(isNotificationType(value)).toBe(false);
    }
  });

  it("isNotificationEntityType accepts only known types", () => {
    for (const type of NOTIFICATION_ENTITY_TYPES) {
      expect(isNotificationEntityType(type)).toBe(true);
    }
    for (const value of ["", "user", "message", 1, null, undefined]) {
      expect(isNotificationEntityType(value)).toBe(false);
    }
  });
});
