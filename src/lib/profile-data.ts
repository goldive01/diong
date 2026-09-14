import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

/**
 * The active interest names the user selected during onboarding, ordered for
 * display. One round trip via get_interest_names() (Pass 8 Step 3 — replaces
 * a two-step user_interests -> interests client read; the RPC also enforces
 * blocking/onboarding visibility itself rather than relying solely on the
 * caller skipping this for a blocked viewer). Read failures are logged
 * server-side and yield an empty list so a transient database problem never
 * breaks /home or a profile page, and no raw database text can reach the
 * browser.
 */
export async function getInterestNames(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_interest_names", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Unable to load interest names:", error.message);
    return [];
  }

  return data?.map((row) => row.name) ?? [];
}
