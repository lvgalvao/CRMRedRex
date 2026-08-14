import type { Goal, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listGoalsByMonth(db: DB, month: string): Promise<Goal[]> {
  const { data, error } = await db.from("goals").select("*").eq("month", month);
  if (error) throw error;
  return data ?? [];
}

/** Cria/atualiza a meta (owner_id null = time) para o mês (UNIQUE owner_id+month). */
export async function upsertGoal(
  db: DB,
  input: { owner_id: string | null; month: string; target_value: number },
): Promise<void> {
  const { error } = await db.from("goals").upsert(input, { onConflict: "owner_id,month" });
  if (error) throw error;
}
