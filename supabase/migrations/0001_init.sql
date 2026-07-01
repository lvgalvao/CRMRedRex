-- CRM da RedRex — schema Supabase (Postgres). Single-org: membro autenticado acessa.
-- Fonte: .llm/prd.md Apêndice A.

-- Perfis do time (dono dos deals, ranking de vendedores)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'vendedor' check (role in ('vendedor','gestor')),
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  email text unique not null,
  phone text,                 -- usado no WhatsApp click-to-send
  origem text not null default 'inbound' check (origem in ('inbound','outbound')),
  created_at timestamptz not null default now()
);

-- Etapas com probabilidade -> alimenta o forecast ponderado
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null,
  probability int not null default 0,   -- 0..100 (% de fechar nesta etapa)
  color text
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  stage_id uuid not null references public.stages(id),
  owner_id uuid references public.profiles(id),          -- dono do deal (cobrança/ranking)
  title text not null,
  value numeric(12,2) default 0,                         -- valor de fechamento (forecast)
  deal_type text not null default 'pontual' check (deal_type in ('pontual','recorrente')),
  mrr numeric(12,2) default 0,                           -- receita recorrente mensal (se recorrente)
  position int not null default 0,
  status text not null default 'open' check (status in ('open','won','lost','standby')),
  -- presença na reunião -> fonte do KPI de no-show
  attendance text not null default 'pendente' check (attendance in ('pendente','compareceu','no_show','remarcado')),
  -- motor diário do vendedor
  next_action text,
  next_action_date date,
  -- motivo padronizado de perda -> "por que perdemos" vira gráfico
  lost_reason text check (lost_reason in ('preço','timing','concorrente','sem_budget','sumiu','outro')),
  reaquecer_em date,                                     -- deals em stand-by
  -- idempotência do polling do Calendly (NUNCA usar o título p/ dedup)
  calendly_event_uid text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Propostas como objeto de 1a classe (versão, status, validade)
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  version int not null default 1,
  value numeric(12,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','vista','aceita','recusada')),
  valid_until date,                                      -- alavanca de urgência
  doc_url text,
  created_at timestamptz not null default now(),
  unique (deal_id, version)
);

-- Biblioteca de playbooks que a IA preenche
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('diagnostico','objecao','followup','proposta','reengajamento')),
  body text not null,           -- com {{variaveis}}, ex.: "Oi {{nome}}, sobre {{dor}}..."
  created_at timestamptz not null default now()
);

-- Metas mensais (time = owner_id null; vendedor = owner_id setado)
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  month date not null,                                   -- primeiro dia do mês
  target_value numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (owner_id, month)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  type text not null check (type in ('note','call_note','transcript','analysis','email','proposal')),
  content text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Marca d'água do polling (otimização; a corretude vem do dedup por UUID)
create table public.sync_state (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create index on public.deals (stage_id);
create index on public.deals (contact_id);
create index on public.deals (owner_id);
create index on public.deals (next_action_date);
create index on public.deals (status);
create index on public.proposals (deal_id);
create index on public.goals (month);
create index on public.activities (deal_id);
create index on public.activities (contact_id);
create index on public.activities (type);

alter table public.profiles   enable row level security;
alter table public.companies  enable row level security;
alter table public.contacts   enable row level security;
alter table public.stages     enable row level security;
alter table public.deals      enable row level security;
alter table public.proposals  enable row level security;
alter table public.templates  enable row level security;
alter table public.goals      enable row level security;
alter table public.activities enable row level security;
alter table public.sync_state enable row level security;

-- MVP single-org: qualquer membro autenticado acessa. (Refinar por owner na Fase 3.)
create policy "auth — profiles"   on public.profiles   for all to authenticated using (true) with check (true);
create policy "auth — companies"  on public.companies  for all to authenticated using (true) with check (true);
create policy "auth — contacts"   on public.contacts   for all to authenticated using (true) with check (true);
create policy "auth — stages"     on public.stages     for all to authenticated using (true) with check (true);
create policy "auth — deals"      on public.deals      for all to authenticated using (true) with check (true);
create policy "auth — proposals"  on public.proposals  for all to authenticated using (true) with check (true);
create policy "auth — templates"  on public.templates  for all to authenticated using (true) with check (true);
create policy "auth — goals"      on public.goals      for all to authenticated using (true) with check (true);
create policy "auth — activities" on public.activities for all to authenticated using (true) with check (true);
create policy "auth — sync_state" on public.sync_state for all to authenticated using (true) with check (true);

-- Etapas com probabilidade (Qualificado como gate; Stand-by p/ reaquecer)
insert into public.stages (name, position, probability, color) values
  ('Novo lead',             1,   5, '#A1A1AA'),
  ('Qualificado',           2,  15, '#818CF8'),
  ('Diagnóstico agendado',  3,  25, '#DC2626'),
  ('Diagnóstico realizado', 4,  40, '#F87171'),
  ('Proposta enviada',      5,  60, '#F59E0B'),
  ('Negociação',            6,  80, '#3B82F6'),
  ('Ganho',                 7, 100, '#22C55E'),
  ('Perdido',               8,   0, '#71717A'),
  ('Stand-by',              9,  10, '#EAB308');

-- Seed de playbooks (a IA preenche as {{variaveis}})
insert into public.templates (name, category, body) values
  ('Diagnóstico — abertura', 'diagnostico', 'Roteiro p/ {{empresa}}: contexto, dores em dados, stack atual, orçamento, prazo, decisor.'),
  ('Objeção — "tá caro"',    'objecao',     'Reposicionar valor x custo de não resolver {{dor}}; ROI esperado; opção faseada.'),
  ('Follow-up pós-call',     'followup',    'Oi {{nome}}, ótimo papo sobre {{dor}}. Próximo passo: {{proximo_passo}}. Faz sentido {{data}}?'),
  ('Proposta — envio',       'proposta',    'Oi {{nome}}, segue a proposta para {{escopo}}. Validade até {{validade}}. Posso te ligar {{data}}?'),
  ('Reengajamento',          'reengajamento','Oi {{nome}}, voltando ao tema {{dor}}. Mudou algo no planejamento de {{trimestre}}?');
