import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getConnection } from "@/src/lib/connections/connections-data";
import { ConnectionDetail } from "@/src/components/connections/connection-detail";

export const metadata = {
  title: "Connection",
};

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { id } = await params;

  // getConnection returns null for a non-numeric id, a missing connection, or
  // one owned by another user. All three collapse to notFound().
  const connection = await getConnection(supabase, userId, Number(id));
  if (!connection) notFound();

  return <ConnectionDetail connection={connection} />;
}
