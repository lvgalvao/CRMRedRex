import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profiles";
import type { Profile } from "@/lib/supabase/types";

// Duas otimizações que valem ~2 idas de rede por navegação:
//
// 1. getClaims() em vez de getUser(): o projeto assina o JWT com ES256 (chave
//    assimétrica), então a assinatura é verificada LOCALMENTE contra o JWKS —
//    sem round-trip ao Supabase Auth a cada request. É criptograficamente
//    seguro, ao contrário de getSession(), que confia no cookie sem validar.
// 2. cache() do React: layout e página chamam getCurrentProfile(), mas o
//    trabalho acontece uma vez só por request.

export type AuthUser = { id: string; email: string | null; name: string | null };

/** Usuário autenticado, validado pela assinatura do JWT. Deduplicado por request. */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as { name?: string };
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    name: meta.name ?? null,
  };
});

/** Retorna o profile do usuário autenticado (bootstrap se necessário) ou null. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const fallbackName = user.email?.split("@")[0] ?? "Membro";
  return ensureProfile(supabase, user.id, user.name ?? fallbackName);
});
