---
description: "Task list — CRM Comercial da RedRex (MVP)"
---

# Tasks: CRM Comercial da RedRex — MVP

**Input**: Design documents from `/specs/001-crm-mvp-comercial/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos apenas onde a Constituição e os contratos exigem — unidade nos serviços (`computeForecast`, `fillTemplate`, `closeDeal`, `getToday`) e contrato no parsing de Calendly/tl;dv. Não é TDD completo em toda a UI.

**Organization**: Tarefas agrupadas por user story (US1..US7), em ordem de prioridade do spec. Cada história é um incremento independentemente testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: a qual user story a tarefa pertence (US1..US7)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Web app full-stack Next.js (App Router), projeto único na raiz: `app/`, `components/`, `lib/`, `supabase/`, `tests/` (conforme plan.md §Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: scaffold do projeto e ferramentas base.

- [X] T001 Scaffold Next.js (App Router, TypeScript, ESLint) na raiz: `npx create-next-app@latest . --typescript --tailwind --app --eslint`; criar `package.json` com scripts `dev|build|lint|test`
- [X] T002 Instalar dependências em `package.json`: `@supabase/supabase-js @supabase/ssr zod @anthropic-ai/sdk @dnd-kit/core @dnd-kit/sortable` e dev `vitest @testing-library/react`; rodar `npx shadcn@latest init`
- [X] T003 [P] Configurar ESLint + Prettier (`.eslintrc`, `.prettierrc`) com regra de ~300 linhas/arquivo como guia e `camelCase`/`PascalCase`
- [X] T004 [P] Configurar Vitest em `vitest.config.ts` com paths `tests/unit` e `tests/contract`
- [X] T005 [P] Aplicar identidade visual RedRex (dark + vermelho) em `tailwind.config.ts` e `app/globals.css`: `background #0B0A0A`, `surface #171312`, `border #2A2422`, `primary #DC2626`, `accent #F87171`, `text #FAFAFA`, `text-muted #A1A1AA`, radius card 12px/pill 9999px
- [X] T006 [P] Atualizar a seção "Stack-alvo / comandos" do `CLAUDE.md` com os scripts reais de build/lint/test definidos em T001

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestrutura que TODAS as histórias dependem. **⚠️ Nenhuma user story começa antes disto.**

- [X] T007 Criar migration `supabase/migrations/0001_init.sql` com o schema do Apêndice A (PRD): 10 tabelas (`profiles, companies, contacts, stages, deals, proposals, templates, goals, activities, sync_state`), índices, `enable row level security` + políticas `authenticated` em todas, e seed de `stages` (9 etapas) e `templates` (5 playbooks). **Mostrar o diff e aguardar revisão humana antes de aplicar (Princípio V).**
- [X] T008 Aplicar a migration ao Supabase (CLI `supabase db push` ou MCP `apply_migration`) e verificar com `list_tables` (10 tabelas), `stages` (9 linhas), `templates` (5 linhas)
- [X] T009 Gerar tipos TypeScript do schema em `lib/supabase/types.ts` (MCP `generate_typescript_types` ou `supabase gen types`)
- [X] T010 Implementar `lib/env.ts`: validação zod separando públicas (`NEXT_PUBLIC_*`) de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `CALENDLY_TOKEN`, `CALENDLY_USER_URI`, `CALENDLY_EVENT_TYPE_URI`, `ANTHROPIC_API_KEY`, `TLDV_WEBHOOK_SECRET`, `CRON_SECRET`, Gmail) — falha cedo (D2)
- [X] T011 [P] Implementar clients Supabase: `lib/supabase/server.ts` (SSR, cookies), `lib/supabase/client.ts` (browser) e `lib/supabase/admin.ts` (service role, **só servidor**) usando `@supabase/ssr` (D1)
- [X] T012 [P] Implementar `lib/webhooks/verify.ts`: HMAC-SHA256 com `crypto.timingSafeEqual` (comparação tempo-constante) (D6)
- [X] T013 [P] Implementar repositórios-base compartilhados em `lib/supabase/`: `companies.ts`, `contacts.ts`, `stages.ts`, `deals.ts`, `activities.ts` (CRUD + queries tipadas; sem regra de negócio)
- [X] T014 Implementar autenticação: página `app/(auth)/login/page.tsx` (Supabase Auth), `middleware.ts` (renova sessão + protege rotas do CRM, FR-001/FR-028) e bootstrap de `profiles` no primeiro login (`name` + `role` default `'vendedor'`; gestor definido por seed/manual no MVP) (FR-002)
- [X] T015 Implementar shell do CRM: `app/(crm)/layout.tsx` com guarda de sessão, navegação e **redirect padrão pós-login para `/hoje`** (Princípio I)

**Checkpoint**: fundação pronta — as user stories podem começar (em paralelo, se houver time).

---

## Phase 3: User Story 1 — Trabalhar o pipeline comercial (Priority: P1) 🎯 MVP

**Goal**: Kanban com etapas, deals com cliente/valor/dono/próxima ação, drag-and-drop persistido, empresas/contatos e timeline de atividades.

**Independent Test**: criar empresa+contato+deal, mover entre etapas, atribuir dono, registrar nota — tudo persistido após recarregar, acesso restrito a autenticados.

### Tests for User Story 1

- [X] T016 [P] [US1] Teste unitário de `closeDeal` em `tests/unit/closeDeal.test.ts`: `won` exige `deal_type` (+`mrr>0` se recorrente), `lost` exige `lost_reason`, `standby` exige `reaquecer_em` (FR-007, edge "Ganho/recorrente sem MRR")

### Implementation for User Story 1

- [X] T017 [US1] Implementar `lib/services/deals.ts`: criar/editar deal **atribuindo `owner_id`** (dono explícito, default = usuário logado), `moveDeal(dealId, stageId, position)` persistindo `stage_id`+`position`, atualizar `next_action`/`next_action_date` (FR-004, FR-008)
- [X] T018 [P] [US1] Implementar `lib/services/contacts.ts`: CRUD de empresa e contato com `origem` (FR-003)
- [X] T019 [P] [US1] Implementar `lib/services/activities.ts`: registrar atividade na timeline (`note`, `call_note`) com data/hora (FR-006)
- [X] T020 [US1] Implementar `lib/services/closeDeal.ts` conforme contrato (validação zod por variante won/lost/standby) — faz T016 passar (FR-007)
- [X] T021 [P] [US1] Componentes do Kanban em `components/pipeline/`: `KanbanCard.tsx` (cliente, valor, dono, próxima ação; **indicador "parado" quando deal aberto sem `next_action`** — edge case "deal sem próxima ação"), `KanbanColumn.tsx`, `KanbanBoard.tsx` (Client Component com `@dnd-kit`, reordenação otimista) (D10, FR-004)
- [X] T022 [P] [US1] Componente `components/contacts/ActivityTimeline.tsx` (lista atividades por data/hora) (FR-006)
- [X] T023 [P] [US1] Componente `components/deals/CloseDealDialog.tsx` (campos condicionais por status terminal) (FR-007)
- [X] T024 [US1] Página `app/(crm)/pipeline/page.tsx` (Server Component que só compõe o `KanbanBoard`); ligar drag-soltar a `moveDeal` (FR-004)
- [X] T025 [US1] Página `app/(crm)/deals/[id]/page.tsx`: dados do deal, **seletor de dono (`owner_id` a partir de `profiles`)**, edição de próxima ação, timeline e botão de fechar (usa `CloseDealDialog`) (FR-004)
- [X] T026 [US1] Página `app/(crm)/contacts/[id]/page.tsx`: contato + empresa + timeline; formulários de cadastro/edição de empresa e contato
- [X] T027 [US1] Garantir RLS efetivo: acesso negado a não autenticado em todas as rotas do pipeline (FR-001/FR-028)

**Checkpoint**: pipeline utilizável e testável de ponta a ponta — **MVP mínimo entregável**.

---

## Phase 4: User Story 2 — Saber o que fazer hoje (Priority: P1)

**Goal**: tela "Hoje" lista follow-ups de hoje e atrasados do vendedor logado, atrasados em vermelho, ordenados por urgência.

**Independent Test**: com deals de próxima ação vencida e de hoje, "Hoje" lista exatamente esses itens do dono logado (atrasados primeiro); itens futuros ou de outro dono não aparecem.

### Tests for User Story 2

- [X] T028 [P] [US2] Teste unitário de `getToday` em `tests/unit/getToday.test.ts`: filtra por `owner_id`+`status='open'`+`next_action_date<=hoje`, ordena atrasados-primeiro, exclui futuros e de outro dono (FR-009/FR-010, SC-007)

### Implementation for User Story 2

- [X] T029 [US2] Implementar `lib/services/today.ts` (`getToday(ownerId, today)`) conforme contrato — faz T028 passar (D11, FR-009/FR-010)
- [X] T030 [P] [US2] Componente `components/deals/NextActionBadge.tsx`: destaque vermelho quando `next_action_date < hoje` (sinal comercial, PRD §14)
- [X] T031 [P] [US2] Componente `components/today/TodayList.tsx`: lista priorizada com ação rápida (abrir deal / atualizar próxima ação)
- [X] T032 [US2] Página `app/(crm)/hoje/page.tsx` consumindo `getToday` do usuário logado; concluir ação e definir nova data remove o item quando futura (SC-001, SC-002)

**Checkpoint**: US1 + US2 funcionam de forma independente — motor diário operante.

---

## Phase 5: User Story 3 — Propostas como objeto de primeira classe (Priority: P2)

**Goal**: criar/versionar propostas (valor, status, validade, link); status move o deal; proposta vencendo destacada.

**Independent Test**: criar proposta v1, versionar com novo valor, mudar status → histórico preservado na timeline e deal reflete o status.

### Implementation for User Story 3

- [X] T033 [P] [US3] Implementar repositório `lib/supabase/proposals.ts` (CRUD + UNIQUE deal_id+version)
- [X] T034 [US3] Implementar `lib/services/proposals.ts`: `createProposalVersion` (incrementa `version`, preserva histórico) e `updateProposalStatus` (move o deal para a etapa correspondente, grava atividade `proposal`) (FR-011/FR-012)
- [X] T035 [P] [US3] Componente `components/deals/ProposalForm.tsx` (valor, validade, doc_url)
- [X] T036 [P] [US3] Componente `components/deals/ProposalList.tsx` (histórico de versões; destaque de `valid_until < hoje`) (edge "proposta vencida")
- [X] T037 [US3] Integrar `ProposalForm`/`ProposalList` em `app/(crm)/deals/[id]/page.tsx`; mudança de status reflete na etapa do deal; **sinalizar o deal (página + card do Kanban) quando houver proposta com `valid_until < hoje`** (edge case "proposta vencida") (FR-012)

**Checkpoint**: US1–US3 independentes; fase de negociação rastreável.

---

## Phase 6: User Story 4 — Acompanhar forecast contra meta (Priority: P2)

**Goal**: dashboard com forecast ponderado × meta, % de atingimento e KPIs (pipeline por etapa, ganhos×perdidos, ticket médio, ciclo de venda, MRR novo, ranking).

**Independent Test**: com deals abertos, metas e alguns ganhos/perdidos no mês, o forecast ponderado, % de atingimento e KPIs batem com cálculo manual.

### Tests for User Story 4

- [X] T038 [P] [US4] Teste unitário de `computeForecast` em `tests/unit/computeForecast.test.ts`: só `status='open'`, `Σ value × probability/100`, agrega por total/etapa/owner, terminais excluídos, % atingimento vs goals (FR-017, SC-003)

### Implementation for User Story 4

- [X] T039 [P] [US4] Implementar repositório `lib/supabase/goals.ts` (CRUD, UNIQUE owner_id+month)
- [X] T040 [US4] Implementar `lib/services/computeForecast.ts` (**ponto único** do forecast) conforme contrato — faz T038 passar (D9, FR-017/FR-018)
- [X] T041 [US4] Implementar cadastro de metas (gestor) em `app/(crm)/dashboard/` + serviço de goals (FR-016)
- [X] T042 [P] [US4] Componente `components/dashboard/ForecastVsGoal.tsx` (barra forecast × meta + % atingimento, no topo)
- [X] T043 [P] [US4] Componente `components/dashboard/FunnelByStage.tsx` (pipeline em aberto por etapa)
- [X] T044 [P] [US4] Componente `components/dashboard/RepRanking.tsx` (conversão e R$ ganho por vendedor)
- [X] T045 [US4] Página `app/(crm)/dashboard/page.tsx` consumindo `computeForecast` + KPIs (ticket médio, ciclo de venda, MRR novo, ganhos×perdidos) (FR-018)

**Checkpoint**: pergunta do gestor ("quanto vamos fechar?") respondida com dados reais.

---

## Phase 7: User Story 5 — Playbooks preenchidos por IA + WhatsApp (Priority: P3)

**Goal**: escolher playbook, IA preenche `{{variaveis}}` com dados do contato/deal, botão abre WhatsApp com o texto pronto (sem enviar).

**Independent Test**: a partir de um deal com contato/telefone, escolher playbook, ver texto preenchido e o botão abrir a conversa com o texto no campo; sem telefone → mensagem clara.

### Tests for User Story 5

- [X] T046 [P] [US5] Teste unitário de `lib/whatsapp.ts` em `tests/unit/whatsapp.test.ts`: monta `wa.me/<e164>?text=` URL-encoded; telefone fora do padrão → erro claro (FR-015, edge "telefone fora do padrão")
- [X] T047 [P] [US5] Teste unitário de `fillTemplate` em `tests/unit/fillTemplate.test.ts` (IA mockada): substitui todas as `{{variaveis}}` conhecidas; não envia nada (FR-014)

### Implementation for User Story 5

- [X] T048 [P] [US5] Implementar repositório `lib/supabase/templates.ts` (listar por categoria)
- [X] T049 [US5] Implementar adapter `lib/integrations/anthropic.ts` (Messages API, `claude-sonnet-4-6`, key só no servidor, limite de gasto) atrás de interface (`analyze`, `fill`)
- [X] T050 [US5] Implementar `lib/services/fillTemplate.ts` conforme contrato — faz T047 passar (B4, FR-014)
- [X] T051 [US5] Implementar `lib/whatsapp.ts` (monta link `wa.me`) — faz T046 passar (B5, FR-015)
- [X] T052 [P] [US5] Componente `components/deals/WhatsAppButton.tsx` (abre nova aba; trata contato sem telefone) (FR-015)
- [X] T053 [US5] Página `app/(crm)/playbooks/page.tsx`: biblioteca por categoria + preencher via `fillTemplate` + botão WhatsApp (FR-013/FR-014)

**Checkpoint**: maior ganho de usabilidade entregue; método ("o que funciona pra vender?") disponível.

---

## Phase 8: User Story 6 — Sincronizar diagnósticos (Calendly) (Priority: P3)

**Goal**: polling do Calendly cria/atualiza contato (inbound) e deal em "Diagnóstico agendado" com dono e próxima ação; idempotente por UUID; reflete cancelamentos.

**Independent Test**: acionar "Atualizar" cria contato+deal com dono e próxima ação; segundo disparo não duplica; cancelamento na origem marca o deal.

### Tests for User Story 6

- [X] T054 [P] [US6] Teste de contrato em `tests/contract/calendly.test.ts`: paginação completa (2 páginas), filtro por `event_type`, dedup por `uid`, cancelamento marca o deal, deal nasce com `owner_id`+`next_action`+`next_action_date=start-1d` (FR-019..022, SC-004/SC-005)

### Implementation for User Story 6

- [X] T055 [P] [US6] Implementar repositório `lib/supabase/syncState.ts` (ler/gravar `calendly:last_synced_at`)
- [X] T056 [US6] Implementar adapter `lib/integrations/calendly.ts`: `listDiagnosticos(minStartTime)` com paginação (`pagination.next_page`), filtro por `CALENDLY_EVENT_TYPE_URI`, e `getInvitees(uri)` (B1; token só no servidor)
- [X] T057 [US6] Implementar `lib/services/createDealFromBooking.ts` conforme contrato: dedup por `calendly_event_uid`, `find-or-create` empresa/contato (`origem='inbound'`), deal em "Diagnóstico agendado" com `owner_id` (**regra do MVP: quem disparou o "Atualizar"; no cron, dono configurável via env** — Assumption do spec), `next_action`/`next_action_date`, atividade `note`, cancelamento marca deal — faz T054 passar (B1, Princípio III, FR-020)
- [X] T058 [US6] Implementar rota `app/api/sync/calendly/route.ts` (POST): autorizar por sessão Supabase **ou** `CRON_SECRET`; gatilho fino (valida, dedup, delega a `createDealFromBooking`, responde rápido; lote async); atualizar marca d'água só após sucesso (D5, FR-029)
- [X] T059 [P] [US6] Componente `components/pipeline/SyncButton.tsx` (botão *Atualizar*, Client Component) na página do pipeline
- [X] T060 [P] [US6] Configurar Vercel Cron em `vercel.json` com a entrada do **sync** chamando `/api/sync/calendly` (5–15 min) com `CRON_SECRET` (T067 adiciona depois a entrada do no-show no mesmo arquivo)

**Checkpoint**: entrada inbound automatizada sem duplicação.

---

## Phase 9: User Story 7 — Transcrição e análise pós-call (Priority: P3)

**Goal**: transcrição do tl;dv entra na timeline, marca presença, move o deal para "Diagnóstico realizado" e dispara análise por IA (resumo/qualificação/próxima ação + rascunho de follow-up); no-show quando passa sem transcrição. Falha de IA não trava o pipeline.

**Independent Test**: simular transcrição → atividade `transcript`, `attendance='compareceu'`, etapa "Diagnóstico realizado", análise grava próxima ação e rascunho; reenvio não duplica; call sem transcrição → no-show.

### Tests for User Story 7

- [X] T061 [P] [US7] Teste de contrato em `tests/contract/tldv.test.ts`: assinatura inválida → 401; `TranscriptReady` gera `transcript`+`compareceu`+etapa+análise; dedup por `meetingId`; falha de IA mantém consistência; sem transcrição após horário → `no_show` (FR-023..027)
- [X] T062 [P] [US7] Teste unitário de `analyzeTranscript` em `tests/unit/analyzeTranscript.test.ts` (IA mockada): grava `analysis`+`next_action`+rascunho; erro de IA não lança para o pipeline; nunca envia e-mail (FR-025/FR-026, SC-008)

### Implementation for User Story 7

- [X] T063 [P] [US7] Implementar adapter `lib/integrations/tldv.ts` (parse de `MeetingReady`/`TranscriptReady`) atrás de interface
- [X] T064 [P] [US7] Implementar adapter `lib/integrations/gmail.ts`: criar **rascunho** (nunca enviar) (Princípio V)
- [X] T065 [US7] Implementar `lib/services/analyzeTranscript.ts` conforme contrato: dedup por `meetingId`, chama Anthropic, grava `analysis`+`next_action`/`next_action_date`, rascunho Gmail; todo o bloco de IA em `try/catch` (não trava pipeline) — faz T062 passar (B3, D7)
- [X] T066 [US7] Implementar rota `app/api/webhooks/tldv/route.ts` (POST): verificar HMAC (`verify.ts`) antes de tocar o banco → 401 se inválido; validar (zod); `MeetingReady` associa `meetingId→deal_id`; `TranscriptReady` grava transcript, marca `compareceu`, move etapa e dispara `analyzeTranscript` async — faz T061 passar (B2, FR-023/FR-024/FR-029)
- [X] T067 [US7] Implementar detecção de no-show: rota `app/api/jobs/no-show/route.ts` (protegida por `CRON_SECRET`) que marca `attendance='no_show'` quando a call passou sem transcrição, **agendada via Vercel Cron em `vercel.json`** (FR-027)
- [X] T068 [P] [US7] (Opcional/pago — pertence logicamente à US6; depende de T057) Rota `app/api/webhooks/calendly/route.ts`: verificar HMAC e chamar o **mesmo** `createDealFromBooking` (B1-alt, D4 — push×pull destino único)

**Checkpoint**: todas as 7 histórias independentemente funcionais; ciclo da reunião fechado.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: ajustes transversais e validação final.

- [X] T069 [P] Revisar logs estruturados sem PII em serviços/integrações e payload mínimo à IA (LGPD, FR-030, D8)
- [X] T070 [P] Rate limiting nas rotas públicas (`/api/webhooks/*`) (Parte 3 PRD)
- [X] T071 Rodar `get_advisors` (security + performance) no Supabase e endereçar achados (RLS, índices)
- [X] T072 [P] Atualizar `quickstart.md`/`.env.example` com os scripts e variáveis finais
- [X] T073 Rodar `npm run lint` + `npm run test` e validar o smoke test do `quickstart.md` (critérios de aceite — PRD §18)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup — **bloqueia todas as histórias**.
- **User Stories (Phase 3–9)**: dependem da Foundational. Depois, podem ser paralelas (se houver time) ou sequenciais por prioridade (P1 → P2 → P3).
- **Polish (Phase 10)**: depende das histórias desejadas concluídas.

### User Story Dependencies

- **US1 (P1)**: após Foundational. Base de dados para todas as outras (deals/contatos/atividades).
- **US2 (P1)**: após Foundational; usa `next_action` do deal (US1) mas é testável isolada com seed.
- **US3 (P2)**: após Foundational; integra na página do deal (US1).
- **US4 (P2)**: após Foundational; ganha precisão com US1/US3 mas calcula isolada.
- **US5 (P3)**: após Foundational; usa contato/deal (US1) e adapter Anthropic.
- **US6 (P3)**: após Foundational; cria deals que alimentam US1.
- **US7 (P3)**: após Foundational; reusa `createDealFromBooking` destino único (US6) e Anthropic (US5), mas testável isolada.

### Within Each User Story

- Testes (quando presentes) antes da implementação do serviço correspondente.
- Repositórios → serviços → rotas/UI.
- Serviço pronto antes da integração na página.

### Parallel Opportunities

- Setup: T003–T006 em paralelo.
- Foundational: T011, T012, T013 em paralelo após T009/T010; T014/T015 dependem dos clients.
- Dentro de cada história, tarefas `[P]` (componentes/repos/testes em arquivos distintos) rodam juntas.
- Com time, US1–US7 podem ser distribuídas após a Foundational.

---

## Parallel Example: User Story 1

```bash
# Testes e componentes independentes da US1 em paralelo:
Task: "T016 Teste unitário de closeDeal em tests/unit/closeDeal.test.ts"
Task: "T021 Componentes Kanban em components/pipeline/"
Task: "T022 ActivityTimeline em components/contacts/ActivityTimeline.tsx"
Task: "T023 CloseDealDialog em components/deals/CloseDealDialog.tsx"

# Serviços de dados independentes:
Task: "T018 lib/services/contacts.ts"
Task: "T019 lib/services/activities.ts"
```

---

## Implementation Strategy

### MVP First (User Stories P1)

1. Phase 1 (Setup) → Phase 2 (Foundational, **crítica**).
2. Phase 3 (US1 — pipeline) → **STOP e VALIDAR** isoladamente.
3. Phase 4 (US2 — Hoje). Juntas, US1+US2 já são o menor CRM que "aumenta venda" (pipeline + motor diário).
4. Demo/deploy.

### Incremental Delivery

1. Setup + Foundational → fundação pronta.
2. US1 → testar → demo (pipeline).
3. US2 → testar → demo (Hoje) — **MVP comercial mínimo**.
4. US3 (propostas) → US4 (forecast×meta) → demo para o gestor.
5. US5 (playbooks/WhatsApp) → US6 (Calendly) → US7 (pós-call/IA).
6. Cada história agrega valor sem quebrar as anteriores.

### Parallel Team Strategy

Após a Foundational: Dev A em US1/US2, Dev B em US3/US4, Dev C em US5–US7 (compartilham serviços via contratos estáveis).

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- Schema é fonte de verdade (Apêndice A); **mudança de schema/arquitetura para, mostra diff e pergunta** (Princípio V).
- Forecast vive **só** em `computeForecast`; idempotência **só** por UUID/`meetingId`; push×pull chamam o **mesmo** `createDealFromBooking`.
- Rodar lint/types/test antes de considerar uma tarefa pronta; commit por tarefa ou grupo lógico.
