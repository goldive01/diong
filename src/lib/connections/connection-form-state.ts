import type { ConnectionErrors } from "@/src/lib/connections/connection-validation";

// String-only shape the form fields hold, echoed back so a validation failure
// never loses what the user typed (also covers the no-JS path).
export type ConnectionFormValues = {
  name: string;
  connectionType: string;
  connectionPurpose: string;
  whyItMatters: string;
  preferredContactDays: string;
  notes: string;
};

export type CreateConnectionState = {
  errors: ConnectionErrors;
  message: string;
  values?: ConnectionFormValues;
};

export const EMPTY_CONNECTION_FORM: ConnectionFormValues = {
  name: "",
  connectionType: "",
  connectionPurpose: "",
  whyItMatters: "",
  preferredContactDays: "",
  notes: "",
};
