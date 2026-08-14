// Tipos do banco do CRM RedRex (espelham supabase/migrations/0001_init.sql).
// Quando a migration for aplicada, regenerar com `supabase gen types` / MCP generate_typescript_types.

import type { createServerClient } from "@supabase/ssr";

// Tipo canônico do client tipado (mesma instanciação de genéricos que o @supabase/ssr usa).
// Repositórios recebem este tipo para evitar incompatibilidade de aridade de genéricos.
export type TypedClient = ReturnType<typeof createServerClient<Database>>;

export type Role = "vendedor" | "gestor";
export type Origem = "inbound" | "outbound";
export type DealType = "pontual" | "recorrente";
export type DealStatus = "open" | "won" | "lost" | "standby";
export type Attendance = "pendente" | "compareceu" | "no_show" | "remarcado";
export type LostReason =
  | "preço"
  | "timing"
  | "concorrente"
  | "sem_budget"
  | "sumiu"
  | "outro";
export type ProposalStatus = "rascunho" | "enviada" | "vista" | "aceita" | "recusada";
export type TemplateCategory =
  | "diagnostico"
  | "objecao"
  | "followup"
  | "proposta"
  | "reengajamento";
export type ActivityType =
  | "note"
  | "call_note"
  | "transcript"
  | "analysis"
  | "email"
  | "proposal";

export type Profile = {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export type Company = {
  id: string;
  name: string;
  domain: string | null;
  created_at: string;
}

export type Contact = {
  id: string;
  company_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  origem: Origem;
  created_at: string;
}

export type Stage = {
  id: string;
  name: string;
  position: number;
  probability: number;
  color: string | null;
}

export type Deal = {
  id: string;
  contact_id: string;
  company_id: string | null;          // 0002 — cliente explícito (herdado do contato quando ausente)
  stage_id: string;
  owner_id: string | null;
  title: string;
  value: number | null;
  probability: number | null;         // 0002 — null = herda stages.probability
  expected_close_date: string | null; // 0002 — previsão de fechamento
  deal_type: DealType;
  mrr: number | null;
  position: number;
  status: DealStatus;
  attendance: Attendance;
  next_action: string | null;
  next_action_date: string | null;
  lost_reason: LostReason | null;
  reaquecer_em: string | null;
  calendly_event_uid: string | null;
  created_at: string;
  updated_at: string;
}

export type DealHistory = {
  id: string;
  deal_id: string;
  changed_by: string | null;          // null = Sistema (cron/webhook com service role)
  from_stage_id: string | null;
  to_stage_id: string | null;
  from_status: DealStatus | null;
  to_status: DealStatus | null;
  dwell_seconds: number | null;       // tempo desde a mudança anterior
  created_at: string;
}

export type Proposal = {
  id: string;
  deal_id: string;
  version: number;
  value: number;
  status: ProposalStatus;
  valid_until: string | null;
  doc_url: string | null;
  created_at: string;
}

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  created_at: string;
}

export type Goal = {
  id: string;
  owner_id: string | null;
  month: string;
  target_value: number;
  created_at: string;
}

export type Activity = {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  type: ActivityType;
  content: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SyncState = {
  key: string;
  value: string | null;
  updated_at: string;
}

// Row preciso (reads tipados). Insert/Update como Record<string, unknown> para
// satisfazer o constraint GenericTable do postgrest-js; os payloads de escrita são
// tipados nas funções dos repositórios. Pós-migration, regenerar via MCP/CLI.
type TableShape<T> = {
  Row: T;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      companies: TableShape<Company>;
      contacts: TableShape<Contact>;
      stages: TableShape<Stage>;
      deals: TableShape<Deal>;
      deal_history: TableShape<DealHistory>;
      proposals: TableShape<Proposal>;
      templates: TableShape<Template>;
      goals: TableShape<Goal>;
      activities: TableShape<Activity>;
      sync_state: TableShape<SyncState>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
