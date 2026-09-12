// Controlled vocabulary for communities and reports. Mirrors the CHECK
// constraints in 202609120003_communities.sql exactly — this is a usability /
// guard layer, not a replacement for the database constraints.

import type {
  CommunityRole,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@/src/types/database";

export const COMMUNITY_ROLES: readonly CommunityRole[] = [
  "owner",
  "moderator",
  "member",
] as const;

export function isCommunityRole(value: unknown): value is CommunityRole {
  return (
    typeof value === "string" &&
    (COMMUNITY_ROLES as readonly string[]).includes(value)
  );
}

export const REPORT_TARGET_TYPES: readonly ReportTargetType[] = [
  "post",
  "comment",
  "profile",
  "community",
  "community_post",
] as const;

export function isReportTargetType(value: unknown): value is ReportTargetType {
  return (
    typeof value === "string" &&
    (REPORT_TARGET_TYPES as readonly string[]).includes(value)
  );
}

export const REPORT_REASONS: readonly ReportReason[] = [
  "spam",
  "harassment",
  "hate_or_abuse",
  "unsafe_content",
  "misinformation",
  "impersonation",
  "other",
] as const;

export function isReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    (REPORT_REASONS as readonly string[]).includes(value)
  );
}

export const REPORT_STATUSES: readonly ReportStatus[] = [
  "open",
  "reviewed",
  "actioned",
  "dismissed",
] as const;

export function isReportStatus(value: unknown): value is ReportStatus {
  return (
    typeof value === "string" &&
    (REPORT_STATUSES as readonly string[]).includes(value)
  );
}
