# Phase 1 — Data Model

Feature: Cadastro e Gestão de Oportunidades (`002-gestao-oportunidades`)
Base: schema `0001_init.sql` **já aplicado** (verificado: 10 tabelas, RLS ativo, `stages` com 9 linhas, `deals` com 0 linhas). Este documento descreve **apenas o delta** da migration `0002`; o restante do schema permanece como no Apêndice A do PRD.

## Visão geral do delta

```
companies 1──* deals (company_id)          ← NOVO vínculo explícito (antes só via contact)
deals     1──* deal_history                ← NOVA tabela (imutável, escrita por trigger)
profiles  1──* deal_history (changed_by)   ← autor da mudança; null = Sistema
stages    1──* deal_history (from/to)
```

---

## Delta em `public.deals`

| Coluna                | Tipo                                                                       | Regras                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `company_id`          | `uuid null` → `companies(id)` ON DELETE SET NULL                           | Cliente da oportunidade. Quando não informado, herda o `company_id` do contato. Backfill na migration para linhas existentes. Índice criado. |
| `expected_close_date` | `date null`                                                                | Previsão de fechamento. Aceita data no passado (D8). Índice criado — alimenta filtros e a sinalização de previsão vencida.                   |
| `probability`         | `int null`, `check (probability is null or probability between 0 and 100)` | `null` = herda `stages.probability` (D2). Valor preenchido = ajuste manual, prevalece no forecast.                                           |

Restrição adicional em coluna existente:

| Restrição            | Definição                             | Requisito                                                       |
| -------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `deals_value_nonneg` | `check (value is null or value >= 0)` | FR-006 — bloqueia valor negativo no banco, não só no formulário |

**Campos existentes que a feature passa a usar no formulário** (sem alteração de schema): `title` (nome do negócio), `contact_id`, `stage_id`, `owner_id`, `value`, `status`, `next_action`, `next_action_date`.

---

## Nova entidade: `public.deal_history`

Registro imutável de uma mudança de etapa e/ou de status de uma oportunidade.

| Coluna          | Tipo                                                | Notas                                                                                                      |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`            | `uuid` PK default `gen_random_uuid()`               |                                                                                                            |
| `deal_id`       | `uuid` **NOT NULL** → `deals(id)` ON DELETE CASCADE |                                                                                                            |
| `changed_by`    | `uuid null` → `profiles(id)` ON DELETE SET NULL     | `auth.uid()` resolvido no trigger; `null` = **Sistema** (Cron/webhook com service role)                    |
| `from_stage_id` | `uuid null` → `stages(id)`                          | `null` quando a transição não envolveu etapa                                                               |
| `to_stage_id`   | `uuid null` → `stages(id)`                          | `null` quando a transição não envolveu etapa; no registro de abertura, a etapa inicial                     |
| `from_status`   | `text null`, mesmo enum de `deals.status`           | `null` quando a transição não envolveu status                                                              |
| `to_status`     | `text null`, mesmo enum de `deals.status`           | idem                                                                                                       |
| `dwell_seconds` | `int null`                                          | Tempo desde a mudança anterior do mesmo deal (ou desde `deals.created_at`). `null` no registro de abertura |
| `created_at`    | `timestamptz` NOT NULL default `now()`              | Ordenação da linha do tempo                                                                                |

**Índice**: `(deal_id, created_at desc)` — a consulta da tela de detalhe.

**Regras**:

- Pelo menos um par (`from_stage_id`/`to_stage_id`) ou (`from_status`/`to_status`) é preenchido; o trigger nunca insere registro vazio (FR-015).
- Mudança de etapa para a **mesma** etapa não gera registro — o trigger compara com `is distinct from` (edge case do drag-and-drop).
- Uma transação que muda etapa **e** status (ex.: fechar como Ganha move para "Ganho" e marca `won`) gera **um único** registro com os quatro campos preenchidos.
- Registro de **abertura**: o `AFTER INSERT` grava um registro com `to_stage_id` = etapa inicial e `to_status` = `open`, sem `dwell_seconds`. Serve de âncora para o cálculo de permanência e responde "desde quando existe".

**RLS**: habilitado. Política **única**, de `select`, para `authenticated`. Ausência deliberada de políticas de `insert`/`update`/`delete` → imutável para todo usuário (FR-018). A escrita ocorre apenas pelo trigger `security definer`.

---

## Estados e transições

### Status da oportunidade

```
                ┌──────────────► won      (Ganha)
   open ────────┼──────────────► lost     (Perdida — exige lost_reason)
  (Aberta)      └──────────────► standby  (Stand-by — exige reaquecer_em)
     ▲                              │
     └──── reabertura ◄─────────────┘   (mover para etapa ativa → open, limpa lost_reason/reaquecer_em)
```

- Toda oportunidade nasce `open` (FR-005).
- `won`/`lost`/`standby` saem do forecast ponderado (FR-013) — comportamento já implementado em `computeForecastFromData`, que filtra `status === 'open'`.
- Reabertura (FR-014) é regra de serviço (D7): mover de etapa terminal para etapa ativa devolve `open` e limpa `lost_reason`/`reaquecer_em`.

### Etapas e o funil da spec

Mapeamento fixo (FR-010a), sem alteração das 9 etapas existentes:

| Funil da spec                 | Etapa(s) no banco                            | `probability` |
| ----------------------------- | -------------------------------------------- | ------------- |
| Lead                          | Novo lead                                    | 5             |
| Qualificação                  | Qualificado                                  | 15            |
| Diagnóstico                   | Diagnóstico agendado / Diagnóstico realizado | 25 / 40       |
| Proposta                      | Proposta enviada                             | 60            |
| Negociação                    | Negociação                                   | 80            |
| Ganha / Perdida               | Ganho / Perdido                              | 100 / 0       |
| _(fora do caminho principal)_ | Stand-by                                     | 10            |

Etapas terminais (`Ganho`, `Perdido`, `Stand-by`) ↔ status correspondente: mapeamento centralizado em `lib/services/dealStage.ts`, hoje espalhado em `TERMINAL_STAGE` dentro de `closeDeal.schema.ts`.

---

## Regras de validação (camada pura — `lib/services/deals.schema.ts`)

| Campo                 | Regra                                                                   | Requisito                            |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `title`               | obrigatório, 1–120 caracteres, `trim`                                   | FR-002                               |
| `company_id`          | obrigatório (uuid)                                                      | FR-002, FR-003                       |
| `contact_id`          | obrigatório (uuid) e o contato deve pertencer ao `company_id` informado | FR-003                               |
| `stage_id`            | obrigatório (uuid)                                                      | FR-002                               |
| `value`               | número ≥ 0; default 0                                                   | FR-006                               |
| `probability`         | inteiro 0–100 ou ausente (`null` = herda)                               | FR-006, FR-008                       |
| `owner_id`            | opcional; default = profile do usuário logado                           | FR-004                               |
| `expected_close_date` | data ISO opcional; passado permitido                                    | FR-007                               |
| `status` na criação   | sempre `open`, não aceito como entrada do formulário de criação         | FR-005                               |
| `lost_reason`         | obrigatório quando `status = lost`                                      | FR-012 (já em `closeDeal.schema.ts`) |
| `reaquecer_em`        | obrigatório quando `status = standby`                                   | FR-012 (já em `closeDeal.schema.ts`) |

Mensagens de erro em português, exibidas por campo no formulário sem perder o que foi digitado (US1, cenário 2).

---

## Probabilidade efetiva e forecast

```
probabilidadeEfetiva(deal, stage) = deal.probability ?? stage.probability
forecastPonderado = Σ  value × (probabilidadeEfetiva / 100)   para deals com status = 'open'
```

Implementada **exclusivamente** em `lib/services/computeForecast.ts` (`computeForecastFromData`). O `select` da função passa a incluir `probability`. Nenhum outro arquivo calcula forecast — invariante de constituição.

---

## Consultas que a feature adiciona

| Consulta                                                                                                    | Onde                            | Uso                                            |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `listDealsFiltered(db, { ownerId?, stageId?, status? })` com joins de contato, empresa, etapa e responsável | `lib/supabase/deals.ts`         | Listagem filtrável + soma dos valores (FR-023) |
| `listHistoryByDeal(db, dealId)` ordenada por `created_at desc`, com etapas e autor resolvidos               | `lib/supabase/dealHistory.ts`   | Linha do tempo do histórico (FR-017)           |
| `listContactsByCompany` (filtro em memória a partir de `listContacts`)                                      | `components/deals/DealForm.tsx` | Contatos restritos ao cliente (D6, FR-003)     |
