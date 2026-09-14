"use client";

import { ImageUploadField } from "@/src/components/media/image-upload-field";
import {
  buildCommunityAvatarPath,
  buildCommunityCoverPath,
} from "@/src/lib/media/storage-paths";
import {
  removeCommunityAvatarAction,
  removeCommunityCoverAction,
  updateCommunityAvatarAction,
  updateCommunityCoverAction,
} from "@/app/(protected)/communities/[slug]/actions";

// Owner-only community branding controls. Rendered only when the viewer is
// the community owner — moderators do not gain branding authority in V1.
export function CommunityMediaSettings({
  communityId,
  slug,
  ownerUserId,
  avatarPath,
  coverPath,
  communityName,
}: {
  communityId: number;
  slug: string;
  ownerUserId: string;
  avatarPath: string | null;
  coverPath: string | null;
  communityName: string;
}) {
  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-[#e4ded2] bg-[#f7f4ee] p-5">
      <p className="text-sm font-semibold text-[#3e4a41]">Community branding</p>

      <ImageUploadField
        label="Community avatar"
        helpText="JPEG, PNG or WEBP. Up to 3 MB."
        context="community_avatar"
        currentPath={avatarPath}
        buildPath={(mimeType) => buildCommunityAvatarPath(ownerUserId, communityId, mimeType)}
        onUpload={(path) => updateCommunityAvatarAction(communityId, slug, path)}
        onRemove={() => removeCommunityAvatarAction(communityId, slug)}
        shape="circle"
        fallbackLabel={communityName}
      />

      <ImageUploadField
        label="Community cover"
        helpText="JPEG, PNG or WEBP. Up to 5 MB."
        context="community_cover"
        currentPath={coverPath}
        buildPath={(mimeType) => buildCommunityCoverPath(ownerUserId, communityId, mimeType)}
        onUpload={(path) => updateCommunityCoverAction(communityId, slug, path)}
        onRemove={() => removeCommunityCoverAction(communityId, slug)}
        shape="banner"
      />
    </div>
  );
}
