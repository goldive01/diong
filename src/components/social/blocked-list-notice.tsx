import Link from "next/link";

// Shown on the followers / following routes when the viewer has blocked the
// profile owner. Restrained: no list, a route back to the profile where the
// block can be lifted.
export function BlockedListNotice({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/profile/${username}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← {displayName}
      </Link>
      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          This list is hidden
        </h1>
        <p className="mt-3 leading-7 text-[#5f6962]">
          You blocked this account, so its followers and following are not
          shown. You can unblock from{" "}
          <Link
            href={`/profile/${username}`}
            className="font-semibold text-[#59654a] hover:underline"
          >
            their profile
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
