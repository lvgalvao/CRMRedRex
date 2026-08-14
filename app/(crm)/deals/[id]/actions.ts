"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { setNextAction, editDeal, moveDeal } from "@/lib/services/deals";
import { fieldErrors } from "@/lib/services/deals.schema";
import type { DealFormState } from "../actions";
import { addNote } from "@/lib/services/activities";
import { closeDeal } from "@/lib/services/closeDeal";
import { createProposalVersion, updateProposalStatus } from "@/lib/services/proposals";
import type { ProposalStatus } from "@/lib/supabase/types";

function revalidate(dealId: string) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/pipeline");
  revalidatePath("/hoje");
}

export async function setNextActionAction(dealId: string, formData: FormData) {
  await setNextAction(
    dealId,
    String(formData.get("next_action") ?? "") || null,
    String(formData.get("next_action_date") ?? "") || null,
  );
  revalidate(dealId);
}

export async function setOwnerAction(dealId: string, formData: FormData) {
  const ownerId = String(formData.get("owner_id") ?? "") || null;
  await editDeal(dealId, { owner_id: ownerId });
  revalidate(dealId);
}

export async function changeStageAction(dealId: string, formData: FormData) {
  const stageId = String(formData.get("stage_id") ?? "").trim();
  if (!stageId) return;
  // position 0: entra no topo da coluna de destino. O histórico é gravado pelo
  // trigger, na mesma transação do update (FR-020).
  await moveDeal(dealId, stageId, 0);
  revalidate(dealId);
}

export async function addNoteAction(dealId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (content) await addNote(dealId, content);
  revalidate(dealId);
}

export async function closeDealAction(dealId: string, formData: FormData) {
  const raw: Record<string, unknown> = { status: formData.get("status") };
  if (raw.status === "won") {
    raw.deal_type = formData.get("deal_type");
    if (raw.deal_type === "recorrente") raw.mrr = Number(formData.get("mrr") ?? 0);
  } else if (raw.status === "lost") {
    raw.lost_reason = formData.get("lost_reason");
  } else if (raw.status === "standby") {
    raw.reaquecer_em = formData.get("reaquecer_em");
  }
  await closeDeal(dealId, raw);
  revalidate(dealId);
}

export async function createProposalAction(dealId: string, formData: FormData) {
  await createProposalVersion(dealId, {
    value: Number(formData.get("value") ?? 0) || 0,
    valid_until: String(formData.get("valid_until") ?? "") || null,
    doc_url: String(formData.get("doc_url") ?? "") || null,
  });
  revalidate(dealId);
}

export async function updateProposalStatusAction(proposalId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "rascunho") as ProposalStatus;
  await updateProposalStatus(proposalId, status);
  // Revalida amplo: o deal pode ter mudado de etapa.
  revalidatePath("/pipeline");
  revalidatePath("/hoje");
}

/** Texto do formulário -> string ou undefined (campo vazio não vira ""). */
function texto(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
}

function numero(v: FormDataEntryValue | null): number | undefined {
  const s = texto(v);
  return s === undefined ? undefined : Number(s);
}

/**
 * Edição da Oportunidade (FR-021). Etapa e status NÃO passam por aqui:
 * têm caminho próprio (changeStageAction / closeDealAction), que registra histórico.
 */
export async function editDealAction(
  dealId: string,
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    await editDeal(dealId, {
      title: texto(formData.get("title")),
      company_id: texto(formData.get("company_id")),
      contact_id: texto(formData.get("contact_id")),
      value: numero(formData.get("value")),
      probability: numero(formData.get("probability")) ?? null,
      owner_id: texto(formData.get("owner_id")) ?? null,
      expected_close_date: texto(formData.get("expected_close_date")) ?? null,
      next_action: texto(formData.get("next_action")) ?? null,
      next_action_date: texto(formData.get("next_action_date")) ?? null,
    });
  } catch (error) {
    if (error instanceof ZodError) return { errors: fieldErrors(error) };
    return { message: error instanceof Error ? error.message : "Não foi possível salvar." };
  }

  revalidate(dealId);
  revalidatePath("/deals");
  redirect(`/deals/${dealId}`);
}
