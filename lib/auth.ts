import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profiles";
import type { Profile } from "@/lib/supabase/types";

/** Retorna o profile do usuário autenticado (bootstrap se necessário) ou null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const fallbackName = user.email?.split("@")[0] ?? "Membro";
  return ensureProfile(supabase, user.id, (user.user_metadata?.name as string) ?? fallbackName);
}
