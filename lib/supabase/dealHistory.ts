import type { DealStatus, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

// Repositório SOMENTE LEITURA: a escrita em deal_history é exclusiva do trigger
// deals_log_change (migration 0002). A RLS não tem policy de insert/update/delete,
// então o histórico é imutável também pela API (FR-018).

export type DealHistoryEntry = {
  id: string;
  created_at: string;
  changed_by: string | null;
  author_name: string | null; // null => exibir "Sistema"
  from_stage: { id: string; name: string } | null;
  to_stage: { id: string; name: string } | null;
  from_status: DealStatus | null;
  to_status: DealStatus | null;
  dwell_seconds: number | null;
};

type Row = {
  id: string;
  created_at: string;
  changed_by: string | null;
  from_status: DealStatus | null;
  to_status: DealStatus | null;
  dwell_seconds: number | null;
  author: { name: string } | null;
  from_stage: { id: string; name: string } | null;
  to_stage: { id: string; name: string } | null;
};

/** Linha do tempo do histórico, mais recente primeiro (FR-017). */
export async function listHistoryByDeal(db: DB, dealId: string): Promise<DealHistoryEntry[]> {
  const { data, error } = await db
    .from("deal_history")
    .select(
      `id, created_at, changed_by, from_status, to_status, dwell_seconds,
       author:profiles!deal_history_changed_by_fkey(name),
       from_stage:stages!deal_history_from_stage_id_fkey(id, name),
       to_stage:stages!deal_history_to_stage_id_fkey(id, name)`,
    )
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    changed_by: r.changed_by,
    author_name: r.author?.name ?? null,
    from_stage: r.from_stage,
    to_stage: r.to_stage,
    from_status: r.from_status,
    to_status: r.to_status,
    dwell_seconds: r.dwell_seconds,
  }));
}
