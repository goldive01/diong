"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  connectionColumns,
  hasConnectionErrors,
  normalizeConnectionInput,
  validateConnectionInput,
} from "@/src/lib/connections/connection-validation";
import {
  readConnectionFormValues,
  type CreateConnectionState,
} from "@/src/lib/connections/connection-form-state";

export async function createConnection(
  _previousState: CreateConnectionState,
  formData: FormData,
): Promise<CreateConnectionState> {
  const values = readConnectionFormValues(formData);

  const input = normalizeConnectionInput({
    name: values.name,
    connectionType: values.connectionType,
    connectionPurpose: values.connectionPurpose,
    whyItMatters: values.whyItMatters,
    preferredContactDays: values.preferredContactDays,
    notes: values.notes,
    // isActive is intentionally omitted: new connections default to active.
  });

  const errors = validateConnectionInput(input);
  if (hasConnectionErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const { supabase, userId } = await requireCompletedProfile();

  // user_id comes only from the authenticated server context. connectionColumns
  // returns exactly the columns the Phase A INSERT grant allows; id, created_at,
  // updated_at and last_meaningful_contact_at are never set here.
  const { error } = await supabase
    .from("connections")
    .insert({ user_id: userId, ...connectionColumns(input) });

  if (error) {
    console.error("Unable to create connection:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    return {
      errors: {},
      message: "We could not save this connection. Please try again.",
      values,
    };
  }

  revalidatePath("/connections");
  redirect("/connections");
}
