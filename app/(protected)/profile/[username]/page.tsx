import { notFound } from "next/navigation";
import Image from "next/image";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getInterestNames } from "@/src/lib/profile-data";
import { getSocialProfile } from "@/src/lib/social/social-data";
import { listUserPosts } from "@/src/lib/social/post-data";
import { FEED_PAGE_SIZE } from "@/src/lib/social/post-validation";
import { ProfileSocialPanel } from "@/src/components/social/profile-social-panel";
import { PostFeed } from "@/src/components/social/post-feed";
import { loadMoreUserPosts } from "@/app/(protected)/posts/actions";
import { Avatar } from "@/src/components/media/avatar";
import { getPublicMediaUrl } from "@/src/lib/media/media-url";

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

  const coverUrl = getPublicMediaUrl(social.cover_path);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <section className="overflow-hidden rounded-3xl border border-[#ded7c9] bg-white">
        <div className="relative aspect-[3/1] w-full bg-gradient-to-br from-[#eef2e5] to-[#f1ede3] sm:aspect-[4/1]">
          {coverUrl && (
            <Image src={coverUrl} alt="" fill sizes="768px" className="object-cover" />
          )}
        </div>

        <div className="px-6 pb-6 sm:px-9 sm:pb-9">
          <div className="-mt-10 sm:-mt-12">
            <Avatar
              avatarPath={social.avatar_path}
              displayName={social.display_name}
              size={88}
              className="border-4 border-white"
            />
          </div>
          <h1 className="mt-4 break-words text-4xl font-semibold tracking-tight">
            {social.display_name}
          </h1>
          <p className="mt-2 break-words font-medium text-[#657052]">@{social.username}</p>

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
        </div>
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
