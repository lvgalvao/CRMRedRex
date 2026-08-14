# Phase 1 — Data Model

Feature: CRM Comercial da RedRex — MVP (`001-crm-mvp-comercial`)
Fonte de verdade do schema: **`.llm/prd.md` Apêndice A** (`schema.sql`). Este documento mapeia o schema para entidades, relações, regras de validação e transições de estado. Em conflito de detalhe, o Apêndice A prevalece. Banco atual: **vazio** — criado pela primeira migration.

## Visão geral das relações

```
profiles 1──* deals (owner_id)            profiles 1──* goals (owner_id, null = meta do time)
companies 1──* contacts                   contacts 1──* deals
stages   1──* deals                        deals 1──* proposals
deals/contacts 1──* activities             sync_state (chave-valor, sem FK)
templates (sem FK; biblioteca)
```

---

## Entidades

### profiles

Membro do time; dono de deals e unidade do ranking.

- `id` uuid PK → `auth.users(id)` ON DELETE CASCADE
- `name` text **NOT NULL**
- `role` text NOT NULL default `'vendedor'` — enum `{vendedor, gestor}`
- `created_at` timestamptz
- **Regras**: criado no primeiro login (trigger ou serviço). `role` define quem cadastra metas (gestor) e como o ranking é composto.

### companies

Organização cliente.

- `id` uuid PK
- `name` text **NOT NULL**
- `domain` text (nullable)
- `created_at` timestamptz
- **Regras**: `find-or-create` por nome/domínio na sincronização para não duplicar.

### contacts

Pessoa em uma empresa; alvo do WhatsApp click-to-send.

- `id` uuid PK
- `company_id` uuid → `companies(id)` ON DELETE SET NULL
- `name` text **NOT NULL**
- `email` text **UNIQUE NOT NULL**
- `phone` text (nullable) — E.164 para WhatsApp
- `origem` text NOT NULL default `'inbound'` — enum `{inbound, outbound}`
- `created_at` timestamptz
- **Regras**: `email` único sustenta o `find-or-create` da sincronização (US6 edge case). Sem `phone` válido, WhatsApp informa falta em vez de abrir conversa inválida (FR-015).

### stages

Etapa do funil; `probability` alimenta o forecast.

- `id` uuid PK
- `name` text **NOT NULL**
- `position` int **NOT NULL**
- `probability` int NOT NULL default 0 — 0..100
- `color` text (nullable)
- **Seed (Apêndice A)**: Novo lead(5), Qualificado(15), Diagnóstico agendado(25), Diagnóstico realizado(40), Proposta enviada(60), Negociação(80), Ganho(100), Perdido(0), Stand-by(10).
- **Regras**: "Qualificado" é gate do outbound (só agenda diagnóstico depois). Etapas terminais (Ganho/Perdido/Stand-by) não entram no forecast ponderado de abertos.

### deals

Oportunidade — entidade central; sustenta a maioria dos KPIs.

- `id` uuid PK
- `contact_id` uuid **NOT NULL** → `contacts(id)` ON DELETE CASCADE
- `stage_id` uuid **NOT NULL** → `stages(id)`
- `owner_id` uuid → `profiles(id)` (dono; cobrança/ranking)
- `title` text **NOT NULL**
- `value` numeric(12,2) default 0 — valor de fechamento (forecast)
- `deal_type` text NOT NULL default `'pontual'` — enum `{pontual, recorrente}`
- `mrr` numeric(12,2) default 0 — receita recorrente mensal
- `position` int NOT NULL default 0 — ordem dentro da coluna do Kanban
- `status` text NOT NULL default `'open'` — enum `{open, won, lost, standby}`
- `attendance` text NOT NULL default `'pendente'` — enum `{pendente, compareceu, no_show, remarcado}`
- `next_action` text (nullable) — motor diário
- `next_action_date` date (nullable)
- `lost_reason` text (nullable) — enum `{preço, timing, concorrente, sem_budget, sumiu, outro}`
- `reaquecer_em` date (nullable) — stand-by
- `calendly_event_uid` text **UNIQUE** (nullable) — idempotência do polling
- `created_at`, `updated_at` timestamptz
- **Índices**: `stage_id`, `contact_id`, `owner_id`, `next_action_date`, `status`.

### proposals

Proposta como objeto de primeira classe; versionada.

- `id` uuid PK
- `deal_id` uuid **NOT NULL** → `deals(id)` ON DELETE CASCADE
- `version` int NOT NULL default 1
- `value` numeric(12,2) NOT NULL default 0
- `status` text NOT NULL default `'rascunho'` — enum `{rascunho, enviada, vista, aceita, recusada}`
- `valid_until` date (nullable) — alavanca de urgência
- `doc_url` text (nullable)
- `created_at` timestamptz
- **UNIQUE (deal_id, version)** — preserva histórico de versões.
- **Regras**: mudar status move o deal para a etapa correspondente (FR-012); proposta vencida (`valid_until < hoje`) é destacada.

### templates

Biblioteca de playbooks que a IA preenche.

- `id` uuid PK
- `name` text **NOT NULL**
- `category` text NOT NULL — enum `{diagnostico, objecao, followup, proposta, reengajamento}`
- `body` text **NOT NULL** — com `{{variaveis}}`
- `created_at` timestamptz
- **Seed (Apêndice A)**: 5 playbooks (um por categoria).

### goals

Meta mensal — do time (`owner_id` null) ou por vendedor.

- `id` uuid PK
- `owner_id` uuid → `profiles(id)` ON DELETE CASCADE (null = meta do time)
- `month` date **NOT NULL** — primeiro dia do mês
- `target_value` numeric(12,2) **NOT NULL**
- `created_at` timestamptz
- **UNIQUE (owner_id, month)**.
- **Regras**: cadastro pelo gestor; cruzada com `computeForecast` para % de atingimento.

### activities

Evento na timeline de deal/contato.

- `id` uuid PK
- `deal_id` uuid → `deals(id)` ON DELETE CASCADE (nullable)
- `contact_id` uuid → `contacts(id)` ON DELETE CASCADE (nullable)
- `type` text NOT NULL — enum `{note, call_note, transcript, analysis, email, proposal}`
- `content` text (nullable)
- `metadata` jsonb default `'{}'`
- `created_at` timestamptz
- **Regras**: idempotência de transcript/análise apoiada em `metadata` (ex.: `meetingId`) + checagem no serviço; briefing pré-call grava `metadata.kind='briefing'`.

### sync_state

Marca d'água do polling (otimização; corretude vem do dedup por UUID).

- `key` text PK
- `value` text (nullable)
- `updated_at` timestamptz
- **Uso**: `key='calendly:last_synced_at'` guarda o instante da última consulta (→ `min_start_time`).

---

## Segurança (transversal a todas as tabelas)

- **RLS habilitado** em todas as 10 tabelas (FR-028; Princípio IV).
- **Política MVP single-org**: `for all to authenticated using (true) with check (true)` — qualquer membro autenticado lê/escreve. Refinamento por owner fica para Fase 3.
- Filtros por dono ("Hoje", ranking) são de **visão na camada de serviço**, não de permissão na RLS.

---

## Regras de validação (camada de serviço, `lib/services/`)

| Regra                                                                          | Onde                              | Origem                                          |
| ------------------------------------------------------------------------------ | --------------------------------- | ----------------------------------------------- |
| Fechamento `won` exige `deal_type`; se `recorrente`, `mrr > 0`                 | `closeDeal`                       | FR-007, SC-009, edge "Ganho/recorrente sem MRR" |
| Fechamento `lost` exige `lost_reason` no enum                                  | `closeDeal`                       | FR-007, SC-009                                  |
| Fechamento `standby` exige `reaquecer_em`                                      | `closeDeal`                       | FR-007, SC-009                                  |
| Deal criado por sync nasce com `owner_id` + `next_action` + `next_action_date` | `createDealFromBooking`           | FR-020, SC-005                                  |
| Dedup por `calendly_event_uid` (nunca título)                                  | `createDealFromBooking`           | FR-021, Princípio III                           |
| Dedup de transcript/análise por `meetingId`                                    | `analyzeTranscript`/handler tl;dv | FR-024                                          |
| WhatsApp exige `phone` E.164 válido                                            | `lib/whatsapp.ts`                 | FR-015, edge "telefone fora do padrão"          |
| Forecast só de `status='open'`, `Σ value × probability/100`                    | `computeForecast` (único)         | FR-017, Princípio II                            |
| Mudança de status de proposta move o deal                                      | `services/proposals`              | FR-012                                          |

---

## Transições de estado

### Deal — `stage_id` (fluxo do funil)

```
Novo lead ─(qualificar)→ Qualificado ─→ Diagnóstico agendado ─(transcript)→ Diagnóstico realizado
   └ inbound (Calendly) entra direto em "Diagnóstico agendado"
Diagnóstico realizado ─(proposta enviada)→ Proposta enviada ─→ Negociação ─→ {Ganho | Perdido | Stand-by}
```

- Inbound (sincronizado) nasce em "Diagnóstico agendado"; outbound nasce em "Novo lead" e só passa a "Diagnóstico agendado" após "Qualificado" (Assumption do spec).
- Proposta `enviada`/`aceita` empurra o deal para a etapa correspondente (FR-012).

### Deal — `status` (terminal)

```
open ─→ won     (exige deal_type [+ mrr se recorrente])
open ─→ lost    (exige lost_reason padronizado)
open ─→ standby (exige reaquecer_em)   ─(reaquecer)→ open
```

### Deal — `attendance`

```
pendente ─(transcript chega)→ compareceu
pendente ─(call passou sem transcript)→ no_show
pendente ─(reagendou)→ remarcado
```

### Proposal — `status`

```
rascunho → enviada → vista → aceita
                          └─→ recusada
```

- `valid_until < hoje` → estado visual "vencida" (destaque), sem mudar o enum.
