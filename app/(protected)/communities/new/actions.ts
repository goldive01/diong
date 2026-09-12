"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  hasCommunityErrors,
  normalizeCommunitySlug,
  validateCommunityInput,
} from "@/src/lib/communities/community-validation";
import {
  readCommunityFormValues,
  type CreateCommunityState,
} from "@/src/lib/communities/community-form-state";
import { createCommunity } from "@/src/lib/communities/community-mutations";
import { communityErrorMessage } from "@/src/lib/communities/community-labels";

export async function createCommunityAction(
  _previousState: CreateCommunityState,
  formData: FormData,
): Promise<CreateCommunityState> {
  const values = readCommunityFormValues(formData);
  const normalized = {
    ...values,
    slug: normalizeCommunitySlug(values.slug),
  };

  const errors = validateCommunityInput(normalized);
  if (hasCommunityErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const { supabase } = await requireCompletedProfile();

  // owner_id is derived from auth.uid() inside create_community() — never a
  // client-supplied column.
  const result = await createCommunity(supabase, normalized);

  if (result.status === "error") {
    if (result.reason === "slug_taken") {
      return {
        errors: { slug: "That slug is already taken." },
        message: "Check the highlighted fields.",
        values,
      };
    }
    return {
      errors: {},
      message: communityErrorMessage(result.reason),
      values,
    };
  }

  revalidatePath("/communities");
  redirect(`/communities/${result.data.slug}`);
}
