---
description: "Task list for 002-gestao-oportunidades"
---

# Tasks: Cadastro e Gestão de Oportunidades

**Input**: Design documents from `/specs/002-gestao-oportunidades/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluídos. Não por opção de estilo — a Constituição v1.0.0 (Fluxo de Desenvolvimento) exige testes de unidade nos serviços, e o projeto já roda Vitest com esse recorte. Não é TDD estrito: os testes das camadas puras vêm junto com elas, no mesmo bloco.

**Organization**: agrupado por user story, para que cada uma seja implementável, testável e demonstrável de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1, US2, US3 conforme `spec.md`
- Todo caminho de arquivo é relativo à raiz do repositório

## Contexto herdado (não repetir trabalho)

O CRM da feature 001 está no ar: `deals`, `stages`, `contacts`, `companies`, Kanban com drag-and-drop, tela de detalhe, `closeDeal`, `computeForecast` e a migration `0001` **aplicada** (10 tabelas, RLS ativo, `stages` com 9 linhas, `deals` com 0 linhas). Esta feature é delta. Nenhuma dependência npm nova.

---

## Phase 1: Setup

**Purpose**: garantir baseline verde antes de mexer em schema

- [X] T001 Rodar `npm run lint` e `npm test` e confirmar que a suíte atual passa; anotar qualquer falha preexistente antes de qualquer alteração
- [X] T002 Criar `supabase/migrations/0002_opportunities.sql` vazio com cabeçalho de comentário citando `specs/002-gestao-oportunidades/contracts/db-triggers.md` como contrato da migration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: schema, tipos e camadas puras — nada de US1/US2/US3 pode começar antes

**⚠️ CRITICAL**: T003–T007 mudam o banco. Conforme o Princípio V da Constituição, o diff da migration deve ser apresentado e aprovado antes de aplicar (T007).

- [X] T003 Em `supabase/migrations/0002_opportunities.sql`, adicionar as colunas `company_id uuid references companies(id) on delete set null`, `expected_close_date date` e `probability int check (probability is null or probability between 0 and 100)` em `public.deals`, mais a constraint `deals_value_nonneg`, o backfill de `company_id` a partir de `contacts.company_id` e os índices `deals(company_id)` e `deals(expected_close_date)`; **trocar a FK `deals.contact_id` de `on delete cascade` para `on delete restrict`** (achado F1 da análise: hoje excluir um contato apaga as oportunidades dele, contrariando o edge case de exclusão) — usar `if not exists` onde a sintaxe permitir (ordem 1–4 do contrato)
- [X] T004 Em `supabase/migrations/0002_opportunities.sql`, criar `public.deal_history` com as colunas de `data-model.md`, o índice `(deal_id, created_at desc)`, `enable row level security` e **apenas** a política de `select` para `authenticated` (ordem 5–6 do contrato)
- [X] T005 Em `supabase/migrations/0002_opportunities.sql`, criar `public.log_deal_change()` (`plpgsql`, `security definer`, `set search_path = public`) e o trigger `deals_log_change` `AFTER INSERT OR UPDATE` em `public.deals`, seguindo a tabela "Quando grava" e os campos derivados (`changed_by` validado contra `profiles`, `dwell_seconds` com piso 0) de `contracts/db-triggers.md` (ordem 7)
- [X] T006 Revisar o diff completo de `supabase/migrations/0002_opportunities.sql` com o usuário e obter aprovação explícita antes de aplicar
- [X] T007 Aplicar a migration (`supabase db push` ou MCP `apply_migration`) e rodar as quatro verificações SQL do `quickstart.md` §1 (3 colunas, RLS ativo, só política SELECT, trigger instalado)
- [X] T008 Atualizar `lib/supabase/types.ts`: `Deal` ganha `company_id: string | null`, `expected_close_date: string | null` e `probability: number | null`; adicionar o tipo `DealHistory` espelhando `deal_history`; conferir contra os tipos gerados pelo MCP antes de colar
- [X] T042 Em `lib/services/createDealFromBooking.ts`, passar `company_id: companyId` no `insertDeal` (a empresa já é resolvida na linha ~50 mas só é usada no contato) e, quando `companyId` for nulo, herdar do contato — sem isso toda oportunidade vinda do Calendly nasce sem cliente, violando FR-003 e SC-005 (achado F2 da análise; depende de T008)
- [X] T009 [P] Criar `lib/services/dealStage.ts` (puro, sem banco e sem env) com `TERMINAL_STAGE`, `STAGE_TO_STATUS`, `isTerminalStage`, `statusForStage`, `effectiveProbability(deal, stage)` e `transitionForStage(currentStatus, stageName)` — esta última devolve o patch de status da mudança de etapa, incluindo a reabertura que limpa `lost_reason` e `reaquecer_em`
- [X] T010 [P] Criar `lib/services/deals.schema.ts` (puro, zod) com `createDealSchema`, `editDealSchema`, `parseCreateDeal` e `parseEditDeal`, conforme a tabela de validação de `data-model.md`, com mensagens de erro em português
- [X] T011 Ajustar `lib/services/closeDeal.schema.ts` para reexportar `TERMINAL_STAGE` de `lib/services/dealStage.ts` em vez de declará-lo, mantendo os imports atuais de `closeDeal.ts` funcionando (depende de T009)
- [X] T012 [P] Criar `tests/unit/dealStage.test.ts` cobrindo `effectiveProbability` (herda quando nulo, prevalece quando ajustado), `statusForStage` nas 9 etapas e `transitionForStage` na reabertura de deal fechado (depende de T009)
- [X] T013 [P] Criar `tests/unit/deals.schema.test.ts` cobrindo campos obrigatórios, valor negativo recusado, probabilidade fora de 0–100 recusada, probabilidade ausente aceita como `null` e data de previsão no passado aceita (depende de T010)

**Checkpoint**: schema aplicado, tipos atualizados, camadas puras testadas — as três histórias podem começar

---

## Phase 3: User Story 1 — Cadastrar uma oportunidade manualmente (P1) 🎯 MVP

**Goal**: registrar no CRM a venda que nasce fora do agendamento automático, com cliente, contato, valor, etapa, probabilidade, responsável e previsão de fechamento.

**Independent Test**: preencher `/deals/novo` com cliente e contato existentes e salvar; a oportunidade aparece na coluna da etapa escolhida no `/pipeline`, com valor, responsável e previsão corretos, e persiste após recarregar.

- [X] T014 [US1] Reescrever `createDeal` em `lib/services/deals.ts`: validar com `parseCreateDeal`, herdar `company_id` do contato quando ausente, **recusar** contato que não pertence ao cliente informado, resolver `owner_id` com `getCurrentProfile()` como default e forçar `status='open'` (depende de T008, T010)
- [X] T015 [P] [US1] Criar `components/deals/DealForm.tsx` (Client Component) com os campos de `data-model.md`: select de cliente que filtra em memória os contatos daquele cliente (D6), probabilidade pré-preenchida com a da etapa selecionada e marcada como "ajustado" quando alterada, e exibição de erro por campo sem limpar o formulário
- [X] T016 [US1] Criar `app/(crm)/deals/actions.ts` com `createDealAction(prevState, formData)`: `"use server"`, extrai do `FormData`, delega a `createDeal`, devolve estado de erro em caso de `ZodError` (sem `throw` que derrube a página), `revalidatePath("/deals")` e `revalidatePath("/pipeline")`, e redireciona para `/deals/{id}` no sucesso (depende de T014)
- [X] T017 [US1] Criar `app/(crm)/deals/novo/page.tsx` (Server Component) carregando empresas (`listCompanies`), contatos (`listContacts`), etapas (`listStages`) e perfis (`listProfiles`), e compondo `DealForm` com `createDealAction` (depende de T015, T016)
- [X] T018 [US1] Alterar `lib/services/computeForecast.ts`: incluir `probability` no `select` de `computeForecast` e trocar `stage.probability / 100` por `effectiveProbability(d, stage) / 100` em `computeForecastFromData`, mantendo a assinatura pública intacta (depende de T009)
- [X] T019 [P] [US1] Ampliar `tests/unit/computeForecast.test.ts` com casos de probabilidade ajustada por oportunidade, probabilidade nula herdando a etapa e deal fechado fora do ponderado (depende de T018)
- [X] T020 [P] [US1] Em `app/(crm)/pipeline/page.tsx`, apontar o botão do cabeçalho para `/deals/novo` com o rótulo "+ Nova oportunidade" (o link atual leva a `/contacts`)

**Checkpoint**: US1 funcional — dá para cadastrar uma oportunidade manual e vê-la no funil e no forecast

---

## Phase 4: User Story 2 — Avançar a oportunidade no funil com histórico (P1)

**Goal**: mover a oportunidade pelo funil (arraste ou detalhe) e fechar/reabrir, com toda mudança de etapa e status registrada de forma imutável.

**Independent Test**: mover uma oportunidade por três etapas e fechá-la como Ganha; a linha do tempo mostra as transições em ordem, cada uma com autor, data/hora, origem, destino e tempo de permanência.

- [ ] T022 [P] [US2] Criar `lib/supabase/dealHistory.ts` com `listHistoryByDeal(db, dealId)` retornando `DealHistoryEntry[]` (join de etapas e autor, `created_at desc`), **somente leitura** — sem `insert`, `update` ou `delete` (depende de T007, T008)
- [ ] T023 [US2] Reescrever `moveDeal` em `lib/services/deals.ts`: no-op quando a etapa é a mesma; aplicar `transitionForStage` para derivar o status ao entrar em etapa terminal e para reabrir (limpando `lost_reason` e `reaquecer_em`) ao voltar para etapa ativa; gravar etapa, posição e status **no mesmo UPDATE**, para que o trigger produza um único registro de histórico (depende de T009)
- [ ] T024 [P] [US2] Criar `components/deals/DealHistory.tsx` (Server Component) exibindo a linha do tempo: "Etapa X → Y" e/ou "Status A → B", autor (`null` → "Sistema"), data/hora e tempo de permanência formatado em dias/horas (depende de T022)
- [ ] T025 [P] [US2] Criar `components/deals/StageStatusControl.tsx` (Client Component) com select de etapa e atalho de status; ao escolher uma etapa terminal, direcionar ao `CloseDealDialog` já existente em vez de fechar sem motivo (ressalva registrada em `contracts/internal-services.md`)
- [ ] T026 [US2] Em `app/(crm)/deals/[id]/actions.ts`, adicionar `changeStageAction(dealId, formData)` chamando `moveDeal` e revalidando `/deals/{id}`, `/deals`, `/pipeline` e `/hoje` (depende de T023)
- [ ] T027 [US2] Em `app/(crm)/deals/[id]/page.tsx`, compor `StageStatusControl` e `DealHistory`, carregando o histórico com `listHistoryByDeal` (depende de T024, T025, T026)
- [ ] T028 [US2] Executar os 7 casos de verificação do trigger em `contracts/db-triggers.md` (abertura registra, update de valor não registra, mudança de etapa registra com `dwell_seconds > 0`, etapa+status geram um só registro, mesma etapa não registra, escrita direta em `deal_history` recusada, service role grava autor nulo) e anotar os resultados (depende de T007, T023)

**Checkpoint**: US1 e US2 funcionam de forma independente — funil operável com auditoria completa

---

## Phase 5: User Story 3 — Editar e consultar a oportunidade (P2)

**Goal**: manter os dados da oportunidade fiéis à negociação e enxergar o conjunto filtrado com o total somado.

**Independent Test**: editar valor, previsão e responsável de uma oportunidade; os novos dados aparecem no detalhe, no card do Kanban e nas visões por vendedor, sem perder atividades, propostas ou histórico.

- [ ] T029 [P] [US3] Em `lib/supabase/deals.ts`, adicionar o tipo `DealWithRelations` (contato, empresa, etapa, responsável) e `listDealsFiltered(db, { ownerId?, stageId?, status? })` em uma única consulta com joins; ampliar `getDeal` para trazer também `company` e `stage`, **mantendo `DealWithContact` como tipo do Kanban** para não quebrar `KanbanBoard`/`KanbanCard` (achado F14; depende de T008)
- [ ] T030 [US3] Implementar `editDeal` em `lib/services/deals.ts` com `parseEditDeal`, revalidando a coerência contato↔cliente quando qualquer um dos dois mudar, sem alterar `stage_id` nem `status` (caminhos próprios da US2) (depende de T010)
- [ ] T031 [US3] Em `app/(crm)/deals/[id]/actions.ts`, adicionar `editDealAction(dealId, formData)` delegando a `editDeal`, com estado de erro por campo e revalidação de `/deals/{id}`, `/deals`, `/pipeline` e `/hoje` (depende de T030)
- [ ] T032 [US3] Criar `app/(crm)/deals/[id]/editar/page.tsx` reutilizando `DealForm` em modo edição, pré-preenchido com os dados atuais (depende de T015, T031)
- [ ] T033 [P] [US3] Criar `components/deals/DealFilters.tsx` (Client Component) com filtros de responsável, etapa e status, sincronizados por query string
- [ ] T034 [US3] Criar `app/(crm)/deals/page.tsx` (Server Component): lista as oportunidades via `listDealsFiltered`, compõe `DealFilters`, exibe cliente, contato, etapa, responsável, valor, probabilidade efetiva, previsão e status, e mostra a **soma dos valores** do conjunto filtrado (depende de T029, T033)
- [ ] T021 [P] [US3] Em `components/layout/AppSidebar.tsx`, adicionar o item de navegação "Oportunidades" apontando para `/deals`, no grupo do Pipeline (movida da US1 pelo achado F3: o link ficaria quebrado até `/deals` existir em T034; depende de T034)
- [ ] T035 [P] [US3] Em `components/pipeline/KanbanCard.tsx`, sinalizar previsão de fechamento vencida em vermelho (`#DC2626`, reservado a atraso/erro) quando `expected_close_date < hoje` e `status === 'open'`, reaproveitando o padrão do `overdue` já existente
- [ ] T036 [US3] Em `app/(crm)/deals/[id]/page.tsx`, exibir no cabeçalho cliente, previsão de fechamento (em vermelho se vencida) e probabilidade efetiva com o marcador "ajustado" quando houver ajuste manual (depende de T029)

**Checkpoint**: as três histórias funcionam de forma independente

---

## Phase 6: Polish & Cross-Cutting

- [ ] T037 Verificar o limite de ~300 linhas por arquivo em `app/(crm)/deals/[id]/page.tsx` e `components/deals/DealForm.tsx`; quebrar em componentes menores se ultrapassar
- [ ] T038 [P] Rodar `npm run lint`, `npm run format` e `npm test` e deixar tudo verde
- [ ] T039 Executar os 14 itens do smoke test de `quickstart.md` §4 e registrar o resultado de cada um
- [ ] T040 [P] Conferir a nomenclatura de interface: toda tela nova usa o rótulo **Oportunidade** (o código e o banco continuam em `deal`/`deals`, conforme D1)
- [ ] T041 Revisar aderência à Constituição antes de fechar: forecast calculado só em `computeForecast`, nenhuma regra de negócio em action ou componente, nenhum segredo novo, `deal_history` sem política de escrita

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: sem dependências
- **Foundational (T003–T013)**: depende do Setup e **bloqueia todas as histórias**. T006 é um gate humano (aprovação do diff de schema); T007 depende dele
- **US1 (T014–T021)**: depende do Foundational
- **US2 (T022–T028)**: depende do Foundational. Independente da US1 — o histórico funciona sobre oportunidades já existentes, mas na prática usar a US1 facilita a demonstração
- **US3 (T029–T036)**: depende do Foundational. Reutiliza `DealForm` da US1 em T032 — se a US3 for feita antes, T032 espera T015
- **Polish (T037–T041)**: depende das histórias desejadas

### Dentro de cada história

- Serviço antes da action; action antes da página; componente pode ir em paralelo com o serviço
- Testes das camadas puras acompanham a camada (T012, T013, T019)

### Parallel Opportunities

- **Foundational**: T009, T010 em paralelo; depois T012, T013 em paralelo
- **US1**: T015, T020 e T021 em paralelo com T014; T019 em paralelo após T018
- **US2**: T022, T024 e T025 em paralelo; T023 em paralelo com eles
- **US3**: T029, T033 e T035 em paralelo
- Com mais de uma pessoa: após o checkpoint do Foundational, US1, US2 e US3 podem correr em paralelo (o único encontro é T032 usando `DealForm`)

---

## Parallel Example: Foundational

```bash
# Camadas puras, arquivos distintos, sem dependência entre si:
Task: "Criar lib/services/dealStage.ts com o mapeamento etapa↔status e effectiveProbability"
Task: "Criar lib/services/deals.schema.ts com os schemas zod de criação e edição"

# Depois, os testes de cada uma:
Task: "Criar tests/unit/dealStage.test.ts"
Task: "Criar tests/unit/deals.schema.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Criar lib/supabase/dealHistory.ts com listHistoryByDeal"
Task: "Criar components/deals/DealHistory.tsx"
Task: "Criar components/deals/StageStatusControl.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (T001–T002)
2. Phase 2 (T003–T013) — **gate humano em T006** antes de aplicar a migration
3. Phase 3 (T014–T021)
4. **PARAR e VALIDAR**: itens 1–6 do smoke test do `quickstart.md`
5. Já é entregável: o CRM passa a registrar a venda que nasce fora do agendamento

### Entrega incremental

1. Setup + Foundational → base pronta (schema, tipos, camadas puras)
2. + US1 → cadastro manual funcionando (MVP)
3. + US2 → funil com auditoria (itens 7–10 do smoke test)
4. + US3 → edição, listagem filtrável e sinais visuais (itens 11–14)

### Riscos e pontos de atenção

- **T006 é bloqueante por constituição**: o Princípio V exige parar e mostrar o diff antes de mudança de schema. Não aplicar a migration sem aprovação
- **T018 toca o invariante do forecast**: a mudança deve ficar contida em `computeForecast`. Se surgir vontade de calcular probabilidade efetiva em outro lugar, é sinal de que algo saiu do lugar
- **T011 é refatoração de arquivo em uso**: `closeDeal.ts` importa `TERMINAL_STAGE`; rodar `npm test` logo após
- **T028 não tem suíte automatizada**: o trigger é verificado por SQL manual. Registrar os resultados no PR para que a evidência não se perca

---

## Notes

- Total: **42 tarefas** — Setup 2, Foundational 12, US1 7, US2 7, US3 9, Polish 5 (T042 e a realocação de T021 vieram da análise `/speckit-analyze`)
- `[P]` = arquivo diferente, sem dependência pendente
- Commitar por tarefa ou grupo lógico; parar em cada checkpoint para validar a história isoladamente
- Nomenclatura: banco e código em `deal`/`deals`; interface em "Oportunidade" (D1)
