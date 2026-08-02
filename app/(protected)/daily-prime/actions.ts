"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/src/lib/auth";

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
