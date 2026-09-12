import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  getSocialProfile,
  listFollowers,
} from "@/src/lib/social/social-data";
import { parseFollowListPage } from "@/src/lib/social/social-validation";
import { PersonList } from "@/src/components/social/person-list";
import { BlockedListNotice } from "@/src/components/social/blocked-list-notice";

export const metadata = {
  title: "Followers",
};

export default async function FollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { username } = await params;
  const { page: pageParam } = await searchParams;

  const social = await getSocialProfile(supabase, decodeURIComponent(username));
  if (!social) notFound();

  if (social.viewer_blocked) {
    return (
      <BlockedListNotice
        username={social.username}
        displayName={social.display_name}
      />
    );
  }

  const page = parseFollowListPage(pageParam);
  const result = await listFollowers(supabase, social.id, page);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/profile/${social.username}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← {social.display_name}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Followers</h1>
      <p className="mt-1 font-medium text-[#657052]">@{social.username}</p>

      <div className="mt-8">
        <PersonList
          page={result}
          basePath={`/profile/${social.username}/followers`}
          emptyText="No followers yet."
        />
      </div>
    </main>
  );
}
