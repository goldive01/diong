"use client";

import { ImageUploadField } from "@/src/components/media/image-upload-field";
import { buildAvatarPath, buildCoverPath } from "@/src/lib/media/storage-paths";
import {
  removeAvatar,
  removeCover,
  updateAvatar,
  updateCover,
} from "@/app/(protected)/settings/profile/actions";

export function ProfileMediaSettings({
  userId,
  avatarPath,
  coverPath,
  displayName,
}: {
  userId: string;
  avatarPath: string | null;
  coverPath: string | null;
  displayName: string;
}) {
  return (
    <div className="space-y-8">
      <ImageUploadField
        label="Profile avatar"
        helpText="JPEG, PNG or WEBP. Up to 3 MB."
        context="avatar"
        currentPath={avatarPath}
        buildPath={(mimeType) => buildAvatarPath(userId, mimeType)}
        onUpload={updateAvatar}
        onRemove={removeAvatar}
        shape="circle"
        fallbackLabel={displayName}
      />

      <ImageUploadField
        label="Profile cover"
        helpText="JPEG, PNG or WEBP. Up to 5 MB."
        context="cover"
        currentPath={coverPath}
        buildPath={(mimeType) => buildCoverPath(userId, mimeType)}
        onUpload={updateCover}
        onRemove={removeCover}
        shape="banner"
      />
    </div>
  );
}
