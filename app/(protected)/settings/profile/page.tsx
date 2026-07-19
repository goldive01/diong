import { requireCompletedProfile } from "@/src/lib/auth";
import { ProfileSettingsForm } from "@/src/components/profile/profile-settings-form";

export default async function ProfileSettingsPage() {
  const { profile } = await requireCompletedProfile();
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <section className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-[#5f6962]">Update how you appear across Diong.</p>
        <ProfileSettingsForm initialValues={{ username: profile.username ?? "", displayName: profile.display_name ?? "", bio: profile.bio ?? "" }} />
      </section>
    </main>
  );
}
