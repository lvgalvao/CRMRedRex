import type { Profile, Role, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listProfiles(db: DB): Promise<Profile[]> {
  const { data, error } = await db.from("profiles").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProfile(db: DB, id: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Cria o profile no primeiro login se ainda não existir (bootstrap). */
export async function ensureProfile(
  db: DB,
  id: string,
  name: string,
  role: Role = "vendedor",
): Promise<Profile> {
  const existing = await getProfile(db, id);
  if (existing) return existing;
  const { data, error } = await db.from("profiles").insert({ id, name, role }).select("*").single();
  if (error) throw error;
  return data;
}
