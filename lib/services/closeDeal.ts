import { createClient } from "@/lib/supabase/server";
import { getStageByName } from "@/lib/supabase/stages";
import { updateDeal } from "@/lib/supabase/deals";
import { insertActivity } from "@/lib/supabase/activities";
import { parseClose, closeToDealPatch, TERMINAL_STAGE } from "./closeDeal.schema";

// Re-export da validação pura para conveniência.
export * from "./closeDeal.schema";

/** Fecha o deal: valida, move para a etapa terminal e registra atividade (FR-007). */
export async function closeDeal(dealId: string, input: unknown): Promise<void> {
  const parsed = parseClose(input);
  const db = await createClient();

  const stage = await getStageByName(db, TERMINAL_STAGE[parsed.status]);
  const patch = closeToDealPatch(parsed);
  if (stage) patch.stage_id = stage.id;

  await updateDeal(db, dealId, patch);
  await insertActivity(db, {
    deal_id: dealId,
    type: "note",
    content: `Deal fechado como "${parsed.status}".`,
    metadata: { kind: "close", ...patch },
  });
}
