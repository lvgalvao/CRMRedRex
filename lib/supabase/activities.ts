import type { Activity, ActivityType, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listActivitiesByDeal(db: DB, dealId: string): Promise<Activity[]> {
  const { data, error } = await db
    .from("activities")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listActivitiesByContact(db: DB, contactId: string): Promise<Activity[]> {
  const { data, error } = await db
    .from("activities")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertActivity(
  db: DB,
  input: {
    type: ActivityType;
    deal_id?: string | null;
    contact_id?: string | null;
    content?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<Activity> {
  const { data, error } = await db.from("activities").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/** Verifica se já existe atividade com dado metadata key/value (idempotência). */
export async function existsActivityByMeta(
  db: DB,
  type: ActivityType,
  metaKey: string,
  metaValue: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("activities")
    .select("id")
    .eq("type", type)
    .contains("metadata", { [metaKey]: metaValue })
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}
