import type { Contact, Deal, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export type DealWithContact = Deal & { contact: Contact | null };

export async function listDeals(db: DB): Promise<DealWithContact[]> {
  const { data, error } = await db
    .from("deals")
    .select("*, contact:contacts(*)")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DealWithContact[];
}

export async function getDeal(db: DB, id: string): Promise<DealWithContact | null> {
  const { data, error } = await db
    .from("deals")
    .select("*, contact:contacts(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DealWithContact | null) ?? null;
}

export async function findDealByCalendlyUid(db: DB, uid: string): Promise<Deal | null> {
  const { data, error } = await db
    .from("deals")
    .select("*")
    .eq("calendly_event_uid", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertDeal(db: DB, input: Partial<Deal>): Promise<Deal> {
  const { data, error } = await db.from("deals").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateDeal(db: DB, id: string, patch: Partial<Deal>): Promise<Deal> {
  const { data, error } = await db
    .from("deals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
