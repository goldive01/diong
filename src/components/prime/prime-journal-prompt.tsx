import Link from "next/link";

// Shown only after today's Daily Prime is completed. Two calm, optional
// links into the private Journal — writing is never required, and neither
// link changes Prime assignment/completion logic in any way. Goal linking
// happens inside the journal form itself (its own "Link a goal" dropdown);
// this second link is just a lighter-weight entry point into the same page.
export function PrimeJournalPrompt({ assignmentId }: { assignmentId: number }) {
  const href = `/journal/new?primeAssignmentId=${assignmentId}`;

  return (
    <div className="rounded-2xl border border-[#e0dacd] bg-[#faf8f3] p-4 text-sm">
      <Link href={href} className="font-semibold text-[#59654a] hover:underline">
        Reflect further in Journal →
      </Link>
      <p className="mt-1 text-[#69726c]">
        Optional.{" "}
        <Link href={href} className="font-semibold text-[#59654a] hover:underline">
          Connect this reflection to a goal
        </Link>{" "}
        from the entry form.
      </p>
    </div>
  );
}
