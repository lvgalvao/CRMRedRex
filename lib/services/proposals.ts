import { createClient } from "@/lib/supabase/server";
import { getStageByName } from "@/lib/supabase/stages";
import { updateDeal } from "@/lib/supabase/deals";
import { insertActivity } from "@/lib/supabase/activities";
import {
  listProposalsByDeal,
  getProposal,
  maxVersion,
  insertProposal,
  updateProposal,
} from "@/lib/supabase/proposals";
import type { Proposal, ProposalStatus } from "@/lib/supabase/types";

// Propostas como objeto de 1a classe (FR-011/FR-012).

// Mudança de status -> etapa correspondente do deal.
const STATUS_TO_STAGE: Partial<Record<ProposalStatus, string>> = {
  enviada: "Proposta enviada",
  aceita: "Negociação",
};

export async function listProposals(dealId: string): Promise<Proposal[]> {
  const db = await createClient();
  return listProposalsByDeal(db, dealId);
}

/** Cria uma nova versão da proposta (incrementa version, preserva histórico). */
export async function createProposalVersion(
  dealId: string,
  input: { value: number; valid_until?: string | null; doc_url?: string | null },
): Promise<{ proposalId: string; version: number }> {
  const db = await createClient();
  const version = (await maxVersion(db, dealId)) + 1;
  const proposal = await insertProposal(db, {
    deal_id: dealId,
    version,
    value: input.value,
    status: "rascunho",
    valid_until: input.valid_until ?? null,
    doc_url: input.doc_url ?? null,
  });
  await insertActivity(db, {
    deal_id: dealId,
    type: "proposal",
    content: `Proposta v${version} criada (rascunho).`,
    metadata: { proposalId: proposal.id, version },
  });
  return { proposalId: proposal.id, version };
}

/** Atualiza o status da proposta e move o deal para a etapa correspondente. */
export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus,
): Promise<void> {
  const db = await createClient();
  const proposal = await getProposal(db, proposalId);
  if (!proposal) throw new Error("Proposta não encontrada.");

  await updateProposal(db, proposalId, { status });

  const stageName = STATUS_TO_STAGE[status];
  if (stageName) {
    const stage = await getStageByName(db, stageName);
    if (stage) await updateDeal(db, proposal.deal_id, { stage_id: stage.id });
  }

  await insertActivity(db, {
    deal_id: proposal.deal_id,
    type: "proposal",
    content: `Proposta v${proposal.version} -> ${status}.`,
    metadata: { proposalId, status },
  });
}
