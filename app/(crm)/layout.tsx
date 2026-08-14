import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { listProfiles } from "@/lib/supabase/profiles";
import { logout } from "@/app/(auth)/login/actions";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  // Paralelo: antes eram 3 idas ao Supabase em série (getUser -> getProfile -> listProfiles).
  const db = await createClient();
  const [profile, members] = await Promise.all([getCurrentProfile(), listProfiles(db)]);
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} members={members} logoutAction={logout} />
      <main className="flex-1 overflow-x-hidden bg-background p-6">{children}</main>
    </div>
  );
}
