import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getInterestNames } from "@/src/lib/profile-data";
import { getSocialProfile } from "@/src/lib/social/social-data";
import { listUserPosts } from "@/src/lib/social/post-data";
import { FEED_PAGE_SIZE } from "@/src/lib/social/post-validation";
import { ProfileSocialPanel } from "@/src/components/social/profile-social-panel";
import { PostFeed } from "@/src/components/social/post-feed";
import { loadMoreUserPosts } from "@/app/(protected)/posts/actions";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { username } = await params;

  // get_social_profile() returns no row for an unknown username OR when the
  // owner has blocked the viewer — both collapse to notFound(), so a blocking
  // profile is indistinguishable from a missing one.
  const social = await getSocialProfile(supabase, decodeURIComponent(username));
  if (!social) notFound();

  // When the viewer has blocked the owner, the panel shows a restrained
  // "blocked" state and interests / activity are withheld.
  const interestNames = social.viewer_blocked
    ? []
    : await getInterestNames(supabase, social.id);

  // Only posts this viewer is authorised to see — list_user_posts applies the
  // same visibility + block model as the feed, and returns nothing when a block
  // stands between the two accounts.
  const posts = social.viewer_blocked
    ? { posts: [], nextCursor: null }
    : await listUserPosts(supabase, social.id, { limit: FEED_PAGE_SIZE });

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <section className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <div
          aria-hidden="true"
          className="flex size-20 items-center justify-center rounded-full bg-[#dfe6d2] text-3xl font-semibold text-[#465331]"
        >
          {social.display_name.charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          {social.display_name}
        </h1>
        <p className="mt-2 font-medium text-[#657052]">@{social.username}</p>

        {!social.viewer_blocked && social.bio && (
          <p className="mt-6 whitespace-pre-wrap leading-7 text-[#4f5952]">
            {social.bio}
          </p>
        )}

        <ProfileSocialPanel profile={social} />

        {!social.viewer_blocked && interestNames.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-2" aria-label="Interests">
            {interestNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-[#eef2e5] px-3 py-1.5 text-sm font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </section>

      {!social.viewer_blocked && (
        <section className="mt-6" aria-labelledby="profile-posts-heading">
          <h2
            id="profile-posts-heading"
            className="mb-4 text-lg font-semibold"
          >
            Posts
          </h2>
          <PostFeed
            initialPosts={posts.posts}
            initialCursor={posts.nextCursor}
            loadMore={loadMoreUserPosts.bind(null, social.id)}
            emptyText={
              social.is_self
                ? "You have not shared anything yet."
                : `${social.display_name} has not shared anything you can see yet.`
            }
          />
        </section>
      )}
    </main>
  );
}
