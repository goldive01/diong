import Link from "next/link";
import type { PersonSummary } from "@/src/lib/social/social-data";
import { truncateBio } from "@/src/lib/social/social-labels";
import { Avatar } from "@/src/components/media/avatar";

// A restrained person card for the followers / following lists. Shows only the
// public profile basics and links to the full profile. No follow control here —
// follow / block happens on the profile itself.
export function PersonCard({ person }: { person: PersonSummary }) {
  const bio = truncateBio(person.bio);

  return (
    <Link
      href={`/profile/${person.username}`}
      className="block rounded-2xl border border-[#e0dacd] bg-white p-4 outline-none transition hover:border-[#b9c3a3] focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/30"
    >
      <div className="flex items-start gap-3">
        <Avatar avatarPath={person.avatarPath} displayName={person.displayName} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1d2420]">
            {person.displayName}
          </p>
          <p className="truncate text-sm text-[#657052]">@{person.username}</p>
          {bio && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5f6962]">
              {bio}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
