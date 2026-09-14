// Shared return shape for every Pass 7 media Server Action (avatar/cover,
// post image attach/remove, community avatar/cover). A plain success/error
// message — never a raw database or Storage error string.
export type MediaActionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string };
