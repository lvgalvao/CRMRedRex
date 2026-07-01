import type { Stage, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listStages(db: DB): Promise<Stage[]> {
  const { data, error } = await db.from("stages").select("*").order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getStageByName(db: DB, name: string): Promise<Stage | null> {
  const { data, error } = await db.from("stages").select("*").eq("name", name).maybeSingle();
  if (error) throw error;
  return data;
}
