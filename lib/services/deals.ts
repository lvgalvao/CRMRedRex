import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  insertDeal as repoInsertDeal,
  updateDeal as repoUpdateDeal,
} from "@/lib/supabase/deals";
import type { Deal } from "@/lib/supabase/types";

// Regra de negócio dos deals (FR-004, FR-008). UI/rotas só chamam estes serviços.

export type CreateDealInput = {
  contact_id: string;
  stage_id: string;
  title: string;
  value?: number;
  owner_id?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
};

/** Cria um deal; atribui owner_id (default = usuário logado). */
export async function createDeal(input: CreateDealInput): Promise<Deal> {
  const db = await createClient();
  let ownerId = input.owner_id ?? null;
  if (!ownerId) {
    const profile = await getCurrentProfile();
    ownerId = profile?.id ?? null;
  }
  return repoInsertDeal(db, {
    contact_id: input.contact_id,
    stage_id: input.stage_id,
    title: input.title,
    value: input.value ?? 0,
    owner_id: ownerId,
    next_action: input.next_action ?? null,
    next_action_date: input.next_action_date ?? null,
  });
}

/** Edita campos gerais do deal. */
export async function editDeal(dealId: string, patch: Partial<Deal>): Promise<Deal> {
  const db = await createClient();
  return repoUpdateDeal(db, dealId, patch);
}

/** Move o deal entre etapas, persistindo stage_id + position (Kanban). */
export async function moveDeal(dealId: string, stageId: string, position: number): Promise<Deal> {
  const db = await createClient();
  return repoUpdateDeal(db, dealId, { stage_id: stageId, position });
}

/** Define a próxima ação e a data (alimenta a tela "Hoje"). */
export async function setNextAction(
  dealId: string,
  nextAction: string | null,
  nextActionDate: string | null,
): Promise<Deal> {
  const db = await createClient();
  return repoUpdateDeal(db, dealId, {
    next_action: nextAction,
    next_action_date: nextActionDate,
  });
}
