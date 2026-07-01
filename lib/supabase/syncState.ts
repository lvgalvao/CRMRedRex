import type { TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function getSyncValue(db: DB, key: string): Promise<string | null> {
  const { data, error } = await db.from("sync_state").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data as { value: string | null } | null)?.value ?? null;
}

export async function setSyncValue(db: DB, key: string, value: string): Promise<void> {
  const { error } = await db
    .from("sync_state")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}
