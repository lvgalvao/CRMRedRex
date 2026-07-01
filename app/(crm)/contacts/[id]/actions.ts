"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStageByName } from "@/lib/supabase/stages";
import { createDeal } from "@/lib/services/deals";

export async function createDealFromContactAction(contactId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const value = Number(formData.get("value") ?? 0) || 0;

  const db = await createClient();
  // Outbound entra em "Novo lead" (Assumption do spec).
  const stage = (await getStageByName(db, "Novo lead")) ?? null;
  if (!stage) throw new Error("Etapa 'Novo lead' não encontrada (rode o seed).");

  await createDeal({
    contact_id: contactId,
    stage_id: stage.id,
    title,
    value,
    next_action: String(formData.get("next_action") ?? "") || null,
    next_action_date: String(formData.get("next_action_date") ?? "") || null,
  });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/pipeline");
}
