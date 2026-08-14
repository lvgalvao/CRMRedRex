# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fonte de verdade

**`.llm/prd.md` é a fonte de verdade do projeto** (PRD + constituição do CRM da RedRex). Antes de planejar ou escrever código, leia-o: define o objetivo de negócio, o modelo de dados (`Apêndice A — schema.sql`), a arquitetura em camadas e os specs de implementação (`Apêndice B`). Este `CLAUDE.md` é um resumo operacional; em qualquer conflito, o PRD prevalece. Utilizar também a imagem `.llm/crm.png` para auxiliar no entendimento do projeto com exemplo do layout do CRM / Kanbam e fluxo de trabalho.

Princípio de produto que filtra todo escopo: **"isso aumenta venda?"**. O CRM responde a três perguntas — *o que eu faço hoje?* (vendedor), *quanto vamos fechar este mês?* (gestor), *o que funciona pra vender?* (método). Feature que não serve a nenhuma, corta.

## Estado atual

O repositório foi inicializado com **Spec Kit** (`.specify/`, `speckit_version 0.8.4`) e **ainda não tem código de aplicação** — sem `package.json`, sem `app/`. O próximo passo não é codar direto: é rodar o ciclo de Spec-Driven Development descrito abaixo. A stack-alvo (a ser scaffolded) é Next.js + Supabase.

## Fluxo de trabalho — Spec-Driven Development (speckit)

O trabalho passa por skills do speckit, nesta ordem (review gate entre etapas):

1. **`speckit-constitution`** — preencher `.specify/memory/constitution.md` (hoje é template). Os princípios devem vir do PRD (Parte 2 e 3).
2. **`speckit-specify`** — cria `specs/<NNN-feature>/spec.md` e a branch de feature (`001-nome`, numeração sequencial).
3. **`speckit-clarify`** — fecha lacunas da spec antes de planejar.
4. **`speckit-plan`** — gera `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
5. **`speckit-tasks`** — gera `tasks.md` (dependência-ordenada).
6. **`speckit-analyze`** — consistência cruzada entre spec/plan/tasks (não-destrutivo).
7. **`speckit-implement`** — executa as tarefas.

Os artefatos de cada feature ficam em `specs/<NNN-feature>/`. Os scripts em `.specify/scripts/bash/` (`create-new-feature.sh`, `setup-plan.sh`, `check-prerequisites.sh`, `common.sh`) são invocados pelas skills — resolvem repo root pela pasta `.specify` e exigem branch de feature válida; normalmente não os chame à mão.

## Stack-alvo (ao scaffold)

- **Next.js (App Router) + TypeScript**, Tailwind + shadcn/ui
- **Supabase** (Postgres + Auth + RLS) — schema completo em `.llm/prd.md` Apêndice A
- Deploy **Vercel** (Cron para o polling do Calendly)
- IA em runtime: **API da Anthropic** (Messages, `claude-sonnet-4-6`) para análise pós-call e preenchimento de playbooks
- Integrações: **Calendly via polling** (plano Free; webhook só no plano pago), **tl;dv** (webhooks), **Gmail** (rascunho), **WhatsApp click-to-send** (`wa.me`, sem API)

Comandos (definidos em `package.json`): `npm run dev` (servidor local), `npm run build`, `npm start`, `npm run lint`, `npm run format` (Prettier), `npm test` (Vitest, `vitest run`) e `npm run test:watch`. Testes em `tests/unit` (serviços) e `tests/contract` (parsing Calendly/tl;dv).

## Arquitetura — as regras que não se quebram

**Camadas (trocar um fornecedor deve mexer em um só lugar):**
- `app/` — apresentação; páginas só compõem componentes pequenos.
- `lib/services/` — **toda regra de negócio** (`createDealFromBooking`, `analyzeTranscript`, `fillTemplate`, `computeForecast`). UI, sync e webhooks só chamam serviços.
- `lib/supabase/` — repositórios (acesso a dados).
- `lib/integrations/{calendly,tldv,anthropic,gmail}.ts` — cada integração atrás de uma interface; `lib/whatsapp.ts`; `lib/env.ts` valida env tipada (falha cedo).

**Invariantes (do PRD, seções 10/12 e Parte 3):**
- **Push × Pull, um só destino:** polling do Calendly e o webhook opcional chamam o **mesmo** `createDealFromBooking`; muda só o gatilho.
- **Idempotência pelo UUID, nunca pelo título:** dedup por `deals.calendly_event_uid` (Calendly) e `meetingId` (tl;dv). O título/`event_type` só decide *quais* eventos puxar.
- **Forecast num único lugar:** `computeForecast` = Σ `value × (stage.probability/100)`. Nunca espalhar essa regra.
- **Gatilhos finos:** rotas de sync/webhook validam (zod), deduplicam, delegam ao serviço e respondem rápido (2xx); processamento pesado é async.
- **IA não trava o pipeline:** falha de análise é capturada; o deal segue.
- **A IA não decide arquitetura:** em dúvida de design ou mudança de schema, **pare, mostre o diff e pergunte**.

**Segurança (requisitos, não sugestões):** RLS em todas as tabelas; `service role key` só no servidor; toda chave em env, nunca `NEXT_PUBLIC_*`, nunca commitada; token do Calendly só no servidor; webhooks verificam assinatura HMAC (comparação em tempo constante) antes de processar; rota de sync protegida por sessão Supabase ou `CRON_SECRET`; minimizar PII em logs e no que se envia à API (LGPD — transcripts e propostas são sensíveis).

**Camada de "subagente" ≠ runtime:** subagentes do Claude Code em `.claude/agents/` são ferramentas de **dev/manual**, não fazem parte do app em produção. Não se "deploya" subagente. A análise automática é serviço de runtime chamando a API (key com billing própria).

## Convenções

- TypeScript em tudo; `camelCase` para variáveis, `PascalCase` para componentes e tipos.
- Server Components por padrão; Client Component só com interatividade (drag-and-drop do Kanban, botão *Atualizar*, forms).
- Arquivo passou de ~300 linhas → quebra. Componente faz uma coisa; página compõe.
- Identidade visual **clara/executiva** (PRD seção 14, ref. `.llm/crm.png`): `background #F6F4EF`, `surface #FFFFFF`, `border #E7E3DB`, `primary #18181B` (preto), `accent #4D7C0F` (lime-700) e `lime #A3E635` (destaque); vermelho `#DC2626` só para atraso/erro. **Painel lateral** à esquerda (nav + time + Sair). Sinais comerciais visíveis: próxima ação atrasada em vermelho, barra forecast × meta + gauge no topo. **Visão executiva** (`/visao-geral`: forecast + KPIs + pipeline juntos) é a tela inicial ao logar; "Hoje" fica na sidebar como motor diário.

<!-- SPECKIT START -->
## Feature ativa

- **002-gestao-oportunidades** — plano de implementação: `specs/002-gestao-oportunidades/plan.md` (spec, research, data-model, contracts e quickstart na mesma pasta). Cadastro e gestão manual de Oportunidades: estende `deals` com `company_id`, `expected_close_date` e `probability` (`null` = herda a etapa), cria `deal_history` gravado por trigger e as telas de criar/editar/listar. **Não** cria entidade nova — no banco continua `deals`, na interface o rótulo é "Oportunidade".
- **001-crm-mvp-comercial** (entregue) — `specs/001-crm-mvp-comercial/plan.md`.
<!-- SPECKIT END -->

