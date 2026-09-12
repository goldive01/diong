import { NextResponse, type NextRequest } from "next/server";
import { requireCompletedProfile } from "@/src/lib/auth";
import { markNotificationRead } from "@/src/lib/social/notification-mutations";

// GET /notifications/open/<id>?to=<local-path> — a Route Handler, not a page,
// so opening a notification link marks it read and redirects with zero
// client JavaScript. `to` is generated server-side by notificationHref() when
// the list was rendered, but is re-validated independently here against a
// strict allow-list before it is ever used in a redirect: this closes any
// open-redirect risk even though the value is same-origin-generated.
const SAFE_TARGET_RE = /^\/(posts\/\d+|profile\/[a-z0-9_]{3,30})$/;

function toSafeId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase } = await requireCompletedProfile();
  const { id } = await params;
  const notificationId = toSafeId(id);

  if (notificationId !== null) {
    await markNotificationRead(supabase, notificationId);
  }

  const to = request.nextUrl.searchParams.get("to") ?? "";
  const destination = SAFE_TARGET_RE.test(to) ? to : "/notifications";

  return NextResponse.redirect(new URL(destination, request.url));
}
