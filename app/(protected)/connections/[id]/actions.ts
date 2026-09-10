"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  connectionColumns,
  hasConnectionErrors,
  hasInteractionErrors,
  normalizeConnectionInput,
  normalizeInteractionInput,
  validateConnectionInput,
  validateInteractionInput,
} from "@/src/lib/connections/connection-validation";
import { recordConnectionInteraction } from "@/src/lib/connections/record-interaction";
import {
  EMPTY_INTERACTION_FORM,
  readConnectionFormValues,
  readInteractionFormValues,
  type ConnectionActiveState,
  type CreateConnectionState,
  type RecordInteractionState,
} from "@/src/lib/connections/connection-form-state";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Every export in this "use server" module is an async server action. Each
// connection-scoped action takes the connection id as a bound first argument
// (supplied on the server), so the browser can never read or change it.

const SAFE_UPDATE_MESSAGE = "We could not save your changes. Please try again.";
const SAFE_UNAVAILABLE_MESSAGE = "This connection is not available.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Confirms the signed-in user owns the connection. RLS already scopes every
 * query to the owner; this is the explicit ownership check each mutation makes
 * before touching a row, and it never surfaces a raw database error.
 */
async function ownsConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
  connectionId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("connections")
    .select("id")
    .eq("user_id", userId)
    .eq("id", connectionId)
    .maybeSingle();

  if (error) {
    console.error("Ownership check failed:", error.message);
    return false;
  }
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Edit connection
// ---------------------------------------------------------------------------

export async function updateConnection(
  connectionId: number,
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
    // isActive is intentionally omitted here and never written on edit.
  });

  const errors = validateConnectionInput(input);
  if (hasConnectionErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const id = toSafeId(connectionId);
  if (id === null) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsConnection(supabase, userId, id))) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  // Only the six editable detail columns are written. user_id, id, the
  // timestamps and last_meaningful_contact_at are never touched here, and
  // is_active is left to the deactivate/reactivate actions.
  const columns = connectionColumns(input);
  const { error } = await supabase
    .from("connections")
    .update({
      name: columns.name,
      connection_type: columns.connection_type,
      connection_purpose: columns.connection_purpose,
      why_it_matters: columns.why_it_matters,
      preferred_contact_days: columns.preferred_contact_days,
      notes: columns.notes,
    })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update connection:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    return { errors: {}, message: SAFE_UPDATE_MESSAGE, values };
  }

  revalidatePath("/connections");
  revalidatePath(`/connections/${id}`);
  redirect(`/connections/${id}`);
}

// ---------------------------------------------------------------------------
// Record a meaningful interaction
// ---------------------------------------------------------------------------

export async function recordInteraction(
  connectionId: number,
  _previousState: RecordInteractionState,
  formData: FormData,
): Promise<RecordInteractionState> {
  const values = readInteractionFormValues(formData);

  const id = toSafeId(connectionId);
  if (id === null) {
    return {
      status: "error",
      errors: {},
      message: SAFE_UNAVAILABLE_MESSAGE,
      values,
    };
  }

  const input = normalizeInteractionInput({
    connectionId: id,
    interactionType: values.interactionType,
    occurredAt: values.occurredAt,
    notes: values.notes,
  });

  const errors = validateInteractionInput(input);
  if (hasInteractionErrors(errors)) {
    return {
      status: "error",
      errors,
      message: "Check the highlighted fields.",
      values,
    };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsConnection(supabase, userId, id))) {
    return {
      status: "error",
      errors: {},
      message: SAFE_UNAVAILABLE_MESSAGE,
      values,
    };
  }

  // Interactions are created only through this RPC wrapper; nothing inserts
  // into connection_interactions directly. The RPC also moves
  // last_meaningful_contact_at forward in the same transaction.
  const result = await recordConnectionInteraction(supabase, input);

  if (result.status === "error") {
    if (result.reason === "not_available") {
      return {
        status: "error",
        errors: {},
        message: SAFE_UNAVAILABLE_MESSAGE,
        values,
      };
    }
    if (result.reason === "invalid") {
      return {
        status: "error",
        errors: { occurredAt: "Check the date and time, then try again." },
        message: "That interaction could not be recorded.",
        values,
      };
    }
    return {
      status: "error",
      errors: {},
      message: "We could not record this interaction. Please try again.",
      values,
    };
  }

  revalidatePath("/connections");
  revalidatePath(`/connections/${id}`);
  return {
    status: "success",
    errors: {},
    message: "Interaction recorded.",
    values: EMPTY_INTERACTION_FORM,
  };
}

// ---------------------------------------------------------------------------
// Deactivate / reactivate
// ---------------------------------------------------------------------------

// Shared implementation. The connection id is bound on the server, so these two
// actions take no form payload: the direction is fixed by which action the
// detail page binds to the button.
async function setConnectionActive(
  connectionId: number,
  nextActive: boolean,
): Promise<ConnectionActiveState> {
  const id = toSafeId(connectionId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsConnection(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { error } = await supabase
    .from("connections")
    .update({ is_active: nextActive })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to change connection active state:", error.message);
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidatePath("/connections");
  revalidatePath(`/connections/${id}`);
  return {
    status: "success",
    message: nextActive
      ? "Connection reactivated."
      : "Connection set as inactive.",
  };
}

export async function deactivateConnection(
  connectionId: number,
): Promise<ConnectionActiveState> {
  return setConnectionActive(connectionId, false);
}

export async function reactivateConnection(
  connectionId: number,
): Promise<ConnectionActiveState> {
  return setConnectionActive(connectionId, true);
}
