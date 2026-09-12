import { describe, expect, it } from "vitest";
import { describeNotification, notificationHref } from "./notification-labels";

describe("describeNotification", () => {
  it("describes each notification type with the actor's display name", () => {
    expect(
      describeNotification({
        notificationType: "new_follower",
        actorDisplayName: "Daniel",
      }),
    ).toBe("Daniel started following you.");

    expect(
      describeNotification({
        notificationType: "post_like",
        actorDisplayName: "Sarah",
      }),
    ).toBe("Sarah liked your post.");

    expect(
      describeNotification({
        notificationType: "post_comment",
        actorDisplayName: "Daniel",
      }),
    ).toBe("Daniel commented on your post.");

    expect(
      describeNotification({
        notificationType: "comment_reply",
        actorDisplayName: "Sarah",
      }),
    ).toBe("Sarah replied to your comment.");

    expect(
      describeNotification({
        notificationType: "new_message",
        actorDisplayName: "Daniel",
      }),
    ).toBe("Daniel sent you a message.");
  });

  it("falls back to 'Someone' when the actor is gone or blank", () => {
    expect(
      describeNotification({ notificationType: "post_like", actorDisplayName: null }),
    ).toBe("Someone liked your post.");
    expect(
      describeNotification({ notificationType: "post_like", actorDisplayName: "   " }),
    ).toBe("Someone liked your post.");
  });
});

describe("notificationHref", () => {
  it("returns null when the target is unavailable", () => {
    expect(
      notificationHref({
        notificationType: "post_like",
        actorUsername: null,
        targetAvailable: false,
        targetPostId: 42,
        entityId: 42,
      }),
    ).toBeNull();
  });

  it("links a new_follower notification to the actor's profile", () => {
    expect(
      notificationHref({
        notificationType: "new_follower",
        actorUsername: "daniel_k",
        targetAvailable: true,
        targetPostId: null,
        entityId: null,
      }),
    ).toBe("/profile/daniel_k");
  });

  it("returns null for new_follower when the username is malformed", () => {
    for (const bad of [null, "", "ab", "Has-Caps", "way-too-long-".repeat(5)]) {
      expect(
        notificationHref({
          notificationType: "new_follower",
          actorUsername: bad,
          targetAvailable: true,
          targetPostId: null,
          entityId: null,
        }),
      ).toBeNull();
    }
  });

  it("links post_like / post_comment / comment_reply to the post", () => {
    for (const notificationType of [
      "post_like",
      "post_comment",
      "comment_reply",
    ] as const) {
      expect(
        notificationHref({
          notificationType,
          actorUsername: "daniel_k",
          targetAvailable: true,
          targetPostId: 123,
          entityId: 123,
        }),
      ).toBe("/posts/123");
    }
  });

  it("returns null for a post-shaped notification with no usable post id", () => {
    for (const targetPostId of [null, 0, -1, 1.5]) {
      expect(
        notificationHref({
          notificationType: "post_like",
          actorUsername: "daniel_k",
          targetAvailable: true,
          targetPostId,
          entityId: targetPostId,
        }),
      ).toBeNull();
    }
  });

  it("links a new_message notification to the conversation", () => {
    expect(
      notificationHref({
        notificationType: "new_message",
        actorUsername: "daniel_k",
        targetAvailable: true,
        targetPostId: null,
        entityId: 7,
      }),
    ).toBe("/messages/7");
  });

  it("returns null for new_message with no usable conversation id", () => {
    for (const entityId of [null, 0, -1, 1.5]) {
      expect(
        notificationHref({
          notificationType: "new_message",
          actorUsername: "daniel_k",
          targetAvailable: true,
          targetPostId: null,
          entityId,
        }),
      ).toBeNull();
    }
  });

  it("never returns anything but /posts/<id>, /profile/<username>, /messages/<id> or null", () => {
    const shapes = [
      { notificationType: "new_follower" as const, actorUsername: "daniel_k", targetAvailable: true, targetPostId: null, entityId: null },
      { notificationType: "post_comment" as const, actorUsername: "daniel_k", targetAvailable: true, targetPostId: 9, entityId: 9 },
      { notificationType: "comment_reply" as const, actorUsername: null, targetAvailable: false, targetPostId: 9, entityId: 9 },
      { notificationType: "new_message" as const, actorUsername: "daniel_k", targetAvailable: true, targetPostId: null, entityId: 3 },
    ];
    for (const shape of shapes) {
      const href = notificationHref(shape);
      expect(href === null || /^\/(posts\/\d+|profile\/[a-z0-9_]{3,30}|messages\/\d+)$/.test(href)).toBe(true);
    }
  });
});
