import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

export async function getInterestNames(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data: selections } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", userId);
  const ids = selections?.map((selection) => selection.interest_id) ?? [];
  if (ids.length === 0) return [];

  const { data: interests } = await supabase
    .from("interests")
    .select("name, sort_order")
    .in("id", ids)
    .eq("is_active", true)
    .order("sort_order");
  return interests?.map((interest) => interest.name) ?? [];
}
