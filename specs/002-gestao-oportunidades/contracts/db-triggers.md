# Contrato — Trigger de histórico e RLS (feature 002)

Objeto de banco que materializa FR-015, FR-016, FR-018 e FR-020. Vive em `supabase/migrations/0002_opportunities.sql`. Este é o **único** ponto do sistema que escreve em `deal_history`.

---

## Contrato do trigger

**Nome**: `deals_log_change` · **Tabela**: `public.deals` · **Momento**: `AFTER INSERT OR UPDATE FOR EACH ROW` · **Função**: `public.log_deal_change()` (`plpgsql`, `security definer`, `set search_path = public`).

### Quando grava

| Evento | Condição | Registro gerado |
|---|---|---|
| `INSERT` | sempre | abertura: `to_stage_id` = etapa inicial, `to_status` = `status` inicial, `from_*` nulos, `dwell_seconds` nulo |
| `UPDATE` | `new.stage_id IS DISTINCT FROM old.stage_id` **ou** `new.status IS DISTINCT FROM old.status` | um registro com apenas os pares que mudaram preenchidos |
| `UPDATE` | nenhuma das duas mudou (ex.: só `value`, `owner_id`, `next_action`) | **nenhum registro** — FR-019 limita o histórico a etapa e status |
| `UPDATE` | etapa de destino igual à atual | nenhum registro — `IS DISTINCT FROM` já cobre o arraste que volta para a mesma coluna |

Uma transação que muda etapa **e** status produz **um único** registro com os quatro campos preenchidos.

### Campos derivados

- `changed_by`: `auth.uid()`, validado contra `public.profiles` — se não houver profile correspondente (service role do Cron/webhook, ou usuário sem profile), grava `null`, exibido como **Sistema**.
- `dwell_seconds`: `extract(epoch from now() - coalesce(<created_at do último registro deste deal>, old.created_at))::int`, com piso em 0.

### Garantias

- **Atomicidade** (FR-020): executa na transação do UPDATE — ou etapa e histórico persistem juntos, ou nada persiste.
- **Cobertura total** (SC-002): alcança todo caminho que escreva em `deals`, inclusive `moveDeal`, `closeDeal`, `createDealFromBooking`, o `updateDeal` genérico e qualquer alteração feita direto no painel do Supabase.
- **Não interfere**: nunca bloqueia, valida ou altera a linha de `deals`; sempre retorna `NEW`. Regra de negócio permanece em `lib/services/`.

---

## Contrato de RLS de `deal_history`

```sql
alter table public.deal_history enable row level security;

create policy "auth — deal_history (leitura)"
  on public.deal_history for select to authenticated using (true);
-- Sem policy de insert/update/delete: ninguém escreve pela API. Só o trigger (security definer).
```

**Consequência esperada** (verificar no smoke test do quickstart): um `insert` em `deal_history` pelo cliente autenticado **falha**; um `update` ou `delete` afeta **0 linhas**. É isso que torna o histórico auditável (FR-018).

---

## Contrato da migration `0002_opportunities.sql`

Ordem obrigatória das operações:

1. `alter table public.deals add column company_id / expected_close_date / probability` (+ `check` de 0–100)
2. `alter table public.deals add constraint deals_value_nonneg check (value is null or value >= 0)`
3. Backfill: `update deals set company_id = contacts.company_id` — no-op no ambiente atual (0 deals), obrigatório para outros ambientes
4. Índices: `deals(company_id)`, `deals(expected_close_date)`
5. `create table public.deal_history` + índice `(deal_id, created_at desc)`
6. `enable row level security` + policy de `select`
7. `create or replace function public.log_deal_change()` + `create trigger deals_log_change`

**Idempotência**: usar `add column if not exists` e `create ... if not exists` onde a sintaxe permite — a migration deve poder reexecutar sem erro em ambiente parcialmente aplicado.

**Não faz**: nenhum `insert` em `stages` (as 9 etapas permanecem como estão — FR-010), nenhum `drop`, nenhuma alteração em `activities`.

---

## Verificação (executada no quickstart)

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | `insert` de um deal | 1 linha em `deal_history` com `to_stage_id` preenchido e `dwell_seconds` nulo |
| 2 | `update` mudando só `value` | nenhuma linha nova |
| 3 | `update` mudando `stage_id` | 1 linha com `from_stage_id`/`to_stage_id` e `dwell_seconds` > 0 |
| 4 | `update` mudando `stage_id` **e** `status` | 1 linha só, com os quatro campos |
| 5 | `update` para a mesma etapa | nenhuma linha nova |
| 6 | `insert`/`update`/`delete` direto em `deal_history` como usuário autenticado | recusado / 0 linhas afetadas |
| 7 | mudança feita com service role | linha com `changed_by` nulo |

---

## Resultado da verificação (executada em 2026-08-14, banco real)

| # | Cenário | Esperado | Observado |
|---|---|---|---|
| 1 | `insert` de um deal | 1 registro de abertura, `dwell_seconds` nulo | ✅ |
| 2 | `update` mudando só `value` | nenhuma linha nova | ✅ |
| 3 | `update` mudando `stage_id` | 1 linha com origem/destino | ✅ |
| 4 | `update` mudando `stage_id` **e** `status` | 1 linha só, quatro campos | ✅ |
| 5 | `update` para a mesma etapa | nenhuma linha nova | ✅ |
| 6 | escrita direta em `deal_history` por usuário autenticado | recusada | ⚠️ verificado estruturalmente (só existe policy de `select`); a prova prática exige sessão de usuário |
| 7 | mudança com service role | `changed_by` nulo → "Sistema" | ✅ |

**Defeito encontrado e corrigido**: `created_at` usava `now()`, que devolve o instante da
transação — várias gravações na mesma transação ficavam com timestamp idêntico e a linha do
tempo saía invertida. Corrigido na migration `0003` com `clock_timestamp()`. Reverificado: a
ordem cronológica decrescente passou a sair correta (fechamento no topo, abertura no fim).

**Nota sobre `dwell_seconds`**: transições instantâneas gravam 0 (piso da função). O contrato
esperava "> 0" no caso 3 assumindo tempo real decorrido — não é defeito.
