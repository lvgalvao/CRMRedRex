import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { insertDeal as repoInsertDeal, updateDeal as repoUpdateDeal } from "@/lib/supabase/deals";
import { getContact } from "@/lib/supabase/contacts";
import { getDeal } from "@/lib/supabase/deals";
import { listStages } from "@/lib/supabase/stages";
import { transitionForStage } from "./dealStage";
import { parseCreateDeal, parseEditDeal } from "./deals.schema";
import type { Deal } from "@/lib/supabase/types";

// Regra de negócio das Oportunidades (FR-001..FR-008, FR-021). UI/rotas só chamam estes
// serviços. Validação pura em deals.schema.ts; mapeamento de etapas em dealStage.ts.

export * from "./deals.schema";

/**
 * Cria uma Oportunidade (FR-001..FR-005).
 * - valida a entrada (zod)
 * - o contato precisa pertencer ao cliente informado (FR-003)
 * - sem responsável explícito, assume o usuário logado (FR-004)
 * - nasce sempre com status 'open' (FR-005)
 */
export async function createDeal(input: unknown): Promise<Deal> {
  const data = parseCreateDeal(input);
  const db = await createClient();

  const contact = await getContact(db, data.contact_id);
  if (!contact) throw new Error("Contato não encontrado.");
  if (contact.company_id && contact.company_id !== data.company_id) {
    throw new Error("O contato selecionado não pertence a este cliente.");
  }

  let ownerId = data.owner_id ?? null;
  if (!ownerId) {
    const profile = await getCurrentProfile();
    ownerId = profile?.id ?? null;
  }

  return repoInsertDeal(db, {
    title: data.title,
    company_id: data.company_id ?? contact.company_id ?? null,
    contact_id: data.contact_id,
    stage_id: data.stage_id,
    owner_id: ownerId,
    value: data.value ?? 0,
    probability: data.probability ?? null, // null = herda a etapa (FR-008)
    expected_close_date: data.expected_close_date ?? null,
    next_action: data.next_action ?? null,
    next_action_date: data.next_action_date ?? null,
    status: "open",
  });
}

/**
 * Edita campos gerais da Oportunidade (FR-021, FR-025).
 * Etapa e status têm caminhos próprios (moveDeal / closeDeal).
 */
export async function editDeal(dealId: string, patch: unknown): Promise<Deal> {
  const data = parseEditDeal(patch);
  const db = await createClient();

  // Trocar contato/cliente exige que os dois continuem coerentes (FR-003).
  if (data.contact_id || data.company_id) {
    const contactId = data.contact_id;
    if (contactId) {
      const contact = await getContact(db, contactId);
      if (!contact) throw new Error("Contato não encontrado.");
      if (data.company_id && contact.company_id && contact.company_id !== data.company_id) {
        throw new Error("O contato selecionado não pertence a este cliente.");
      }
    }
  }

  const { ...campos } = data;
  return repoUpdateDeal(db, dealId, campos as Partial<Deal>);
}

/**
 * Move a Oportunidade entre etapas (FR-011, FR-012, FR-014).
 * - mesma etapa: no-op, para não poluir o histórico com ruído de drag-and-drop
 * - etapa terminal: aplica o status correspondente (Ganho/Perdido/Stand-by)
 * - etapa ativa com deal fechado: reabre, limpando motivo de perda e reaquecimento
 *
 * Etapa, posição e status vão no MESMO update: o trigger deals_log_change grava
 * um único registro de histórico, na mesma transação (FR-020).
 */
export async function moveDeal(dealId: string, stageId: string, position: number): Promise<Deal> {
  const db = await createClient();

  const deal = await getDeal(db, dealId);
  if (!deal) throw new Error("Oportunidade não encontrada.");
  if (deal.stage_id === stageId) return deal;

  const stages = await listStages(db);
  const destino = stages.find((s) => s.id === stageId);
  if (!destino) throw new Error("Etapa não encontrada.");

  const patchDeStatus = transitionForStage(deal.status, destino.name);

  return repoUpdateDeal(db, dealId, {
    stage_id: stageId,
    position,
    ...patchDeStatus,
  });
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
