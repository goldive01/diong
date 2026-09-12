// Display copy for communities. Pure, deterministic, no data access.

import type { CommunityRole } from "@/src/types/database";

export const ROLE_LABEL: Record<CommunityRole, string> = {
  owner: "Owner",
  moderator: "Moderator",
  member: "Member",
};

export function roleLabel(role: CommunityRole): string {
  return ROLE_LABEL[role];
}

export function memberCountLabel(count: number): string {
  return count === 1 ? "1 member" : `${count.toLocaleString()} members`;
}

/** Safe, calm copy for the not_available / invalid / slug_taken / unknown
 * mutation reasons community-mutations.ts returns. A caller-supplied
 * fallback message (e.g. leave_community's owner-guard text) always wins. */
export function communityErrorMessage(
  reason: "not_available" | "invalid" | "slug_taken" | "unknown",
  fallback?: string,
): string {
  if (fallback) return fallback;
  switch (reason) {
    case "not_available":
      return "This community is not available.";
    case "slug_taken":
      return "That slug is already taken.";
    case "invalid":
      return "Check the highlighted fields.";
    default:
      return "Something went wrong. Please try again.";
  }
}
