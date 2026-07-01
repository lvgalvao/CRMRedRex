"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profiles";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Bootstrap do profile no primeiro login (FR-002).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const fallbackName = user.email?.split("@")[0] ?? "Membro";
    await ensureProfile(supabase, user.id, (user.user_metadata?.name as string) ?? fallbackName);
  }

  redirect("/hoje");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
