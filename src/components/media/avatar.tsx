import Image from "next/image";
import { getInitials } from "@/src/lib/media/avatar-fallback";
import { getPublicMediaUrl } from "@/src/lib/media/media-url";

// A single reusable avatar: the uploaded image when `avatarPath` resolves to
// one, otherwise the calm initials-circle fallback already used across the
// app (profile header, person cards, conversation rows). Decorative
// (`aria-hidden`) in both states — the adjacent name/username text is always
// the accessible label, matching every existing call site.
export function Avatar({
  avatarPath,
  displayName,
  size = 40,
  className = "",
}: {
  avatarPath: string | null | undefined;
  displayName: string;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}) {
  const url = getPublicMediaUrl(avatarPath);

  if (url) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 overflow-hidden rounded-full bg-[#dfe6d2] ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#dfe6d2] font-semibold text-[#465331] ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }}
    >
      {getInitials(displayName)}
    </span>
  );
}
