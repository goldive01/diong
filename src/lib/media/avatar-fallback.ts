export function getInitials(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim() ?? "";

  if (trimmed.length === 0) {
    return "?";
  }

  return trimmed.charAt(0).toUpperCase();
}
