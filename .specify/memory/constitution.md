<!--
SYNC IMPACT REPORT
Version change: TEMPLATE (unversioned) → 1.0.0
Rationale: Initial ratification — template placeholders replaced with concrete
principles derived from .llm/prd.md (PRD/constituição do CRM da RedRex, v2 maio/2026).
MINOR/MAJOR não se aplicam (primeira versão concreta); adotado como 1.0.0.

Principles defined:
  1. Orientação a vendas ("isso aumenta venda?")
  2. Arquitetura em camadas (regra de negócio nos serviços)
  3. Integrações idempotentes com gatilhos finos
  4. Segurança e privacidade por padrão (LGPD)
  5. IA executa, humano decide

Added sections:
  - Restrições de Stack e Segurança (SECTION_2)
  - Fluxo de Desenvolvimento (SECTION_3)

Removed sections: none (all template slots filled)

Templates reviewed:
  ✅ .specify/templates/plan-template.md — "Constitution Check" referencia a
     constituição genericamente (sem nomes de princípio fixos); nenhuma edição necessária.
  ✅ .specify/templates/spec-template.md — sem referências a princípios; alinhado.
  ✅ .specify/templates/tasks-template.md — sem referências a princípios; alinhado.
  ✅ CLAUDE.md — resumo operacional consistente com estes princípios.

Follow-up TODOs: none. RATIFICATION_DATE = data de adoção desta constituição concreta.
-->

# Constituição do CRM da RedRex

> Fonte de verdade do produto: `.llm/prd.md` (PRD + constituição estendida) e a
> referência visual `.llm/crm.png`. Esta constituição destila os princípios
> não-negociáveis que governam decisões de produto, arquitetura e revisão. Em
> conflito de detalhe, o PRD prevalece; em conflito de princípio, prevalece aqui.

## Core Principles

### I. Orientação a vendas ("isso aumenta venda?")

O objetivo do produto é **aumentar as vendas da RedRex**, não "ter um sistema". Toda
feature DEVE responder a pelo menos uma das três perguntas do teste prático:
_o que eu faço hoje?_ (vendedor), _quanto vamos fechar este mês?_ (gestor),
_o que funciona pra vender?_ (método). Feature que não serve a nenhuma das três
**fica fora do escopo** — corta.

Consequências obrigatórias: o caminho "abrir CRM → ver o que fazer hoje → agir
(WhatsApp/e-mail) → atualizar o deal" DEVE ser de poucos cliques; usabilidade é
requisito comercial, não estético (CRM difícil não se usa, e CRM que não se usa não
vende). Sinais comerciais (próxima ação atrasada, forecast × meta, proposta vencendo)
DEVEM ser visíveis.

**Rationale**: adoção pelo vendedor é o maior risco comercial — se o `next_action`/
status não for atualizado, o forecast mente. O produto se justifica por venda, não por
completude de funcionalidades.

### II. Arquitetura em camadas (regra de negócio nos serviços)

A separação de responsabilidades é não-negociável. As camadas:

- **Apresentação** (`app/`, `components/`): componentes React pequenos; páginas só compõem.
- **Aplicação** (`lib/services/`): **toda** regra de negócio (`createDealFromBooking`,
  `analyzeTranscript`, `fillTemplate`, `computeForecast`). UI, sync e webhooks só chamam.
- **Dados** (`lib/supabase/`): repositórios encapsulam o banco.
- **Integrações** (`lib/integrations/{calendly,tldv,anthropic,gmail}.ts`): cada fornecedor
  atrás de uma interface.

Regras: trocar Calendly por Cal.com, tl;dv por outro, ou o modelo de IA, DEVE exigir
mudança em **um só lugar**. O forecast vive **exclusivamente** em `computeForecast`
(`Σ value × stage.probability/100`) — nunca espalhar a regra. Arquivo que passar de
~300 linhas é quebrado; componente faz uma coisa.

**Rationale**: manutenibilidade e baixo acoplamento permitem trocar fornecedores e
evoluir sem reescrever; regra de negócio centralizada evita divergência de cálculo.

### III. Integrações idempotentes com gatilhos finos

Sincronização e webbooks são a maior superfície de risco e DEVEM ser idempotentes.

- **Dedup pelo UUID, nunca pelo título**: `deals.calendly_event_uid` (Calendly) e
  `meetingId` (tl;dv). Título/`event_type` só decide _quais_ eventos puxar.
- **Gatilho fino**: rotas de sync/webhook validam o payload (ex.: `zod`), deduplicam,
  delegam ao serviço e respondem rápido (2xx); processamento pesado roda async.
- **Push × Pull, destino único**: polling (plano Free) e webhook (upgrade pago) chamam
  o **mesmo** `createDealFromBooking`; muda só o gatilho.

**Rationale**: integrações de terceiros re-entregam, atrasam e mudam payload; a
corretude vem da idempotência por UUID, não da ordem ou do conteúdo da mensagem.

### IV. Segurança e privacidade por padrão (LGPD)

Requisitos, não sugestões:

- **RLS habilitado em todas as tabelas**; `service role key` só em rotas de servidor.
- **Segredos só no servidor**: nenhuma chave em `NEXT_PUBLIC_*`, nunca commitada; token
  do Calendly só no servidor; limite de gasto na API da Anthropic.
- **Webhooks verificam assinatura** (HMAC-SHA256, comparação em tempo constante) antes de
  processar; sem verificação → `401`. Rota de polling protegida por sessão Supabase ou
  `CRON_SECRET`. Rate limiting nas rotas públicas.
- **Privacidade**: transcripts e propostas são dados sensíveis — minimizar PII em logs,
  enviar à API só o necessário, respeitar consentimento e retenção.

**Rationale**: o CRM concentra dados comerciais e pessoais sensíveis; uma falha de
acesso ou vazamento custa mais que qualquer feature.

### V. IA executa, humano decide

- **A decisão de arquitetura é humana.** Em dúvida de design ou mudança de schema, a IA
  PARA, mostra o diff e pergunta.
- **Falha de IA não trava o pipeline**: erro de análise é capturado; o deal segue.
- **Revisão humana antes de saída externa**: no MVP a IA gera apenas **rascunho** de
  e-mail — envio automático é proibido.
- **IA de runtime ≠ subagente de dev**: a análise automática é serviço de runtime
  chamando a API (key com billing própria). Subagentes em `.claude/agents/` são
  ferramentas de dev/manual e **não** vão para produção — não se "deploya" subagente.

**Rationale**: a IA acelera execução mas não assume responsabilidade por decisões
estruturais nem por comunicação enviada em nome da empresa.

## Restrições de Stack e Segurança

Stack-alvo (definida no PRD, Parte 2): Next.js (App Router) + TypeScript; Tailwind +
shadcn/ui; Supabase (Postgres + Auth + RLS); deploy Vercel (Cron para o polling);
IA em runtime via API da Anthropic (Messages, `claude-sonnet-4-6`); integrações Calendly
(polling no Free), tl;dv (webhooks), Gmail (rascunho) e WhatsApp click-to-send
(`wa.me`, sem API).

Configuração centralizada e tipada em `lib/env.ts` (falha cedo se faltar
`CALENDLY_TOKEN`, `CALENDLY_USER_URI`, `CALENDLY_EVENT_TYPE_URI`, chaves de
Supabase/tl;dv/Anthropic/Gmail, `CRON_SECRET`). Server Components por padrão; Client
Component só com interatividade (drag-and-drop, botão _Atualizar_, forms). Migrations
versionadas. Logs estruturados sem PII. Convenções: `camelCase` para variáveis,
`PascalCase` para componentes e tipos.

## Fluxo de Desenvolvimento

O trabalho segue Spec-Driven Development (Spec Kit): **spec/plan primeiro, código
depois**. Ordem: `speckit-specify` → `speckit-clarify` → `speckit-plan` →
`speckit-tasks` → `speckit-analyze` → `speckit-implement`, com review gate entre etapas.
Artefatos de feature em `specs/<NNN-feature>/`.

Disciplina de implementação: um componente por vez, arquivos pequenos; mostrar o diff e
esperar revisão em mudanças de arquitetura ou schema; rodar lint/types antes de
considerar pronto. Testes: unidade nos serviços (forecast, fill de template), contrato no
parsing de Calendly/tl;dv. Os critérios de aceite do MVP (PRD seção 18) são o gate de
"pronto".

## Governance

Esta constituição governa decisões de produto, arquitetura e revisão; em conflito de
princípio, prevalece sobre práticas ad hoc. O PRD (`.llm/prd.md`) detalha requisitos e
permanece a fonte de verdade de produto.

**Emendas**: alteração de princípio exige edição deste arquivo, justificativa no Sync
Impact Report (HTML comment no topo) e bump de versão. Versionamento semântico:

- **MAJOR**: remoção/redefinição incompatível de princípio ou governança.
- **MINOR**: novo princípio/seção ou expansão material de orientação.
- **PATCH**: esclarecimentos, redação, correções não-semânticas.

**Conformidade**: planos e revisões DEVEM verificar aderência aos princípios (o
"Constitution Check" do `plan-template.md` referencia este documento). Complexidade que
viole um princípio DEVE ser justificada explicitamente ou recusada. A guidance de runtime
para agentes vive em `CLAUDE.md`, que DEVE permanecer consistente com esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-05-29 | **Last Amended**: 2026-05-29
