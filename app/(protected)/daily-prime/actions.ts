"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, requireCompletedProfile } from "@/src/lib/auth";
import {
  normalizePrimeReflection,
  readPrimeReflectionFormValues,
  validatePrimeReflection,
  type SavePrimeReflectionState,
} from "@/src/lib/prime-reflection";

export type CompletePrimeState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function completeDailyPrime(
  _previousState: CompletePrimeState,
  formData: FormData,
): Promise<CompletePrimeState> {
  const rawAssignmentId = formData.get("assignmentId");
  const assignmentId =
    typeof rawAssignmentId === "string" ? Number(rawAssignmentId) : Number.NaN;

  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
    return { status: "error", message: "This Daily Prime could not be completed." };
  }

  const { supabase } = await requireAuthenticatedUser();
  const { error } = await supabase.rpc("complete_daily_prime", {
    p_assignment_id: assignmentId,
  });

  if (error) {
    console.error("Unable to complete Daily Prime:", error.message);
    return {
      status: "error",
      message: "We could not save your completion. Please try again.",
    };
  }

  revalidatePath("/daily-prime");
  return { status: "success", message: "Action Trigger completed for today." };
}

/**
 * Save (or update, or clear) the reflection for today's completed Prime.
 *
 * The assignment id is a bound first argument supplied by the server component
 * — never a form field — so the browser cannot target another assignment. The
 * RPC additionally checks ownership and that the assignment is today's, and
 * requires an existing completion. Raw database errors are only logged; the
 * browser sees a safe generic message.
 */
export async function savePrimeReflection(
  assignmentId: number,
  _previousState: SavePrimeReflectionState,
  formData: FormData,
): Promise<SavePrimeReflectionState> {
  const reflection = normalizePrimeReflection(
    readPrimeReflectionFormValues(formData).reflection,
  );
  const values = { reflection };

  const fieldError = validatePrimeReflection(reflection);
  if (fieldError) {
    return {
      status: "error",
      message: "Please review your reflection and try again.",
      error: fieldError,
      values,
    };
  }

  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
    return {
      status: "error",
      message: "This reflection could not be saved.",
      values,
    };
  }

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("save_prime_reflection", {
    p_assignment_id: assignmentId,
    p_reflection: reflection === "" ? null : reflection,
  });

  if (error) {
    console.error("Unable to save Prime reflection:", error.message);
    return {
      status: "error",
      message: "We could not save your reflection. Please try again.",
      values,
    };
  }

  revalidatePath("/daily-prime");
  revalidatePath("/daily-prime/history");
  revalidatePath(`/daily-prime/history/${assignmentId}`);
  return { status: "success", message: "Reflection saved.", values };
}
