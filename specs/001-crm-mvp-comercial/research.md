# Phase 0 — Research & Decisões

Feature: CRM Comercial da RedRex — MVP (`001-crm-mvp-comercial`)
Data: 2026-05-29

A stack-alvo já está fixada pelo PRD (Parte 2) e pela Constituição (seção "Restrições de Stack"), então não há `NEEDS CLARIFICATION` aberto. Este documento registra as decisões de implementação — o *como* dentro da stack imposta — e as alternativas descartadas.

---

## D1. Cliente Supabase em Next.js (App Router)

- **Decisão**: usar `@supabase/ssr` com três clients distintos: `lib/supabase/server.ts` (Server Components/route handlers, lê cookies), `lib/supabase/client.ts` (Client Components) e `lib/supabase/admin.ts` (service role, **só** em route handlers/sync — nunca importado por código client). Sessão por cookies; middleware renova o token.
- **Rationale**: `@supabase/ssr` é o padrão atual para App Router; separar o admin client isola o `service role key` no servidor (Princípio IV). RLS continua valendo para os clients de sessão; o admin client é o único que a contorna, usado só na sync/webhooks.
- **Alternativas descartadas**: `auth-helpers-nextjs` (deprecado); um único client compartilhado (arriscaria vazar service role para o bundle client).

## D2. Validação de env tipada (`lib/env.ts`)

- **Decisão**: `zod` valida `process.env` no import, separando explicitamente públicas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`/publishable) de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `CALENDLY_TOKEN`, `CALENDLY_USER_URI`, `CALENDLY_EVENT_TYPE_URI`, `ANTHROPIC_API_KEY`, `TLDV_WEBHOOK_SECRET`, `CRON_SECRET`, chaves Gmail). Falha cedo (throw no boot) se faltar variável de servidor em runtime de servidor.
- **Rationale**: exigência da Constituição (config centralizada e tipada, falha cedo); evita `undefined!` espalhado e protege contra commitar/expor segredo no client.
- **Alternativas descartadas**: ler `process.env` direto nos módulos (sem validação, falha tarde e silenciosa).

## D3. Idempotência da sincronização Calendly

- **Decisão**: dedup pela coluna única `deals.calendly_event_uid` (UUID extraído de `ev.uri`). `event_type`/título só **filtra** quais eventos entram. `sync_state['calendly:last_synced_at']` é otimização de janela (`min_start_time`), não fonte de corretude. Paginação completa via `pagination.next_page`. Cancelamento (`status=canceled`) marca o deal correspondente.
- **Rationale**: Princípio III + Apêndice B1 do PRD. Re-entrega/atraso/reprocesso não duplicam porque a chave é o UUID, não a ordem nem o título.
- **Alternativas descartadas**: dedup por título/e-mail (quebra com renomeações e múltiplos deals do mesmo contato); confiar só na marca d'água (perde eventos se o relógio/última-sincronização escorregar).

## D4. Push × Pull com destino único

- **Decisão**: `POST /api/sync/calendly` (polling, plano Free) e `POST /api/webhooks/calendly` (webhook pago, opcional) ambos terminam em `createDealFromBooking(booking)`. O webhook adiciona apenas verificação HMAC antes; a regra de negócio é idêntica.
- **Rationale**: Princípio III ("muda só o gatilho"); migrar Free→pago é plugar outro gatilho, sem reescrever a regra.
- **Alternativas descartadas**: lógicas separadas por gatilho (duplicaria regra e divergiria com o tempo).

## D5. Disparo do polling (Cron + manual) e proteção da rota

- **Decisão**: Vercel Cron (intervalo 5–15 min, via `vercel.json`) chama a rota com header `Authorization: Bearer ${CRON_SECRET}`; o botão *Atualizar* chama a mesma rota com a sessão Supabase do usuário. A rota aceita **um dos dois**: sessão autenticada **ou** `CRON_SECRET` válido. Processamento do lote é async (responde 2xx rápido).
- **Rationale**: Parte 3 do PRD; cobre disparo automático e manual com uma rota só.
- **Alternativas descartadas**: rota pública (inseguro); cron próprio fora da Vercel (infra extra desnecessária no MVP).

## D6. Verificação de assinatura dos webhooks

- **Decisão**: `lib/webhooks/verify.ts` faz HMAC-SHA256 com comparação em tempo constante (`crypto.timingSafeEqual`). tl;dv valida segredo/origem (`TLDV_WEBHOOK_SECRET`); webhook opcional do Calendly valida `Calendly-Webhook-Signature`. Falha → `401` antes de tocar o banco.
- **Rationale**: Princípio IV + Parte 3; defesa contra payload forjado.
- **Alternativas descartadas**: comparação de string normal (vulnerável a timing attack); processar antes de verificar (superfície de ataque).

## D7. Análise pós-call por IA (não trava o pipeline)

- **Decisão**: `analyzeTranscript` é disparado async pelo handler do tl;dv (após gravar transcript, marcar `attendance='compareceu'` e mover para "Diagnóstico realizado"). Chama a API da Anthropic (Messages, `claude-sonnet-4-6`, `max_tokens` limitado) para resumo/qualificação/próximo passo; grava atividade `analysis`, escreve `next_action`/`next_action_date` e cria **rascunho** no Gmail. Toda a chamada de IA fica em `try/catch`: falha registra erro estruturado e o deal/timeline permanecem consistentes.
- **Rationale**: Princípios V e III; Apêndice B2/B3. O valor do pipeline (transcript na timeline, presença, etapa) não depende do sucesso da IA.
- **Alternativas descartadas**: análise síncrona no handler (estoura o tempo de resposta e acopla pipeline ao sucesso da IA); envio automático de e-mail (proibido no MVP).

## D8. Privacidade no envio à IA (LGPD)

- **Decisão**: o prompt enviado à Anthropic carrega só o necessário (transcript + dados mínimos do deal/contato para qualificação). Logs estruturados sem PII (sem transcript, sem e-mail/telefone em claro). Retenção e consentimento de gravação respeitados.
- **Rationale**: Princípio IV; transcripts e propostas são dados sensíveis.
- **Alternativas descartadas**: logar payloads completos para debug (vaza PII).

## D9. Forecast em ponto único

- **Decisão**: `lib/services/computeForecast.ts` é a **única** implementação: para `status='open'`, soma `value × (stage.probability/100)` (ponderado) e `value` (bruto), agregando por total, etapa e owner; cruza com `goals` do mês para % de atingimento. Deals terminais (`won`/`lost`/`standby`) ficam fora do forecast ponderado. Dashboard e qualquer outro consumidor chamam este serviço — a regra nunca é reescrita em componente ou query ad hoc.
- **Rationale**: Princípio II ("forecast num só lugar"); Apêndice B6. Evita divergência de cálculo entre telas.
- **Alternativas descartadas**: cálculo inline no componente do dashboard; view SQL com a fórmula (espalharia a regra para fora da camada de serviço).

## D10. Drag-and-drop do Kanban

- **Decisão**: `@dnd-kit/core` + `@dnd-kit/sortable` em Client Component (`KanbanBoard`); persiste `stage_id` + `position` via serviço ao soltar. Reordenação otimista na UI com reconciliação após resposta.
- **Rationale**: `@dnd-kit` é acessível e mantido, sem dependências pesadas; o restante das páginas continua Server Component (Convenção: client só com interatividade).
- **Alternativas descartadas**: `react-beautiful-dnd` (manutenção descontinuada); HTML5 DnD puro (acessibilidade e toque ruins).

## D11. Tela "Hoje" — filtro por dono e urgência

- **Decisão**: `lib/services/today.ts` retorna deals `status='open'` do `owner_id = usuário logado` com `next_action_date <= hoje`, ordenados atrasados-primeiro. "Hoje" é a rota de entrada do grupo `(crm)`. Atrasados destacados em vermelho (sinal comercial).
- **Rationale**: US2/FR-009/FR-010; SC-001/SC-007. Filtro por dono é de **visão**, não de permissão (RLS single-org continua liberando leitura — Assumption do spec).
- **Alternativas descartadas**: filtrar por dono na RLS (contraria o single-org do MVP e o refinamento previsto só na Fase 3).

## D12. Fechamento de deal com campos obrigatórios condicionais

- **Decisão**: `lib/services/closeDeal.ts` valida (zod) por status terminal: `won` exige `deal_type` (+ `mrr > 0` se `recorrente`); `lost` exige `lost_reason` no enum padronizado; `standby` exige `reaquecer_em`. UI: `CloseDealDialog` com campos condicionais.
- **Rationale**: FR-007, SC-009, edge case "Ganho/recorrente sem MRR bloqueado".
- **Alternativas descartadas**: validar só no client (burlável); CHECK constraints sozinhas (não cobrem a obrigatoriedade condicional de MRR de forma amigável).

## D13. Migration e seed do schema

- **Decisão**: banco está **vazio**. Primeira migration em `supabase/migrations/` aplica o Apêndice A literal: 10 tabelas, índices, RLS habilitado + políticas `authenticated`, seed de `stages` (9 etapas com probabilidade) e `templates` (5 playbooks). Aplicada via MCP `apply_migration` / Supabase CLI. Mudança de schema = parar, mostrar diff, perguntar (Princípio V).
- **Rationale**: Apêndice A é a fonte de verdade do modelo; aplicar como migration versionada atende "migrations versionadas".
- **Alternativas descartadas**: criar tabelas via UI do Supabase (não versionado); divergir do schema do PRD (proibido sem aprovação humana).
