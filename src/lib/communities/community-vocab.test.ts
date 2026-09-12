import { describe, expect, it } from "vitest";
import {
  COMMUNITY_ROLES,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  isCommunityRole,
  isReportReason,
  isReportStatus,
  isReportTargetType,
} from "./community-vocab";

describe("community vocab", () => {
  it("exposes the three community roles", () => {
    expect([...COMMUNITY_ROLES]).toEqual(["owner", "moderator", "member"]);
  });

  it("isCommunityRole accepts only known roles", () => {
    for (const role of COMMUNITY_ROLES) {
      expect(isCommunityRole(role)).toBe(true);
    }
    for (const value of ["", "admin", "superadmin", 1, null, undefined, {}]) {
      expect(isCommunityRole(value)).toBe(false);
    }
  });

  it("exposes the five report target types", () => {
    expect([...REPORT_TARGET_TYPES]).toEqual([
      "post",
      "comment",
      "profile",
      "community",
      "community_post",
    ]);
  });

  it("isReportTargetType accepts only known types", () => {
    for (const type of REPORT_TARGET_TYPES) {
      expect(isReportTargetType(type)).toBe(true);
    }
    for (const value of ["", "message", "user", 1, null, undefined]) {
      expect(isReportTargetType(value)).toBe(false);
    }
  });

  it("exposes the seven report reasons", () => {
    expect([...REPORT_REASONS]).toEqual([
      "spam",
      "harassment",
      "hate_or_abuse",
      "unsafe_content",
      "misinformation",
      "impersonation",
      "other",
    ]);
  });

  it("isReportReason accepts only known reasons", () => {
    for (const reason of REPORT_REASONS) {
      expect(isReportReason(reason)).toBe(true);
    }
    for (const value of ["", "abuse", "violence", 1, null, undefined]) {
      expect(isReportReason(value)).toBe(false);
    }
  });

  it("exposes the four report statuses", () => {
    expect([...REPORT_STATUSES]).toEqual([
      "open",
      "reviewed",
      "actioned",
      "dismissed",
    ]);
  });

  it("isReportStatus accepts only known statuses", () => {
    for (const status of REPORT_STATUSES) {
      expect(isReportStatus(status)).toBe(true);
    }
    for (const value of ["", "closed", "pending", 1, null, undefined]) {
      expect(isReportStatus(value)).toBe(false);
    }
  });
});
