# PRD — CRM da RedRex

### Documento único: requisitos de produto + constituição do projeto

**Produto:** CRM interno da RedRex (consultoria de engenharia de dados & IA)
**Autor:** Luciano Vasconcelos Filho · **Status:** v2 (MVP comercial) · **Atualizado:** maio/2026

> Este documento é a **fonte de verdade** do projeto: serve de PRD e de constituição (o que antes estava em `CLAUDE.md`). No repositório, o Claude Code carrega automaticamente um arquivo chamado `CLAUDE.md` — então salve este conteúdo como `CLAUDE.md` na raiz, ou deixe um `CLAUDE.md` de uma linha apontando para cá.

---

# PARTE 1 — Produto e negócio

## 1. Contexto e problema

A RedRex vende a partir de uma **Reunião de Diagnóstico** (agendada via Calendly). Hoje o controle do funil é manual: agendamentos no Calendly, gravações no tl;dv, follow-ups na memória. Resultado: oportunidades esfriam por falta de follow-up, não há visão de pipeline nem de **forecast contra meta**, e o conhecimento das melhores calls não vira método para o time.

## 2. Objetivo

**O objetivo é aumentar as vendas da RedRex** — não "ter um sistema". O CRM existe para:

- dar **controle das reuniões** comerciais ponta a ponta;
- garantir o **follow-up de clientes estratégicos** (zero oportunidade perdida por esquecimento), guiando o vendedor pela **próxima ação** de cada deal;
- gerar **scripts e playbooks** que elevam todo vendedor ao nível do melhor vendedor;
- dar ao gestor **forecast contra meta** para saber, a qualquer momento, _quanto vamos fechar este mês_.

Princípio de produto: toda feature responde **"isso aumenta venda?"**. Se não responde, fica fora do escopo. **Teste prático do CRM comercial:** ele responde sozinho a três perguntas — _o que eu faço hoje?_ (vendedor), _quanto vamos fechar este mês?_ (gestor), _o que funciona pra vender?_ (método). Se uma feature não serve a nenhuma das três, corta.

## 3. Métricas de sucesso (KPIs)

O dashboard é parte central do produto, não enfeite. Dois grupos: **resultado** (o número que o gestor cobra) e **atividade** (o que prevê o resultado).

**Resultado / forecast:**

- **Atingimento de meta** (% da meta do mês) — do time e por vendedor
- **Forecast ponderado** — Σ (valor do deal × probabilidade da etapa) dos deals em aberto
- **Pipeline em aberto (R$)** por etapa (valor bruto, sem ponderar)
- Projetos **ganhos × perdidos** (e valor de cada) no período
- **Ticket médio** e split **pontual × recorrente** (MRR novo no mês)

**Funil / atividade:**

- Reuniões (diagnósticos) **agendadas no mês**
- **Taxa de comparecimento / no-show** (fonte: campo `attendance` do deal)
- **Taxa de conversão por etapa** do funil
- **Ciclo de venda médio** (dias do lead ao "Ganho")
- **Tempo médio de follow-up** (dias entre a call e o próximo contato)
- Contatos feitos pós-reunião
- **Tempo médio em cada etapa / deals parados**
- **Conversão por origem** (inbound via Calendly × outbound)
- **Ranking por vendedor** (conversão e R$ ganho) — para identificar o melhor e replicar o método

## 4. Usuários

- **Vendedor (RedRex):** trabalha o pipeline, conduz diagnósticos, faz follow-up. Abre o CRM **para ver o que precisa fazer hoje**.
- **Gestor (Luciano):** acompanha **meta × forecast**, identifica deals parados e clientes estratégicos sem follow-up, vê o ranking do time.
- Sem acesso externo de cliente no MVP.

## 5. Escopo

**No MVP:**

- Autenticação do time + **perfis** (nome, papel) para atribuir dono aos deals.
- Pipeline **Kanban** (etapas com **probabilidade**, drag-and-drop, contatos, empresas) com **dono (owner)** por deal.
- **Próxima ação + data** por deal e tela **"Hoje"** (follow-ups de hoje e atrasados) — o motor diário do vendedor.
- Timeline de atividades.
- **Propostas** como objeto de primeira classe (valor, versão, status, validade, link).
- **Biblioteca de playbooks/templates** (diagnóstico, objeção, follow-up, proposta, reengajamento) que a IA preenche com os dados do contato.
- **Metas** (do time e por vendedor) e **dashboard com forecast ponderado × meta**.
- **WhatsApp click-to-send** (abre o WhatsApp com a mensagem do template já preenchida).
- Integração **Calendly via _polling_** (plano Free) — sincroniza diagnósticos e cria contato/deal.
- Integração **tl;dv** (transcript automático) + **análise pós-call por IA** + **rascunho de follow-up no Gmail**.

**Fora do MVP:** **win-rate por playbook** (qual script converte mais — depende de histórico); **motor de alertas automáticos** (follow-up atrasado, proposta vencendo); "por que perdemos" agregado via transcripts; mapa de stakeholders; multi-tenant/acesso de cliente; **envio** automático de e-mail (no MVP só rascunho, revisão humana obrigatória); **webhook do Calendly em tempo real** (upgrade pago, ver seção 16).

## 6. Fluxo de sucesso da reunião comercial

1. **Entrada e qualificação** — Inbound: Calendly via **polling** cria contato/deal direto em "Diagnóstico agendado". Outbound: deal entra em "Novo lead" e **só avança para "Diagnóstico agendado" depois de "Qualificado"** (diagnóstico é hora de sênior — não se agenda quem não compra). E-mail de aviso. O deal já nasce com **dono** e **próxima ação**.
2. **Preparação (pré-call)** — script de diagnóstico gerado a partir do **playbook** + dados do contato/empresa.
3. **A call** — tl;dv grava/transcreve; o transcript chega, vira atividade no deal, **marca presença (`attendance='compareceu'`)** e move o deal para "Diagnóstico realizado". (No-show é marcado quando a call passa sem transcript.)
4. **Análise (automática)** — IA gera resumo/qualificação/próximo passo + **grava a próxima ação no deal** (alimentando a tela "Hoje") + **rascunho de follow-up no Gmail** citando as dores exatas.
5. **Proposta e negociação** — cria-se uma **proposta** (valor, versão, validade); deal vai para "Proposta enviada" → "Negociação". A **validade da proposta** é a alavanca de urgência; cada versão/e-mail fica na timeline.
6. **Fechamento** — **"Ganho"** (com **tipo**: pontual ou recorrente + MRR; valor entra no dashboard e na meta), **"Perdido"** (com **motivo padronizado**) ou **"Stand-by"** (deal não morto: congelou orçamento/ficou pro próximo trimestre — com **data para reaquecer**).

## 7. Requisitos funcionais

- **RF1** Login seguro; rotas do CRM protegidas. **Perfis** (`profiles`) com nome e papel.
- **RF2** CRUD de empresas, contatos (com `origem`), deals e etapas (etapa tem `probability`).
- **RF3** Kanban com reordenação e movimentação entre etapas (persistir `position` e `stage_id`); cada deal exibe **dono**, **valor**, **próxima ação/data**.
- **RF4** Timeline de atividades por contato/deal.
- **RF5** **Próxima ação:** todo deal em aberto tem `next_action` + `next_action_date`. Tela **"Hoje"** lista, por vendedor, os follow-ups **de hoje e atrasados**, ordenados por urgência.
- **RF6** **Propostas:** criar/versionar proposta (valor, status `rascunho→enviada→vista→aceita→recusada`, `valid_until`, `doc_url`); atalho de WhatsApp/e-mail; mover o deal conforme o status.
- **RF7** **Playbooks/templates:** biblioteca por categoria (diagnóstico, objeção, follow-up, proposta, reengajamento); a IA **preenche o template** com os dados do contato/deal sob demanda.
- **RF8** **WhatsApp click-to-send:** botão que abre o WhatsApp (`wa.me`) com a mensagem do template já preenchida (sem API, sem custo).
- **RF9** **Metas e forecast:** cadastrar meta mensal (time e por vendedor); dashboard com **forecast ponderado × meta**, % de atingimento, ticket médio, ciclo de venda, MRR novo, ranking por vendedor.
- **RF10** **Sincronização Calendly (_polling_ da API v2, plano Free):** puxa os eventos do **tipo "diagnóstico"**, cria/atualiza contato e deal; **idempotente por UUID do evento**; deal nasce com dono e próxima ação. Disparo manual (botão _Atualizar_) e/ou cron. Trata cancelamentos. _(Webhook `invitee.created` = upgrade pago, mesmo serviço.)_
- **RF11** Webhook tl;dv: associa transcript ao deal certo; marca presença; **idempotente**.
- **RF12** Análise pós-call via API da Anthropic; grava análise + **próxima ação** no CRM; cria rascunho no Gmail.
- **RF13** Dashboard com os KPIs da seção 3.

## 8. Requisitos não-funcionais

- **Segurança/privacidade** conforme Parte 3.
- **Usabilidade (é requisito comercial):** o caminho "abrir CRM → ver o que fazer hoje → agir (WhatsApp/e-mail) → atualizar deal" tem que ser de poucos cliques. Vendedor não usa CRM difícil — e CRM que não se usa não vende.
- **Manutenibilidade:** arquitetura em camadas, componentes pequenos, integrações isoladas.
- **Desempenho:** o polling responde rápido e processa o lote em background; webhooks respondem 2xx e processam pesado depois.
- **Confiabilidade:** sincronização e webhooks **idempotentes**; falha de IA não trava o pipeline.
- **Custo:** análise por IA ~$0,05–0,10/call (Sonnet 4.6); limite de gasto na API.

---

# PARTE 2 — Arquitetura e implementação

## 9. Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Row Level Security)
- Deploy: Vercel (inclui Cron para o polling)
- Runtime inbound: **Calendly — _polling_ da API v2 (plano Free)**; tl;dv (webhooks `MeetingReady` / `TranscriptReady`). _Webhook `invitee.created` do Calendly = upgrade opcional pago._
- IA em runtime: API da Anthropic (endpoint Messages) para análise pós-call e preenchimento de playbooks
- Saída: Gmail (rascunho) + **WhatsApp click-to-send** (`wa.me`, sem API)

## 10. As duas camadas (regra mental do projeto)

1. **Runtime do app** — a sincronização do Calendly (polling) e o webhook do tl;dv criam contato, movem deal, gravam transcript, marcam presença, mandam e-mail. Código de backend; sem IA decidindo.
2. **IA em runtime** — o backend chama a API da Anthropic para analisar o transcript, definir a próxima ação e preencher playbooks/follow-up.

**Onde a IA roda (a distinção que mais confunde):** análise automática = serviço de runtime chamando a API (API key com billing, separada do Pro/Max). **Subagente do Claude Code** (`.claude/agents/`) é ferramenta de **dev/uso manual** — não faz parte do app em produção. Não se "deploya" um subagente.

**Push × Pull (o que muda no plano Free):** webhook é _push_ (tempo real, pago); polling é _pull_ (o app pergunta "tem diagnóstico novo?", funciona no Free com minutos de atraso). **Os dois chamam o mesmo serviço (`createDealFromBooking`); muda só o gatilho.**

## 11. Modelo de dados

Ver **Apêndice A** (`schema.sql`). Tabelas:

- `profiles` — membros do time (dono dos deals, ranking).
- `companies`, `contacts` (com `origem`).
- `stages` (com `probability` para o forecast).
- `deals` — agora com `owner_id`, `deal_type` (pontual/recorrente) + `mrr`, `next_action`/`next_action_date`, `attendance`, `lost_reason` **padronizado**, `reaquecer_em` (stand-by) e `calendly_event_uid` (idempotência do polling).
- `proposals` — versão/valor/status/validade/link.
- `templates` — playbooks por categoria.
- `goals` — meta mensal (time/vendedor).
- `activities` (`note`, `call_note`, `transcript`, `analysis`, `email`, `proposal`).
- `sync_state` — marca d'água do polling.

Todas com RLS. Os campos de `deals`/`stages`/`proposals`/`goals` e os timestamps de `activities` sustentam **todas** as métricas da seção 3.

## 12. Arquitetura para manutenção

Objetivo: trocar Calendly por Cal.com, tl;dv por outro, ou o modelo de IA, mexendo em **um** lugar.

**Camadas (separação de responsabilidades):**

- **Apresentação** — componentes React pequenos; páginas só compõem.
- **Aplicação (serviços)** — `lib/services/` (ex.: `createDealFromBooking`, `analyzeTranscript`, `fillTemplate`, `computeForecast`). Regra de negócio aqui; sync, webhooks e UI só chamam.
- **Dados (repositórios)** — `lib/supabase/` encapsula o banco.
- **Integrações (adapters)** — `lib/integrations/{calendly,tldv,anthropic,gmail}.ts` + `lib/whatsapp.ts`, cada uma atrás de uma interface.

**Estrutura de pastas:**

```
app/
  (auth)/                      ← login (Supabase Auth)
  (crm)/
    hoje/page.tsx              ← "Hoje": follow-ups de hoje + atrasados (motor diário)
    dashboard/page.tsx         ← forecast ponderado × meta + KPIs
    pipeline/page.tsx          ← Kanban (só compõe os componentes)
    contacts/[id]/page.tsx     ← contato + timeline + WhatsApp/e-mail
    deals/[id]/page.tsx        ← deal + propostas + próxima ação
    playbooks/page.tsx         ← biblioteca de templates
  api/
    sync/calendly/route.ts     ← POST: polling (plano Free) → cria contato/deal
    webhooks/
      calendly/route.ts        ← (OPCIONAL, pago) webhook invitee.created → mesmo serviço
      tldv/route.ts            ← POST: MeetingReady / TranscriptReady
components/
  ui/                          ← primitivos shadcn
  pipeline/                    ← KanbanBoard, KanbanColumn, KanbanCard, AddStageModal, SyncButton
  deals/                       ← NextActionBadge, ProposalList, ProposalForm, WhatsAppButton
  today/                       ← TodayList
  dashboard/                   ← ForecastVsGoal, FunnelByStage, RepRanking
  contacts/                    ← ActivityTimeline
lib/
  env.ts                       ← validação tipada das variáveis (falha cedo)
  supabase/                    ← repositórios
  services/                    ← regra de negócio (forecast, templates, booking, análise)
  integrations/                ← calendly (polling + webhook), tldv, anthropic, gmail
  whatsapp.ts                  ← monta link wa.me com texto preenchido
  webhooks/verify.ts           ← verificação de assinatura (HMAC) — tl;dv e webhook opcional do Calendly
.claude/agents/                ← subagentes de DEV/manual (não vão p/ produção)
supabase/schema.sql            ← schema + RLS + seed (Apêndice A)
```

**Regras de organização:**

- **Gatilhos finos:** sync e webhooks validam, deduplicam (UUID / `meetingId`), delegam ao serviço e respondem rápido.
- **Componentização:** arquivo > ~300 linhas, quebra. Página compõe; componente faz uma coisa.
- **Config centralizada e tipada** (`lib/env.ts`): valida `CALENDLY_TOKEN`, `CALENDLY_USER_URI`, `CALENDLY_EVENT_TYPE_URI`, chaves do Supabase/tl;dv/Anthropic/Gmail, `CRON_SECRET`.
- **Forecast num só lugar:** `computeForecast` (etapa.probability × deal.value) — nunca espalhar a regra.
- **Erro e observabilidade:** logs estruturados sem PII; falha de IA capturada, o deal segue.
- **Migrations versionadas; testes:** unidade nos serviços (forecast, fill de template), contrato no parsing do Calendly/tl;dv.

## 13. Convenções de código

- TypeScript em tudo. `camelCase` para variáveis, `PascalCase` para componentes e tipos.
- Server Components por padrão; Client Component só com interatividade (drag-and-drop, botão _Atualizar_, forms).
- Nunca commitar `.env`. Toda chave em variável de ambiente; token do Calendly só no servidor.
- A IA executa; **a decisão de arquitetura é humana**. Em dúvida de design, pare e pergunte.

## 14. Design — identidade RedRex (claro, executivo)

> Atualizado (v2.1): identidade migrou de dark+vermelho para **tema claro executivo** (preto + verde-limão), conforme `.llm/crm.png`. Pontos de partida; ajuste no `tailwind.config.ts`.
> **Referência visual:** `.llm/crm.png` — sidebar à esquerda, faixa de KPIs/forecast no topo e Kanban na mesma tela. Layout/hierarquia limpos, muito espaço em branco, cards brancos sobre fundo creme.

- `background` `#F6F4EF` (creme) · `surface` `#FFFFFF` (cards/sidebar) · `border` `#E7E3DB`
- `primary` (preto) `#18181B` · `accent` (lime-700) `#4D7C0F` · `lime` (destaque vivo) `#A3E635`
- `text` `#1A1A1A` · `text-muted` `#6B7280`
- `radius`: card `16px`, pill `9999px`
- Tom: light mode executivo, **botões pretos** como ação, **verde-limão** como destaque (gauges/barras), títulos pesados.
- **Layout:** **painel lateral** à esquerda (logo, navegação, time, usuário+Sair); conteúdo à direita.
- **Sinais comerciais visíveis:** próxima ação atrasada **em vermelho** (`#DC2626`, reservado para atraso/erro); proposta vencendo destacada; barra **forecast × meta** + gauge de taxa de sucesso no topo; **visão executiva** (forecast + KPIs + pipeline na mesma tela) como primeira coisa ao logar. A tela **"Hoje"** continua acessível na sidebar como motor diário do vendedor.

## 15. Como o Claude Code deve trabalhar

1. Spec/plan primeiro; só depois código.
2. Um componente por vez, arquivos pequenos.
3. Mostre o diff e espere revisão em mudanças de arquitetura ou schema.
4. Rode lint/types antes de considerar pronto.

---

# PARTE 3 — Revisão de segurança (requisitos, não sugestões)

**Sincronização e webhooks (maior superfície de ataque):**

- **Calendly por polling (Free):** sem assinatura a verificar (chamada de saída). Proteções: **token só no servidor** (`CALENDLY_TOKEN`), **rota de sync protegida** (sessão Supabase, ou cron com `CRON_SECRET`), **dedup por UUID do evento**.
- **Webhook do Calendly (upgrade pago) e tl;dv:** **verificar assinatura** antes de processar. Calendly: header `Calendly-Webhook-Signature` (HMAC-SHA256), comparação em **tempo constante**. tl;dv: validar segredo/origem. Sem verificação → `401`.
- **Idempotência:** deduplique pelo **UUID do evento do Calendly** (`deals.calendly_event_uid`) e pelo `meetingId` do tl;dv. **A chave de dedup é o UUID, nunca o título** — o título só filtra _quais_ eventos puxar.
- **Validação de payload** (ex.: `zod`) antes de tocar o banco.
- **Responder rápido e processar async;** **rate limiting** nas rotas públicas; cron de polling em intervalo sensato (5–15 min).

**Segredos e chaves:** toda chave **só no servidor**, nunca em `NEXT_PUBLIC_*`, nunca commitada. Env vars na Vercel; rotacione; **limite de gasto** na API da Anthropic.

**Banco (Supabase):** **RLS em todas as tabelas**; `service role key` só em rotas de servidor.

**Privacidade / LGPD (transcript e propostas são dados sensíveis):** consentimento de gravação; retenção definida; acesso restrito por RLS; **minimize PII em logs**; ao chamar a API, **envie só o necessário**.

---

# PARTE 4 — Riscos, roadmap e aceite

## 16. Riscos e dependências

- **Calendly (plano Free):** sincronização por **polling** (atraso de minutos), não tempo real. A API v2 (GET/POST) funciona em qualquer plano, inclusive Free; o **webhook em tempo real exige plano pago** (upgrade opcional, mesmo serviço).
- **tl;dv** exige plano Business para o transcript automático; **API da Anthropic** exige key com billing.
- **Adoção é risco comercial:** se o vendedor não atualizar o `next_action`/status, o forecast mente. Mitigação: tela "Hoje" + WhatsApp em poucos cliques + a IA já preenchendo a próxima ação pós-call.
- Integrações de terceiros: trate re-entrega, atraso, paginação e payload mudando (idempotência + testes de contrato).

## 17. Roadmap

- **Fase 1 (MVP comercial):** seções 5 e 7 — pipeline com dono e próxima ação, tela "Hoje", propostas, playbooks (preenchidos por IA), metas + forecast, WhatsApp, Calendly via polling, tl;dv + análise.
- **Fase 2:** **win-rate por playbook** (qual script converte), **motor de alertas** (follow-up atrasado, proposta vencendo, stand-by chegando na data de reaquecer), "por que perdemos" agregado, webhook do Calendly em tempo real.
- **Fase 3:** envio automático de e-mail (com salvaguardas), enriquecimento de contato, mapa de stakeholders, papéis/permissões granulares.

## 18. Critérios de aceite (MVP)

- **Forecast × meta** aparece no dashboard com dados reais (ponderado por etapa) e % de atingimento do mês.
- A tela **"Hoje"** lista os follow-ups de hoje e atrasados do vendedor logado.
- Clicar **Atualizar** puxa os diagnósticos do Calendly e cria contato + deal (com dono e próxima ação), **sem duplicar** em clique repetido.
- Transcript do tl;dv cai no deal certo, **marca presença** e dispara a análise; a análise grava a **próxima ação** e o rascunho de follow-up no Gmail.
- Criar uma **proposta** versiona valor/status/validade e move o deal.
- O **WhatsApp click-to-send** abre a conversa com o texto do template preenchido.
- "Ganho" registra **tipo** (pontual/recorrente + MRR); "Perdido" exige **motivo padronizado**; "Stand-by" exige **data de reaquecer**.
- RLS ativo, assinaturas verificadas (tl;dv/webhook opcional), token do Calendly só no servidor, nenhuma chave no client.

---

# Apêndice A — `schema.sql`

```sql
-- CRM da RedRex — schema Supabase (Postgres). Single-org: membro autenticado acessa.

-- Perfis do time (dono dos deals, ranking de vendedores)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'vendedor' check (role in ('vendedor','gestor')),
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  email text unique not null,
  phone text,                 -- usado no WhatsApp click-to-send
  origem text not null default 'inbound' check (origem in ('inbound','outbound')),
  created_at timestamptz not null default now()
);

-- Etapas com probabilidade -> alimenta o forecast ponderado
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null,
  probability int not null default 0,   -- 0..100 (% de fechar nesta etapa)
  color text
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  stage_id uuid not null references public.stages(id),
  owner_id uuid references public.profiles(id),          -- dono do deal (cobrança/ranking)
  title text not null,
  value numeric(12,2) default 0,                         -- valor de fechamento (forecast)
  deal_type text not null default 'pontual' check (deal_type in ('pontual','recorrente')),
  mrr numeric(12,2) default 0,                           -- receita recorrente mensal (se recorrente)
  position int not null default 0,
  status text not null default 'open' check (status in ('open','won','lost','standby')),
  -- presença na reunião -> fonte do KPI de no-show
  attendance text not null default 'pendente' check (attendance in ('pendente','compareceu','no_show','remarcado')),
  -- motor diário do vendedor
  next_action text,
  next_action_date date,
  -- motivo padronizado de perda -> "por que perdemos" vira gráfico
  lost_reason text check (lost_reason in ('preço','timing','concorrente','sem_budget','sumiu','outro')),
  reaquecer_em date,                                     -- deals em stand-by
  -- idempotência do polling do Calendly (NUNCA usar o título p/ dedup)
  calendly_event_uid text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Propostas como objeto de 1a classe (versão, status, validade)
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  version int not null default 1,
  value numeric(12,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','vista','aceita','recusada')),
  valid_until date,                                      -- alavanca de urgência
  doc_url text,
  created_at timestamptz not null default now(),
  unique (deal_id, version)
);

-- Biblioteca de playbooks que a IA preenche
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('diagnostico','objecao','followup','proposta','reengajamento')),
  body text not null,           -- com {{variaveis}}, ex.: "Oi {{nome}}, sobre {{dor}}..."
  created_at timestamptz not null default now()
);

-- Metas mensais (time = owner_id null; vendedor = owner_id setado)
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  month date not null,                                   -- primeiro dia do mês
  target_value numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (owner_id, month)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  type text not null check (type in ('note','call_note','transcript','analysis','email','proposal')),
  content text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Marca d'água do polling (otimização; a corretude vem do dedup por UUID)
create table public.sync_state (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create index on public.deals (stage_id);
create index on public.deals (contact_id);
create index on public.deals (owner_id);
create index on public.deals (next_action_date);
create index on public.deals (status);
create index on public.proposals (deal_id);
create index on public.goals (month);
create index on public.activities (deal_id);
create index on public.activities (contact_id);
create index on public.activities (type);

alter table public.profiles   enable row level security;
alter table public.companies  enable row level security;
alter table public.contacts   enable row level security;
alter table public.stages     enable row level security;
alter table public.deals      enable row level security;
alter table public.proposals  enable row level security;
alter table public.templates  enable row level security;
alter table public.goals      enable row level security;
alter table public.activities enable row level security;
alter table public.sync_state enable row level security;

-- MVP single-org: qualquer membro autenticado acessa. (Refinar por owner na Fase 3.)
create policy "auth — profiles"   on public.profiles   for all to authenticated using (true) with check (true);
create policy "auth — companies"  on public.companies  for all to authenticated using (true) with check (true);
create policy "auth — contacts"   on public.contacts   for all to authenticated using (true) with check (true);
create policy "auth — stages"     on public.stages     for all to authenticated using (true) with check (true);
create policy "auth — deals"      on public.deals      for all to authenticated using (true) with check (true);
create policy "auth — proposals"  on public.proposals  for all to authenticated using (true) with check (true);
create policy "auth — templates"  on public.templates  for all to authenticated using (true) with check (true);
create policy "auth — goals"      on public.goals      for all to authenticated using (true) with check (true);
create policy "auth — activities" on public.activities for all to authenticated using (true) with check (true);
create policy "auth — sync_state" on public.sync_state for all to authenticated using (true) with check (true);

-- Etapas com probabilidade (Qualificado como gate; Stand-by p/ reaquecer)
insert into public.stages (name, position, probability, color) values
  ('Novo lead',             1,   5, '#A1A1AA'),
  ('Qualificado',           2,  15, '#818CF8'),
  ('Diagnóstico agendado',  3,  25, '#DC2626'),
  ('Diagnóstico realizado', 4,  40, '#F87171'),
  ('Proposta enviada',      5,  60, '#F59E0B'),
  ('Negociação',            6,  80, '#3B82F6'),
  ('Ganho',                 7, 100, '#22C55E'),
  ('Perdido',               8,   0, '#71717A'),
  ('Stand-by',              9,  10, '#EAB308');

-- Seed de playbooks (a IA preenche as {{variaveis}})
insert into public.templates (name, category, body) values
  ('Diagnóstico — abertura', 'diagnostico', 'Roteiro p/ {{empresa}}: contexto, dores em dados, stack atual, orçamento, prazo, decisor.'),
  ('Objeção — "tá caro"',    'objecao',     'Reposicionar valor x custo de não resolver {{dor}}; ROI esperado; opção faseada.'),
  ('Follow-up pós-call',     'followup',    'Oi {{nome}}, ótimo papo sobre {{dor}}. Próximo passo: {{proximo_passo}}. Faz sentido {{data}}?'),
  ('Proposta — envio',       'proposta',    'Oi {{nome}}, segue a proposta para {{escopo}}. Validade até {{validade}}. Posso te ligar {{data}}?'),
  ('Reengajamento',          'reengajamento','Oi {{nome}}, voltando ao tema {{dor}}. Mudou algo no planejamento de {{trimestre}}?');
```

---

# Apêndice B — Specs de implementação

## B1. Sincronização Calendly — `POST /api/sync/calendly` (runtime, plano Free) ⭐

Pré-requisito: Calendly **Free** + personal access token. **Disparo:** botão _Atualizar_ (usuário autenticado) e/ou Vercel Cron com `CRON_SECRET`. Sem assinatura (chamada de saída).

**Passos:** (1) autorizar o disparo; (2) ler `sync_state['calendly:last_synced_at']` (1ª vez = `now()`); (3) `GET /scheduled_events` com `user`, `status=active`, `min_start_time`, `sort=start_time:asc`, **seguindo paginação**; (4) **filtrar pelo `event_type`/título do diagnóstico** (decide o que entra, não deduplica); (5) **dedup por `deals.calendly_event_uid`** (pula o que já existe); (6) `GET /scheduled_events/{uuid}/invitees` → e-mail/nome/`questions_and_answers`; (7) `find-or-create` empresa/contato (`origem='inbound'`); (8) criar deal em "Diagnóstico agendado" com `calendly_event_uid`, **`owner_id`** (regra simples de rodízio ou quem disparou) e **`next_action`** ("Confirmar presença + enviar lembrete", `next_action_date` = dia da call − 1); (9) atividade `note` com o formulário; (10) e-mail de aviso; (11) atualizar marca d'água. Trata cancelamentos (`status=canceled` → marca o deal). Handler fino → serviço **`createDealFromBooking`** (o mesmo do webhook opcional).

```ts
// adapter lib/integrations/calendly.ts — listar diagnósticos (com paginação)
async function listDiagnosticos(minStartTime: string) {
  const out: any[] = [];
  let url =
    `https://api.calendly.com/scheduled_events` +
    `?user=${encodeURIComponent(process.env.CALENDLY_USER_URI!)}` +
    `&status=active&min_start_time=${encodeURIComponent(minStartTime)}` +
    `&sort=start_time:asc&count=100`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CALENDLY_TOKEN!}` },
    });
    if (!res.ok) throw new Error(`Calendly ${res.status}`);
    const json = await res.json();
    for (const ev of json.collection) {
      if (ev.event_type === process.env.CALENDLY_EVENT_TYPE_URI) {
        // filtra pelo TIPO (título)
        out.push({
          uid: ev.uri.split("/").pop(),
          name: ev.name,
          start_time: ev.start_time,
          invitees_uri: `${ev.uri}/invitees`,
        });
      }
    }
    url = json.pagination?.next_page ?? "";
  }
  return out; // dedup por `uid` (calendly_event_uid) acontece no serviço
}
```

> **Nota didática:** `min_start_time` filtra por _quando a reunião acontece_, não por quando foi criada; a corretude vem do **dedup por UUID**. A própria Calendly recomenda guardar o instante da última consulta como `min_start_time` ao fazer polling.

## B1-alt. (Opcional, pago) Webhook Calendly — `POST /api/webhooks/calendly`

Mesmo destino, gatilho diferente: (1) verificar assinatura HMAC; (2) dedup por `calendly_event_uid`; (3) validar; (4) **chamar o mesmo `createDealFromBooking`**; (5) `200`, pesado async. Migração polling → webhook = só plugar outro gatilho.

## B2. Webhook tl;dv — `POST /api/webhooks/tldv` (runtime)

Pré-requisito: tl;dv Business. `MeetingReady` casa por e-mail com o deal (`meetingId → deal_id`). `TranscriptReady` recupera o `deal_id` pelo `meetingId`, grava atividade `transcript`, **marca `attendance='compareceu'`**, move o deal para "Diagnóstico realizado" e **dispara a análise** (async). Idempotente por `meetingId`. No-show: regra/Job que marca `no_show` quando a call passou e não veio transcript. LGPD: consentimento, retenção, acesso restrito.

## B3. Serviço de análise pós-call — `lib/services/analyzeTranscript` (IA em runtime)

Disparado por B2. Lê o transcript → chama a **API da Anthropic** (Messages, Sonnet 4.6) para: resumo, qualificação (fit/orçamento/prazo/dores), **próximo passo**. Grava atividade `analysis`, **escreve `deals.next_action` + `next_action_date`** (alimenta a tela "Hoje") e **cria rascunho de follow-up no Gmail** (a partir do template `followup`, citando as dores exatas). Captura falha sem travar o pipeline.

```ts
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  }),
});
```

## B4. Preenchimento de playbook — `lib/services/fillTemplate` (IA, sob demanda)

Recebe `templateId` + `dealId`. Carrega o `templates.body` e os dados do deal/contato (dores da análise, nome, empresa, próximo passo) → a IA substitui as `{{variaveis}}` e devolve o texto pronto. Usado no botão de WhatsApp/e-mail e no script de diagnóstico pré-call. Não envia nada — só gera o texto para revisão humana.

## B5. WhatsApp click-to-send — `lib/whatsapp.ts` (sem API, sem custo)

Monta `https://wa.me/<telefone_e164>?text=<texto_url_encoded>` a partir de `contacts.phone` + texto vindo do `fillTemplate`. Botão `WhatsAppButton` abre em nova aba. Zero dependência paga; maior ganho de usabilidade do projeto.

## B6. Forecast & metas — `lib/services/computeForecast` + dashboard

`computeForecast`: para deals com `status='open'`, soma `value × (stage.probability/100)` (ponderado) e `value` (bruto), por etapa, por owner e no total. Cruza com `goals` do mês (time e vendedor) → % de atingimento. Dashboard mostra: barra **forecast × meta**, pipeline por etapa, ganhos/perdidos no período, ticket médio, ciclo de venda (média de `won.updated_at − created_at`), MRR novo (Σ `mrr` de deals ganhos recorrentes no mês) e **ranking por vendedor**.

## B7. Subagente de briefing pré-call — `.claude/agents/briefing-pre-call.md` (DEV/manual)

Ferramenta de dev/uso manual, **não** roda em produção. Lê contato/empresa + template `diagnostico` → gera o script → grava atividade `analysis` (`metadata.kind='briefing'`). Protótipo da lógica antes de virar serviço, e útil para o gestor rodar sob demanda.
