-- 003 — Ordenação determinística do histórico
-- now() devolve o instante da TRANSAÇÃO: duas gravações na mesma transação ficam
-- com created_at idêntico e o "order by created_at desc" perde a ordem real
-- (observado ao validar a US2: a linha do tempo vinha invertida).
-- clock_timestamp() devolve o instante da chamada, garantindo FR-017.

alter table public.deal_history
  alter column created_at set default clock_timestamp();

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
  select p.id into v_actor from public.profiles p where p.id = auth.uid();

  if (tg_op = 'INSERT') then
    insert into public.deal_history (deal_id, changed_by, to_stage_id, to_status)
    values (new.id, v_actor, new.stage_id, new.status);
    return new;
  end if;

  v_stage_changed  := new.stage_id is distinct from old.stage_id;
  v_status_changed := new.status   is distinct from old.status;

  -- FR-019: só etapa e status geram histórico.
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
    greatest(0, extract(epoch from (clock_timestamp() - coalesce(v_last, old.created_at)))::int)
  );

  return new;
end $$;
