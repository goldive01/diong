import { requireCompletedProfile } from "@/src/lib/auth";
import { AppHeader } from "@/src/components/app/app-header";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireCompletedProfile();
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1d2420]">
      <AppHeader />
      <div id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </div>
    </div>
  );
}
