-- 002 — Cadastro e Gestão de Oportunidades
-- Contrato desta migration: specs/002-gestao-oportunidades/contracts/db-triggers.md
-- Aditiva sobre 0001_init.sql. A Oportunidade é a tabela `deals` já existente:
-- ganha cliente explícito, previsão de fechamento e probabilidade própria, mais o
-- histórico imutável de mudanças de etapa/status (gravado por trigger).

-- ---------------------------------------------------------------------------
-- 1. Novas colunas em deals
-- ---------------------------------------------------------------------------
alter table public.deals
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists expected_close_date date,
  add column if not exists probability int;   -- null = herda stages.probability

comment on column public.deals.company_id is 'Cliente da oportunidade; herdado do contato quando não informado.';
comment on column public.deals.expected_close_date is 'Previsão de fechamento. Data no passado é aceita e sinalizada como vencida.';
comment on column public.deals.probability is 'null = herda a probabilidade da etapa. Valor preenchido = ajuste manual, prevalece no forecast.';

-- 2. Restrições de domínio (FR-006)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deals_probability_range') then
    alter table public.deals add constraint deals_probability_range
      check (probability is null or probability between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'deals_value_nonneg') then
    alter table public.deals add constraint deals_value_nonneg
      check (value is null or value >= 0);
  end if;
end $$;

-- 3. Backfill: cliente herdado do contato (no-op em base sem deals)
update public.deals d
   set company_id = c.company_id
  from public.contacts c
 where c.id = d.contact_id
   and d.company_id is null
   and c.company_id is not null;

-- 4. Índices
create index if not exists deals_company_id_idx on public.deals (company_id);
create index if not exists deals_expected_close_date_idx on public.deals (expected_close_date);

-- 5. Excluir contato não pode apagar oportunidade (análise F1)
--    0001 criou contact_id com ON DELETE CASCADE: apagar um contato levava junto
--    todo o histórico comercial dele. RESTRICT recusa a exclusão e preserva o registro.
alter table public.deals drop constraint if exists deals_contact_id_fkey;
alter table public.deals add constraint deals_contact_id_fkey
  foreign key (contact_id) references public.contacts(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 6. Histórico imutável de mudanças de etapa e status
-- ---------------------------------------------------------------------------
create table if not exists public.deal_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,  -- null = Sistema (cron/webhook)
  from_stage_id uuid references public.stages(id),
  to_stage_id uuid references public.stages(id),
  from_status text check (from_status is null or from_status in ('open','won','lost','standby')),
  to_status text check (to_status is null or to_status in ('open','won','lost','standby')),
  dwell_seconds int,                                                  -- tempo desde a mudança anterior
  created_at timestamptz not null default now(),
  -- nunca gravar registro vazio (FR-015)
  constraint deal_history_not_empty check (
    from_stage_id is not null or to_stage_id is not null
    or from_status is not null or to_status is not null
  )
);

create index if not exists deal_history_deal_created_idx
  on public.deal_history (deal_id, created_at desc);

-- RLS: leitura para o time, escrita SÓ pelo trigger (security definer).
-- A ausência de policy de insert/update/delete é o que torna o histórico imutável (FR-018).
alter table public.deal_history enable row level security;

drop policy if exists "auth — deal_history (leitura)" on public.deal_history;
create policy "auth — deal_history (leitura)"
  on public.deal_history for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 7. Trigger de histórico — atomicidade (FR-020) e cobertura total (SC-002)
-- ---------------------------------------------------------------------------
create or replace function public.log_deal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_last  timestamptz;
  v_stage_changed boolean;
  v_status_changed boolean;
begin
  -- autor: só grava se houver profile correspondente (service role => null => "Sistema")
  select p.id into v_actor from public.profiles p where p.id = auth.uid();

  if (tg_op = 'INSERT') then
    insert into public.deal_history (deal_id, changed_by, to_stage_id, to_status)
    values (new.id, v_actor, new.stage_id, new.status);
    return new;
  end if;

  v_stage_changed  := new.stage_id is distinct from old.stage_id;
  v_status_changed := new.status   is distinct from old.status;

  -- FR-019: só etapa e status geram histórico. Valor, dono, previsão etc. não.
  if not (v_stage_changed or v_status_changed) then
    return new;
  end if;

  select max(h.created_at) into v_last
    from public.deal_history h
   where h.deal_id = new.id;

  insert into public.deal_history (
    deal_id, changed_by, from_stage_id, to_stage_id, from_status, to_status, dwell_seconds
  ) values (
    new.id,
    v_actor,
    case when v_stage_changed  then old.stage_id end,
    case when v_stage_changed  then new.stage_id end,
    case when v_status_changed then old.status   end,
    case when v_status_changed then new.status   end,
    greatest(0, extract(epoch from (now() - coalesce(v_last, old.created_at)))::int)
  );

  return new;
end $$;

drop trigger if exists deals_log_change on public.deals;
create trigger deals_log_change
  after insert or update on public.deals
  for each row execute function public.log_deal_change();
