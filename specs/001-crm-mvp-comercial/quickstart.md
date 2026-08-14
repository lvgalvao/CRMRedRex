# Quickstart — CRM Comercial da RedRex (MVP)

Como subir o projeto localmente e validar o caminho-feliz. Pré-scaffold: o app ainda não existe; os passos 1–2 são parte da implementação (`/speckit-implement`).

## Pré-requisitos

- Node 20+, npm
- Projeto Supabase (já provisionado: ref `myktueaijfxrvhwakyrc`)
- Chaves de integração (preencher conforme ativa): Calendly (Free + token), tl;dv (Business), Anthropic (billing), Gmail

## 1. Scaffold (uma vez)

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint
npx shadcn@latest init
npm i @supabase/supabase-js @supabase/ssr zod @anthropic-ai/sdk @dnd-kit/core @dnd-kit/sortable
npm i -D vitest @testing-library/react
```

## 2. Banco — aplicar schema (Apêndice A)

O banco está **vazio**. Aplicar a migration inicial (10 tabelas + índices + RLS + políticas `authenticated` + seed de `stages` e `templates`):

```bash
# via Supabase CLI
supabase db push
# ou via MCP: apply_migration com o conteúdo do Apêndice A
```

Verificar: `list_tables` deve mostrar as 10 tabelas; `stages` com 9 linhas, `templates` com 5.

## 3. Variáveis de ambiente

`.env` (raiz, **nunca commitado** — já no `.gitignore`). Validadas por `lib/env.ts` (falha cedo).

| Variável                                      | Escopo       | Notas                        |
| --------------------------------------------- | ------------ | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                    | público      | URL do projeto               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable | público      | client                       |
| `SUPABASE_SERVICE_ROLE_KEY`                   | **servidor** | só `lib/supabase/admin.ts`   |
| `CALENDLY_TOKEN`                              | **servidor** | personal access token        |
| `CALENDLY_USER_URI`                           | servidor     | `user` do scheduled_events   |
| `CALENDLY_EVENT_TYPE_URI`                     | servidor     | filtro do diagnóstico        |
| `ANTHROPIC_API_KEY`                           | **servidor** | limite de gasto              |
| `TLDV_WEBHOOK_SECRET`                         | **servidor** | verificação HMAC             |
| `CRON_SECRET`                                 | **servidor** | protege `/api/sync/calendly` |
| (Gmail)                                       | **servidor** | rascunho de follow-up        |

> Nenhuma chave sensível em `NEXT_PUBLIC_*`.

## 4. Rodar

```bash
npm run dev      # http://localhost:3000  → redireciona p/ login; pós-login cai em "Hoje"
npm run lint
npm run test     # vitest: serviços (forecast, fillTemplate, closeDeal) + contrato (calendly, tldv)
```

## 5. Smoke test do MVP (critérios de aceite — PRD seção 18)

1. **Login** → tela "Hoje" é a entrada.
2. **Pipeline**: criar empresa+contato+deal; arrastar entre etapas (persiste ao recarregar).
3. **Hoje**: deal com `next_action_date` vencida aparece em vermelho; só do dono logado.
4. **Proposta**: criar v1, nova versão, mudar status → deal move de etapa.
5. **Forecast**: dashboard mostra forecast ponderado × meta e % de atingimento.
6. **WhatsApp**: botão abre `wa.me` com texto do playbook preenchido; sem telefone → mensagem clara.
7. **Calendly**: _Atualizar_ cria contato+deal (com dono e próxima ação); 2º clique não duplica.
8. **tl;dv**: transcript cai no deal, marca `compareceu`, move p/ "Diagnóstico realizado", dispara análise (grava próxima ação + rascunho).
9. **Fechamento**: "Ganho" exige tipo (+MRR se recorrente); "Perdido" exige motivo; "Stand-by" exige data de reaquecer.
10. **Segurança**: RLS ativo; assinaturas verificadas; token Calendly só no servidor; nenhuma chave no client.

## Mapa história → arquivos (orientação para `/speckit-tasks`)

| História               | Telas                         | Serviços                       | Integrações            |
| ---------------------- | ----------------------------- | ------------------------------ | ---------------------- |
| US1 Pipeline           | `pipeline/`, `deals/[id]`     | `closeDeal`, repos             | —                      |
| US2 Hoje               | `hoje/`                       | `getToday`                     | —                      |
| US3 Propostas          | `deals/[id]`                  | `proposals`                    | —                      |
| US4 Forecast           | `dashboard/`                  | `computeForecast`              | —                      |
| US5 Playbooks/WhatsApp | `playbooks/`, `contacts/[id]` | `fillTemplate`, `lib/whatsapp` | anthropic              |
| US6 Calendly           | `pipeline/` (SyncButton)      | `createDealFromBooking`        | calendly               |
| US7 Pós-call           | `deals/[id]` (timeline)       | `analyzeTranscript`            | tldv, anthropic, gmail |
