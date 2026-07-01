import { createClient } from "@/lib/supabase/server";
import { insertActivity } from "@/lib/supabase/activities";
import type { Activity, ActivityType } from "@/lib/supabase/types";

// Registro de atividades na timeline (FR-006).

export async function logActivity(input: {
  type: ActivityType;
  deal_id?: string | null;
  contact_id?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<Activity> {
  const db = await createClient();
  return insertActivity(db, input);
}

/** Atalho para registrar uma nota simples em um deal. */
export async function addNote(dealId: string, content: string): Promise<Activity> {
  return logActivity({ deal_id: dealId, type: "note", content });
}
