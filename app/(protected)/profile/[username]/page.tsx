import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { normalizeUsername } from "@/src/lib/profile-validation";
import { getInterestNames } from "@/src/lib/profile-data";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { supabase } = await requireCompletedProfile();
  const { username } = await params;
  const normalized = normalizeUsername(decodeURIComponent(username));
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, onboarding_completed")
    .eq("username", normalized)
    .eq("onboarding_completed", true)
    .maybeSingle();

  if (!profile?.username || !profile.display_name) notFound();
  const interestNames = await getInterestNames(supabase, profile.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <section className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <div aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-[#dfe6d2] text-3xl font-semibold text-[#465331]">{profile.display_name.charAt(0).toUpperCase()}</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{profile.display_name}</h1>
        <p className="mt-2 font-medium text-[#657052]">@{profile.username}</p>
        {profile.bio && <p className="mt-6 whitespace-pre-wrap leading-7 text-[#4f5952]">{profile.bio}</p>}
        <div className="mt-7 flex flex-wrap gap-2" aria-label="Interests">
          {interestNames.map((name) => <span key={name} className="rounded-full bg-[#eef2e5] px-3 py-1.5 text-sm font-medium">{name}</span>)}
        </div>
      </section>
      <section className="mt-6 rounded-3xl border border-dashed border-[#cfc8bb] p-8 text-center">
        <h2 className="font-semibold">Public activity will appear here later</h2>
        <p className="mt-2 text-sm text-[#68716b]">There is nothing to show yet.</p>
      </section>
    </main>
  );
}
