# Contrato — Sincronização Calendly (polling, plano Free)

Endpoint: `POST /api/sync/calendly` · Integração: `lib/integrations/calendly.ts` · Serviço: `createDealFromBooking` (Apêndice B1).

## Gatilho e autorização
- **Disparo**: botão *Atualizar* (sessão Supabase) **ou** Vercel Cron (header `Authorization: Bearer ${CRON_SECRET}`), intervalo 5–15 min.
- **Autorização**: aceita sessão autenticada **ou** `CRON_SECRET` válido; caso contrário `401`. Sem assinatura HMAC (é chamada de saída).
- **Resposta**: 2xx rápido; lote pesado processado async.

## Chamadas de saída (Calendly API v2)
- `GET https://api.calendly.com/scheduled_events?user={CALENDLY_USER_URI}&status=active&min_start_time={watermark}&sort=start_time:asc&count=100`
  - Header `Authorization: Bearer ${CALENDLY_TOKEN}` (**token só no servidor**).
  - **Paginação completa** via `pagination.next_page` até esgotar.
  - Filtro por `ev.event_type === CALENDLY_EVENT_TYPE_URI` — decide **o que entra**, não deduplica.
- `GET {event.uri}/invitees` → `email`, `name`, `questions_and_answers`.

## Mapeamento → Booking
```
uid          = ev.uri.split("/").pop()        // → calendly_event_uid (dedup)
startTime    = ev.start_time
inviteeEmail = invitee.email
inviteeName  = invitee.name
answers      = invitee.questions_and_answers
status       = ev.status ("active" | "canceled")
```

## Idempotência (FR-021, SC-004)
- Dedup por `deals.calendly_event_uid` no serviço — re-disparo não duplica.
- `sync_state['calendly:last_synced_at']` é otimização de janela (`min_start_time`), não fonte de corretude. 1ª execução = `now()`.
- Falha no meio do lote **não** pode duplicar nem perder a marca d'água (atualizar watermark só após processar com sucesso).

## Cancelamento (FR-022)
- `ev.status='canceled'` → serviço marca o deal correspondente (não cria novo).

## Erros
- Calendly `!ok` → `throw` (lote falha, watermark não avança); logar status sem PII.
- Contato sem e-mail no invitee → pular item e registrar (não quebra o lote).

## Contrato de teste (tests/contract)
1. Paginação: 2 páginas de eventos → todos os diagnósticos processados, nenhum perdido.
2. Dedup: mesmo `uid` em dois disparos → 1 deal (`created=false` no segundo).
3. Filtro: evento de `event_type` diferente é ignorado.
4. Cancelado: `status=canceled` marca o deal, não cria.
5. Novo deal nasce com `owner_id`, `next_action`, `next_action_date = start − 1d`.
