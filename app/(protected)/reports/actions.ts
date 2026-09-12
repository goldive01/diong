"use server";

import { requireCompletedProfile } from "@/src/lib/auth";
import { createReport } from "@/src/lib/communities/report-mutations";
import {
  hasReportErrors,
  validateReportInput,
} from "@/src/lib/communities/report-validation";
import {
  readReportFormValues,
  type ReportFormState,
} from "@/src/lib/communities/report-form-state";
import type { ReportReason, ReportTargetType } from "@/src/types/database";

// Every export in this "use server" module is an async server action. The
// target is always bound as leading server arguments by the component that
// renders the Report button (post card, comment card, profile panel,
// community header) — it is never a form field, so the browser can neither
// choose nor spoof what is being reported.
//
// Never reveals what moderation action will occur, and never reveals whether
// the report was a duplicate (create_report() silently no-ops a repeat open
// report against the same target) — the response is the same "Report
// submitted." either way.

const GENERIC = "Something went wrong. Please try again.";

export async function createReportAction(
  targetType: ReportTargetType,
  targetId: number | null,
  targetUserId: string | null,
  _previousState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const values = readReportFormValues(formData);
  const errors = validateReportInput(values);
  if (hasReportErrors(errors)) {
    return { status: "error", errors, message: "Check the highlighted fields." };
  }

  const { supabase } = await requireCompletedProfile();

  const result = await createReport(supabase, {
    targetType,
    targetId,
    targetUserId,
    reason: values.reason as ReportReason,
    details: values.details,
  });

  if (result.status === "error") {
    return {
      status: "error",
      errors: {},
      message: result.reason === "not_available" ? "This cannot be reported right now." : GENERIC,
    };
  }

  return { status: "success", errors: {}, message: "Report submitted." };
}
