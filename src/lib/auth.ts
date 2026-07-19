import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types/database";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) return null;
  return { supabase, userId };
}

export async function requireAuthenticatedUser() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/login");
  return auth;
}

export async function redirectAuthenticatedUser() {
  const auth = await getAuthenticatedUser();
  if (!auth) return;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", auth.userId)
    .maybeSingle();
  redirect(profile?.onboarding_completed ? "/home" : "/onboarding");
}

export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export async function requireCompletedProfile() {
  const auth = await requireAuthenticatedUser();
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.userId)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/onboarding");
  return { ...auth, profile };
}
