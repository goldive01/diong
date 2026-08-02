import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyPrime, Database } from "@/src/types/database";

export type DailyPrimeResult =
  | { status: "ready"; prime: DailyPrime }
  | { status: "empty" }
  | { status: "error" };

export async function getDailyPrime(
  supabase: SupabaseClient<Database>,
): Promise<DailyPrimeResult> {
  const { data, error } = await supabase.rpc("get_or_assign_daily_prime");

  if (error) {
    console.error("Unable to load Daily Prime:", error.message);
    return { status: "error" };
  }

  const prime = data?.[0];
  return prime ? { status: "ready", prime } : { status: "empty" };
}
