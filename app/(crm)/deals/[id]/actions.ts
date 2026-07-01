"use server";

import { revalidatePath } from "next/cache";
import { setNextAction, editDeal } from "@/lib/services/deals";
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
