# Implementation Plan: Cadastro e Gestão de Oportunidades

**Branch**: `main` (feature dir `002-gestao-oportunidades`) | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-gestao-oportunidades/spec.md`

## Summary

Completar a **Oportunidade** (tabela `deals`, já existente e em uso pelo Kanban, pela tela "Hoje" e pelo forecast) para gestão manual ponta a ponta: vínculo explícito com o **Cliente**, **previsão de fechamento**, **probabilidade ajustável**, formulário de **criação/edição**, **listagem filtrável** e **histórico imutável** de mudanças de etapa e status. Nenhuma entidade paralela é criada — duplicar `deals` quebraria forecast, Kanban e "Hoje".

**Abordagem técnica**: migration aditiva `0002` acrescenta 3 colunas a `deals` (`company_id`, `expected_close_date`, `probability`) e cria a tabela `deal_history`; um **trigger** em `deals` grava o histórico dentro da mesma transação do UPDATE, o que garante atomicidade (FR-020) e cobertura de 100% das mudanças (SC-002) inclusive as originadas em `closeDeal` e `createDealFromBooking`, sem refatorar cada call site. A probabilidade usa **semântica de `null` = herda a etapa**: nenhuma coluna de flag, e `computeForecast` — ponto único do cálculo, por constituição — passa a usar `deal.probability ?? stage.probability`. Validação pura em `lib/services/deals.schema.ts` (padrão de `closeDeal.schema.ts`), regra de negócio em `lib/services/deals.ts`, UI em Server Components com dois Client Components (formulário e controle de etapa/status).

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20 (runtime Vercel), Next.js 15 (App Router), React 19
**Primary Dependencies**: `@supabase/supabase-js` + `@supabase/ssr`; `zod` (validação pura); Tailwind + shadcn/ui; `@dnd-kit` (Kanban já existente). **Nenhuma dependência nova.**
**Storage**: Supabase Postgres com RLS. **Estado atual verificado**: migration `0001` aplicada; 10 tabelas com RLS ativo; `stages` com 9 linhas, `templates` com 5, `deals` com **0 linhas** — o backfill de `company_id` é no-op no ambiente atual, mas fica na migration por correção
**Testing**: Vitest — unidade nos serviços (`deals.schema`, probabilidade efetiva, `computeForecast` atualizado, transição de status/reabertura); o trigger de histórico é verificado por smoke test SQL documentado no quickstart (não há suíte de integração com banco no projeto)
**Target Platform**: Vercel (Node serverless) + navegador desktop
**Project Type**: Web application (Next.js full-stack — UI e route handlers no mesmo projeto)
**Performance Goals**: mudança de etapa reflete em ≤ 2 s no funil e no forecast (SC-003) — atualização otimista no Kanban já implementada + `revalidatePath`; listagem de oportunidades com filtro em uma única consulta com joins
**Constraints**: RLS obrigatório em `deal_history`, com **política de leitura apenas** (sem `insert`/`update`/`delete` para o usuário) para garantir imutabilidade (FR-018); regra de forecast confinada a `computeForecast`; arquivos acima de ~300 linhas são quebrados; datas em `date` (America/São_Paulo) usando o `todayISO()` já existente
**Scale/Scope**: single-org, poucos vendedores; +3 colunas, +1 tabela, +1 trigger; ~4 telas novas ou alteradas; ~8 arquivos novos em `lib/` e `components/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra a Constituição v1.0.0 (`.specify/memory/constitution.md`):

| Princípio | Aderência no plano | Status |
|-----------|--------------------|--------|
| **I. Orientação a vendas** | Responde às três perguntas: cadastro manual traz para o CRM a venda que nasce fora do agendamento (*o que eu faço hoje?*); previsão de fechamento e probabilidade ajustável tornam o forecast fiel (*quanto vamos fechar este mês?*); o histórico com tempo de permanência mostra onde a venda trava (*o que funciona pra vender?*). Nada fora dessas três. | ✅ PASS |
| **II. Arquitetura em camadas** | Validação pura em `deals.schema.ts`; regra em `lib/services/deals.ts`; acesso a dados em `lib/supabase/{deals,dealHistory}.ts`; páginas apenas compõem. `computeForecast` continua sendo o **único** ponto de cálculo — muda a fórmula de probabilidade lá dentro, em uma linha, sem espalhar. | ⚠️ PASS com ressalva |
| **III. Integrações idempotentes, gatilhos finos** | Feature manual, sem integração nova. O trigger de histórico cobre também os caminhos de sync/webhook sem alterá-los; `calendly_event_uid` e a dedup por UUID permanecem intactos. | ✅ PASS |
| **IV. Segurança e privacidade (LGPD)** | `deal_history` com RLS ativo e apenas política de `select` para `authenticated`; escrita exclusiva pelo trigger `security definer`. Nenhum segredo novo, nenhuma PII adicional (o histórico guarda ids, não texto livre). | ✅ PASS |
| **V. IA executa, humano decide** | Sem IA nesta feature. A mudança de schema e a adoção do trigger são apresentadas como diff e submetidas a aprovação antes do `/speckit-implement`, conforme exige o princípio. | ✅ PASS |

**Ressalva registrada** (ver Complexity Tracking): o trigger coloca a *escrita* do histórico no banco, e não em `lib/services/`. É uma concessão deliberada — a alternativa em serviço não garante FR-020 nem SC-002. A *decisão* (qual etapa, se reabre, o que valida) permanece integralmente nos serviços; o trigger só materializa o registro.

**Resultado**: gate aprovado para Phase 0, com uma justificativa em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-gestao-oportunidades/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — decisões técnicas e alternativas descartadas
├── data-model.md        # Phase 1 — deltas de schema, entidades, regras, transições
├── quickstart.md        # Phase 1 — aplicar migration, regenerar tipos, smoke tests
├── contracts/
│   ├── internal-services.md  # Assinaturas dos serviços e das server actions
│   └── db-triggers.md        # Contrato do trigger de histórico e da política de RLS
├── checklists/
│   └── requirements.md  # (já existente — 16/16 aprovado)
└── tasks.md             # Phase 2 — gerado por /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

Arquivos **novos** marcados com `+`, **alterados** com `~`; o restante é contexto existente e permanece intocado.

```text
supabase/
  migrations/
    0001_init.sql                      # aplicado — não editar
+   0002_opportunities.sql             # 3 colunas em deals, deal_history, trigger, RLS

lib/
  supabase/
~   types.ts                           # Deal ganha company_id/expected_close_date/probability; + DealHistory
~   deals.ts                           # DealWithRelations (contact+company+stage+owner), listDealsFiltered
+   dealHistory.ts                     # listHistoryByDeal (somente leitura)
  services/
+   deals.schema.ts                    # zod PURO: createDealSchema, editDealSchema, changeStageSchema
~   deals.ts                           # createDeal/editDeal/moveDeal + changeStatus + reopen
~   computeForecast.ts                 # probabilidade efetiva: deal.probability ?? stage.probability
~   closeDeal.ts                       # reusa o mapeamento etapa↔status compartilhado
+   dealStage.ts                       # mapeamento etapa terminal ↔ status (puro, compartilhado)

app/(crm)/
+ deals/page.tsx                       # US3 — listagem filtrável + soma dos valores
+ deals/actions.ts                     # createDealAction, filtros
+ deals/novo/page.tsx                  # US1 — formulário de nova oportunidade
+ deals/[id]/editar/page.tsx           # US3 — edição
~ deals/[id]/page.tsx                  # + bloco Etapa/Status + Histórico + previsão
~ deals/[id]/actions.ts                # + changeStageAction, changeStatusAction, editDealAction
~ pipeline/page.tsx                    # botão "+ Nova oportunidade" aponta para /deals/novo

components/deals/
+ DealForm.tsx                         # client — cliente→contato encadeados, probabilidade da etapa
+ StageStatusControl.tsx               # client — trocar etapa/status pelo detalhe
+ DealHistory.tsx                      # server — linha do tempo do histórico
+ DealFilters.tsx                      # client — filtros de responsável/etapa/status
~ ../pipeline/KanbanCard.tsx           # sinaliza previsão de fechamento vencida

tests/unit/
+ deals.schema.test.ts                 # validações puras (valor ≥ 0, probabilidade 0–100, obrigatórios)
+ dealStage.test.ts                    # mapeamento etapa↔status, reabertura
~ computeForecast.test.ts              # + casos de probabilidade ajustada por oportunidade
```

**Structure Decision**: mantida a estrutura do PRD seção 12 já vigente — nenhum diretório novo. A feature entra como delta nas quatro camadas existentes, respeitando a fronteira de import `app/`/`components/` → `lib/services/` → `lib/supabase/`. `lib/services/dealStage.ts` nasce puro (sem banco, sem env) para ser compartilhado por `deals.ts`, `closeDeal.ts` e pelos testes, evitando a duplicação do mapeamento etapa↔status que hoje vive só em `closeDeal.schema.ts`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Escrita do histórico em trigger de banco, não em `lib/services/` (Princípio II) | FR-020 exige atomicidade entre a mudança de etapa e o registro de histórico, e SC-002 exige 100% de cobertura. O cliente Supabase JS não abre transação multi-statement; o trigger executa na mesma transação do UPDATE e alcança também os caminhos que já existem (`closeDeal`, `createDealFromBooking`, drag-and-drop) sem tocá-los | **(a) Update + insert sequenciais no serviço**: uma falha entre as duas chamadas deixa etapa alterada sem histórico — viola FR-020. **(b) Função RPC no Postgres chamada pelo serviço**: resolve a atomicidade, mas exige alterar todos os call sites atuais e ainda permite que um `updateDeal` genérico burle o histórico — não garante SC-002. O trigger é a única opção que fecha as duas exigências |
| `deal_history` como tabela dedicada em vez de reuso de `activities` | O histórico precisa de campos estruturados (etapa origem/destino, status origem/destino, tempo de permanência) e de imutabilidade por RLS; `activities` tem `check` de `type` com semântica de timeline humana e é editável pelo usuário | Reusar `activities` exigiria ampliar o `check` de `type`, guardar dados estruturados em `metadata` jsonb (não consultável com índice) e abrir mão da imutabilidade — o histórico deixaria de ser auditável |
