import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

/**
 * The active interest names the user selected during onboarding, ordered for
 * display. Read failures are logged server-side and yield an empty list so a
 * transient database problem never breaks /home or a profile page, and no raw
 * database text can reach the browser.
 */
export async function getInterestNames(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data: selections, error: selectionsError } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", userId);

  if (selectionsError) {
    console.error(
      "Unable to load interest selections:",
      selectionsError.message,
    );
    return [];
  }

  const ids = selections?.map((selection) => selection.interest_id) ?? [];
  if (ids.length === 0) return [];

  const { data: interests, error: interestsError } = await supabase
    .from("interests")
    .select("name, sort_order")
    .in("id", ids)
    .eq("is_active", true)
    .order("sort_order");

  if (interestsError) {
    console.error("Unable to load interest names:", interestsError.message);
    return [];
  }

  return interests?.map((interest) => interest.name) ?? [];
}
