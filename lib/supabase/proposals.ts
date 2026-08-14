import type { Proposal, ProposalStatus, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listProposalsByDeal(db: DB, dealId: string): Promise<Proposal[]> {
  const { data, error } = await db
    .from("proposals")
    .select("*")
    .eq("deal_id", dealId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProposal(db: DB, id: string): Promise<Proposal | null> {
  const { data, error } = await db.from("proposals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function maxVersion(db: DB, dealId: string): Promise<number> {
  const { data, error } = await db
    .from("proposals")
    .select("version")
    .eq("deal_id", dealId)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? (data[0] as { version: number }).version : 0;
}

export async function insertProposal(db: DB, input: Partial<Proposal>): Promise<Proposal> {
  const { data, error } = await db.from("proposals").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateProposal(
  db: DB,
  id: string,
  patch: {
    status?: ProposalStatus;
    value?: number;
    valid_until?: string | null;
    doc_url?: string | null;
  },
): Promise<Proposal> {
  const { data, error } = await db
    .from("proposals")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
