import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { OnboardingForm } from "@/src/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const auth = await requireAuthenticatedUser();
  let { data: profile } = await auth.supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle();

  if (!profile) {
    const result = await auth.supabase.from("profiles").insert({ id: auth.userId }).select("*").single();
    profile = result.data;
  }
  if (profile?.onboarding_completed) redirect("/home");

  const [{ data: interests }, { data: selected }] = await Promise.all([
    auth.supabase.from("interests").select("*").eq("is_active", true).order("sort_order").order("id"),
    auth.supabase.from("user_interests").select("interest_id").eq("user_id", auth.userId),
  ]);

  return (
    <OnboardingForm
      interests={interests ?? []}
      initialValues={{
        username: profile?.username ?? "",
        displayName: profile?.display_name ?? "",
        bio: profile?.bio ?? "",
        interestIds: selected?.map((item) => item.interest_id) ?? [],
      }}
    />
  );
}
