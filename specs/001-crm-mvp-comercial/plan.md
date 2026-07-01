# Implementation Plan: CRM Comercial da RedRex — MVP

**Branch**: `001-crm-mvp-comercial` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-crm-mvp-comercial/spec.md`

## Summary

CRM comercial single-org da RedRex que responde às três perguntas do produto — *o que eu faço hoje?* (vendedor), *quanto vamos fechar este mês?* (gestor), *o que funciona pra vender?* (método). O MVP entrega 7 fatias de valor priorizadas: pipeline Kanban com dono e próxima ação (P1), tela "Hoje" (P1), propostas versionadas (P2), forecast ponderado × meta (P2), playbooks preenchidos por IA + WhatsApp click-to-send (P3), sincronização Calendly via polling (P3) e transcrição/análise pós-call por IA (P3).

**Abordagem técnica**: Next.js (App Router, TypeScript) + Supabase (Postgres + Auth + RLS), deploy Vercel (Cron para polling). Arquitetura em camadas estritas — UI compõe componentes pequenos; **toda** regra de negócio em `lib/services/`; acesso a dados em `lib/supabase/`; cada integração (Calendly, tl;dv, Anthropic, Gmail) atrás de uma interface em `lib/integrations/`. Invariantes não-negociáveis: forecast num único `computeForecast`; idempotência por UUID (`calendly_event_uid`/`meetingId`), nunca por título; push×pull chamam o mesmo `createDealFromBooking`; falha de IA não trava o pipeline; gatilhos finos (validam com zod, deduplicam, delegam, respondem rápido). O schema é o Apêndice A do PRD, aplicado como migration versionada.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20 (runtime Vercel), Next.js 15 (App Router)
**Primary Dependencies**: Next.js + React 19; `@supabase/supabase-js` + `@supabase/ssr`; Tailwind CSS + shadcn/ui; `zod` (validação de payloads); `@anthropic-ai/sdk` (Messages, `claude-sonnet-4-6`); `@dnd-kit` (drag-and-drop do Kanban)
**Storage**: Supabase Postgres com RLS em todas as tabelas; schema = Apêndice A do PRD (10 tabelas). **Estado atual do banco: vazio (0 tabelas, 0 migrations)** — primeira migration cria o schema completo + seed (stages, templates)
**Testing**: Vitest para unidade nos serviços (`computeForecast`, `fillTemplate`, regras de fechamento) e testes de contrato no parsing de Calendly/tl;dv; React Testing Library opcional para componentes-chave
**Target Platform**: Vercel (Edge/Node serverless) + navegador desktop; Vercel Cron para o polling do Calendly
**Project Type**: Web application (Next.js full-stack — frontend + route handlers no mesmo projeto, estrutura de pastas única do PRD seção 12)
**Performance Goals**: rotas de sync/webhook respondem 2xx rápido (< ~1s) e processam o lote pesado async; tela "Hoje" e Kanban com leitura responsiva; análise IA ~$0,05–0,10/call (limite de gasto configurado)
**Constraints**: segredos só no servidor (nunca `NEXT_PUBLIC_*` para chaves sensíveis); RLS obrigatório; webhooks verificam HMAC (comparação tempo-constante) antes de processar; rota de polling protegida por sessão Supabase ou `CRON_SECRET`; idempotência por UUID; PII minimizada em logs e no envio à IA (LGPD); arquivo > ~300 linhas é quebrado
**Scale/Scope**: single-org (poucos vendedores + 1 gestor); ~9 telas; ~10 tabelas; baixo volume de deals — escala não é gargalo, adoção do vendedor é o risco comercial central

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra a Constituição v1.0.0 (`.specify/memory/constitution.md`):

| Princípio | Aderência no plano | Status |
|-----------|--------------------|--------|
| **I. Orientação a vendas** | Cada história mapeia a uma das três perguntas; "Hoje" é a landing pós-login; sinais comerciais (atrasado em vermelho, forecast×meta no topo, proposta vencendo) são requisitos de UI. Nenhuma feature fora das três perguntas. | ✅ PASS |
| **II. Arquitetura em camadas** | Estrutura de pastas do PRD seção 12 adotada literalmente; regra de negócio só em `lib/services/`; `computeForecast` único; cada integração atrás de interface em `lib/integrations/`; limite de ~300 linhas por arquivo. | ✅ PASS |
| **III. Integrações idempotentes, gatilhos finos** | Dedup por `calendly_event_uid`/`meetingId` (nunca título); polling e webhook opcional chamam o mesmo `createDealFromBooking`; handlers validam (zod), deduplicam, delegam, respondem rápido; pesado async. | ✅ PASS |
| **IV. Segurança e privacidade (LGPD)** | RLS em todas as tabelas; `service role key` só no servidor; segredos fora de `NEXT_PUBLIC_*`; HMAC nos webhooks; `CRON_SECRET`/sessão na sync; PII minimizada em logs e no payload da IA. | ✅ PASS |
| **V. IA executa, humano decide** | IA só gera rascunho (Gmail draft, nunca envio); falha de IA capturada (deal segue); subagente de briefing é dev/manual, fora de produção; mudanças de schema/arquitetura param e perguntam. | ✅ PASS |

**Resultado**: nenhuma violação. Complexity Tracking vazio. Gate aprovado para Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-crm-mvp-comercial/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — decisões técnicas resolvidas
├── data-model.md        # Phase 1 — entidades, relações, regras, transições
├── quickstart.md        # Phase 1 — setup local, migration, seed, env, smoke test
├── contracts/           # Phase 1 — contratos de integração e de serviços
│   ├── calendly-sync.md     # GET scheduled_events / invitees → createDealFromBooking
│   ├── tldv-webhook.md      # MeetingReady / TranscriptReady (HMAC) → analyzeTranscript
│   ├── anthropic-analysis.md# Messages API: análise pós-call + fillTemplate
│   └── internal-services.md # Assinaturas dos serviços (camada de aplicação)
├── checklists/
│   └── requirements.md  # (já existente)
└── tasks.md             # Phase 2 — gerado por /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

Estrutura conforme PRD seção 12 (Next.js App Router full-stack):

```text
app/
  (auth)/
    login/page.tsx                 # Supabase Auth
  (crm)/
    layout.tsx                     # guarda de sessão; "Hoje" como entrada padrão
    hoje/page.tsx                  # US2 — follow-ups de hoje + atrasados (motor diário)
    dashboard/page.tsx             # US4 — forecast ponderado × meta + KPIs
    pipeline/page.tsx              # US1 — Kanban (só compõe componentes)
    contacts/[id]/page.tsx         # contato + timeline + WhatsApp/e-mail
    deals/[id]/page.tsx            # deal + propostas + próxima ação
    playbooks/page.tsx             # US5 — biblioteca de templates
  api/
    sync/calendly/route.ts         # US6 — POST polling (sessão ou CRON_SECRET)
    webhooks/
      calendly/route.ts            # OPCIONAL/pago — webhook invitee.created (mesmo serviço)
      tldv/route.ts                # US7 — POST MeetingReady / TranscriptReady (HMAC)

components/
  ui/                              # primitivos shadcn
  pipeline/                        # KanbanBoard, KanbanColumn, KanbanCard, AddStageModal, SyncButton
  deals/                           # NextActionBadge, ProposalList, ProposalForm, WhatsAppButton, CloseDealDialog
  today/                           # TodayList
  dashboard/                       # ForecastVsGoal, FunnelByStage, RepRanking
  contacts/                        # ActivityTimeline

lib/
  env.ts                           # validação tipada das env (falha cedo)
  supabase/                        # repositórios + clients (server/browser/admin)
    client.ts, server.ts, admin.ts
    deals.ts, contacts.ts, companies.ts, stages.ts,
    proposals.ts, templates.ts, goals.ts, activities.ts, syncState.ts
  services/                        # REGRA DE NEGÓCIO
    createDealFromBooking.ts, analyzeTranscript.ts, fillTemplate.ts,
    computeForecast.ts, closeDeal.ts, today.ts, proposals.ts
  integrations/
    calendly.ts, tldv.ts, anthropic.ts, gmail.ts
  whatsapp.ts                      # monta link wa.me com texto preenchido
  webhooks/verify.ts               # HMAC-SHA256, comparação tempo-constante

supabase/
  migrations/                      # schema + RLS + seed versionados (Apêndice A)

tests/
  unit/                            # computeForecast, fillTemplate, closeDeal, today
  contract/                        # parsing Calendly / tl;dv
```

**Structure Decision**: Web application full-stack em projeto Next.js único (não há separação backend/frontend — route handlers e UI convivem no `app/`). Escolha ditada pelo PRD seção 12, que é parte da constituição de stack. As quatro camadas (apresentação → aplicação → dados → integrações) são fronteiras de import: `app/` e `components/` só importam de `lib/services/`; serviços importam de `lib/supabase/` e `lib/integrations/`; nunca o inverso. Isso garante o invariante "trocar um fornecedor mexe em um só lugar".

## Complexity Tracking

> Nenhuma violação de constituição a justificar — seção intencionalmente vazia.
