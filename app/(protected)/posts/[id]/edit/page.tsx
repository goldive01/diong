import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getPost } from "@/src/lib/social/post-data";
import { PostEditForm } from "@/src/components/social/post-edit-form";

export const metadata = {
  title: "Edit post",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { id } = await params;

  const postId = /^\d+$/.test(id) ? Number(id) : Number.NaN;
  const post = await getPost(supabase, postId);

  // Missing / not visible, or visible but not the caller's own post → branded
  // 404 (non-disclosing, matches the rest of Diong).
  if (!post || !post.isAuthor) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/posts/${post.id}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to post
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Edit post</h1>
        <p className="mt-2 text-sm text-[#5f6962]">
          You can change the wording and who can see it. The post keeps its
          original time and is marked as edited.
        </p>
        <div className="mt-6">
          <PostEditForm post={post} />
        </div>
      </section>
    </main>
  );
}
