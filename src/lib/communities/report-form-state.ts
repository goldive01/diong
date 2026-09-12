// Plain (non-"use server") module. Holds the report form's value/state shapes
// and FormData readers, used by both the report server action and the
// ReportDialog client component.

import type { ReportErrors } from "./report-validation";

export type ReportFormValues = {
  reason: string;
  details: string;
};

export const EMPTY_REPORT_FORM: ReportFormValues = { reason: "", details: "" };

export type ReportFormState = {
  status: "idle" | "success" | "error";
  errors: ReportErrors;
  message: string;
};

export const INITIAL_REPORT_FORM_STATE: ReportFormState = {
  status: "idle",
  errors: {},
  message: "",
};

export function readReportFormValues(formData: FormData): ReportFormValues {
  const reason = formData.get("reason");
  const details = formData.get("details");
  return {
    reason: typeof reason === "string" ? reason : "",
    details: typeof details === "string" ? details : "",
  };
}
