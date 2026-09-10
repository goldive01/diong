import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getPrimeHistoryAssignment } from "@/src/lib/prime-data";
import { parsePrimeAssignmentId } from "@/src/lib/prime-history";
import { PrimeHistoryDetailView } from "@/src/components/prime/prime-history-detail";

export const metadata = {
  title: "Prime history",
};

export default async function PrimeHistoryDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { assignmentId } = await params;

  const id = parsePrimeAssignmentId(assignmentId);
  if (id === null) notFound();

  // Returns null for a missing assignment or one owned by another user; both
  // collapse to notFound() so no history is ever exposed across users.
  const detail = await getPrimeHistoryAssignment(supabase, userId, id);
  if (!detail) notFound();

  return <PrimeHistoryDetailView detail={detail} />;
}
