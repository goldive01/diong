const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForMimeType(mimeType: string): string | null {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? null;
}

export function buildAvatarPath(userId: string, mimeType: string): string | null {
  const ext = extensionForMimeType(mimeType);
  if (!ext) {
    return null;
  }

  return `profiles/${userId}/avatar/${crypto.randomUUID()}.${ext}`;
}

export function buildCoverPath(userId: string, mimeType: string): string | null {
  const ext = extensionForMimeType(mimeType);
  if (!ext) {
    return null;
  }

  return `profiles/${userId}/cover/${crypto.randomUUID()}.${ext}`;
}

export function buildPostMediaPath(
  userId: string,
  postId: number | string,
  mimeType: string,
): string | null {
  const ext = extensionForMimeType(mimeType);
  if (!ext) {
    return null;
  }

  return `posts/${userId}/${postId}/${crypto.randomUUID()}.${ext}`;
}

export function buildCommunityAvatarPath(
  ownerUserId: string,
  communityId: number | string,
  mimeType: string,
): string | null {
  const ext = extensionForMimeType(mimeType);
  if (!ext) {
    return null;
  }

  return `communities/${ownerUserId}/${communityId}/avatar/${crypto.randomUUID()}.${ext}`;
}

export function buildCommunityCoverPath(
  ownerUserId: string,
  communityId: number | string,
  mimeType: string,
): string | null {
  const ext = extensionForMimeType(mimeType);
  if (!ext) {
    return null;
  }

  return `communities/${ownerUserId}/${communityId}/cover/${crypto.randomUUID()}.${ext}`;
}

export function isOwnedPath(path: string | null | undefined, expectedPrefix: string): boolean {
  if (!path) {
    return false;
  }

  return path.startsWith(expectedPrefix);
}
