# Contrato — Webhook tl;dv (transcrição pós-call)

Endpoint: `POST /api/webhooks/tldv` · Integração: `lib/integrations/tldv.ts` · Verificação: `lib/webhooks/verify.ts` · Serviço: `analyzeTranscript` (Apêndice B2/B3).

## Segurança (gatilho fino)

1. **Verificar assinatura/origem** (`TLDV_WEBHOOK_SECRET`, HMAC-SHA256, comparação tempo-constante) **antes** de tocar o banco. Falha → `401`.
2. **Validar payload** com zod.
3. **Deduplicar** por `meetingId`.
4. Delegar ao serviço e responder `200`; processamento pesado (IA) async.

## Eventos

### `MeetingReady`

- Casa a reunião com o deal por e-mail do participante → grava associação (`meetingId → deal_id`).
- Idempotente: reenvio não duplica associação.

### `TranscriptReady`

- Recupera `deal_id` por `meetingId`.
- Grava atividade `transcript` (`metadata.meetingId`).
- Marca `attendance='compareceu'`.
- Move o deal para "Diagnóstico realizado".
- **Dispara `analyzeTranscript` async** (IA) — falha não trava o pipeline (FR-026).

## Payload (validação zod — campos mínimos)

```ts
{ event: "MeetingReady" | "TranscriptReady",
  meetingId: string,
  participants?: { email: string }[],   // MeetingReady: casamento por e-mail
  transcript?: string }                 // TranscriptReady
```

## No-show (FR-027)

- Job/rotina: reunião cujo horário passou **sem** `TranscriptReady` → `attendance='no_show'`.

## Idempotência (FR-024)

- Dedup por `meetingId`: mesma reunião recebida 2× não duplica atividade nem análise.

## LGPD

- Não logar transcript nem e-mail em claro; enviar à IA só o necessário.

## Contrato de teste (tests/contract)

1. Assinatura inválida → `401`, banco intocado.
2. `TranscriptReady` → atividade `transcript` + `attendance='compareceu'` + etapa "Diagnóstico realizado" + análise disparada.
3. Mesmo `meetingId` 2× → sem duplicação.
4. Falha simulada da IA → deal/timeline consistentes, erro registrado.
5. Reunião sem transcript após o horário → `no_show`.
