import type {
  Company,
  Contact,
  Deal,
  DealStatus,
  Profile,
  Stage,
  TypedClient,
} from "@/lib/supabase/types";

type DB = TypedClient;

/** Forma usada pelo Kanban — mantida enxuta de propósito. */
export type DealWithContact = Deal & { contact: Contact | null };

/** Forma completa: detalhe e listagem de Oportunidades. */
export type DealWithRelations = DealWithContact & {
  company: Company | null;
  stage: Stage | null;
  owner: Profile | null;
};

export type DealFilters = {
  ownerId?: string;
  stageId?: string;
  status?: DealStatus;
};

const RELATIONS =
  "*, contact:contacts(*), company:companies(*), stage:stages(*), owner:profiles(*)";

/**
 * Lista Oportunidades com os vínculos resolvidos, aplicando os filtros da tela
 * (FR-023). Uma única consulta: filtro ausente não entra no where.
 */
export async function listDealsFiltered(
  db: DB,
  filters: DealFilters = {},
): Promise<DealWithRelations[]> {
  let query = db.from("deals").select(RELATIONS);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query
    .order("expected_close_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DealWithRelations[];
}

export async function listDeals(db: DB): Promise<DealWithContact[]> {
  const { data, error } = await db
    .from("deals")
    .select("*, contact:contacts(*)")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DealWithContact[];
}

export async function getDeal(db: DB, id: string): Promise<DealWithRelations | null> {
  const { data, error } = await db.from("deals").select(RELATIONS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as DealWithRelations | null) ?? null;
}

export async function findDealByCalendlyUid(db: DB, uid: string): Promise<Deal | null> {
  const { data, error } = await db
    .from("deals")
    .select("*")
    .eq("calendly_event_uid", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertDeal(db: DB, input: Partial<Deal>): Promise<Deal> {
  const { data, error } = await db.from("deals").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateDeal(db: DB, id: string, patch: Partial<Deal>): Promise<Deal> {
  const { data, error } = await db
    .from("deals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
