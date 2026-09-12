// Pure validation for the reporting flow. Mirrors create_report()'s own
// checks in 202609120003_communities.sql — a usability guard layer, not a
// replacement for the database's authoritative validation.

import { isReportReason, REPORT_REASONS } from "./community-vocab";
import type { ReportReason } from "@/src/types/database";

export const REPORT_DETAILS_MAX = 2000;

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_or_abuse: "Hate or abuse",
  unsafe_content: "Unsafe content",
  misinformation: "Misinformation",
  impersonation: "Impersonation",
  other: "Other",
};

export function reportReasonOptions(): { value: ReportReason; label: string }[] {
  return REPORT_REASONS.map((reason) => ({
    value: reason,
    label: REPORT_REASON_LABEL[reason],
  }));
}

export type ReportErrors = {
  reason?: string;
  details?: string;
};

// The target type is never a form field — it is bound server-side by the
// page that renders the Report button (post/comment/profile/community
// component), so only reason + details need form-level validation here.
export function validateReportInput(input: {
  reason: string;
  details: string;
}): ReportErrors {
  const errors: ReportErrors = {};

  if (!isReportReason(input.reason)) {
    errors.reason = "Choose a reason.";
  }

  if (input.details.trim().length > REPORT_DETAILS_MAX) {
    errors.details = `Details must be ${REPORT_DETAILS_MAX} characters or fewer.`;
  }

  return errors;
}

export function hasReportErrors(errors: ReportErrors): boolean {
  return Object.keys(errors).length > 0;
}
