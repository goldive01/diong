import { describe, expect, it } from "vitest";
import {
  communityErrorMessage,
  memberCountLabel,
  roleLabel,
} from "./community-labels";

describe("roleLabel", () => {
  it("labels each known role", () => {
    expect(roleLabel("owner")).toBe("Owner");
    expect(roleLabel("moderator")).toBe("Moderator");
    expect(roleLabel("member")).toBe("Member");
  });
});

describe("memberCountLabel", () => {
  it("uses the singular for exactly one member", () => {
    expect(memberCountLabel(1)).toBe("1 member");
  });

  it("uses the plural, with thousands separators, otherwise", () => {
    expect(memberCountLabel(0)).toBe("0 members");
    expect(memberCountLabel(2)).toBe("2 members");
    expect(memberCountLabel(12000)).toBe("12,000 members");
  });
});

describe("communityErrorMessage", () => {
  it("prefers a caller-supplied fallback message", () => {
    expect(communityErrorMessage("not_available", "Custom message.")).toBe(
      "Custom message.",
    );
  });

  it("maps each known reason to calm, safe copy", () => {
    expect(communityErrorMessage("not_available")).toMatch(/not available/i);
    expect(communityErrorMessage("slug_taken")).toMatch(/already taken/i);
    expect(communityErrorMessage("invalid")).toMatch(/highlighted fields/i);
    expect(communityErrorMessage("unknown")).toMatch(/went wrong/i);
  });
});
