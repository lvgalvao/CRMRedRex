# Contrato — Serviços internos (camada de aplicação)

`lib/services/` concentra **toda** a regra de negócio. UI, sync e webhooks só chamam estas funções. Assinaturas estáveis; implementação pode trocar de fornecedor sem mudar o contrato. Tipos em pseudo-TypeScript.

> Invariante de import: `app/`/`components/` → `lib/services/` → (`lib/supabase/`, `lib/integrations/`). Nunca o inverso.

---

## createDealFromBooking
Ponto único de entrada de agendamentos (polling **e** webhook opcional chamam este — Princípio III/D4).

```ts
type Booking = {
  calendlyEventUid: string;      // chave de idempotência (NUNCA o título)
  startTime: string;             // ISO; define next_action_date = startTime - 1 dia
  inviteeName: string;
  inviteeEmail: string;
  companyName?: string;
  answers?: Record<string, string>; // questions_and_answers do Calendly
  status: "active" | "canceled";
};

function createDealFromBooking(b: Booking, ownerId: string): Promise<{ dealId: string; created: boolean }>;
```
**Comportamento**: dedup por `calendly_event_uid` (se existe → atualiza/no-op, `created=false`); `find-or-create` empresa + contato (`origem='inbound'`); cria deal em "Diagnóstico agendado" com `owner_id`, `next_action="Confirmar presença + enviar lembrete"`, `next_action_date = startTime − 1d`; grava atividade `note` com `answers`. `status='canceled'` → marca o deal correspondente. **Garante**: FR-019..022, SC-004, SC-005.

## analyzeTranscript
Disparado async após o transcript do tl;dv (D7). Falha **não** trava o pipeline.

```ts
function analyzeTranscript(dealId: string, transcript: string, meta: { meetingId: string }): Promise<void>;
```
**Comportamento**: dedup por `meetingId`; chama Anthropic (Messages, `claude-sonnet-4-6`) → resumo/qualificação/próximo passo; grava atividade `analysis`; escreve `deals.next_action` + `next_action_date`; cria **rascunho** de follow-up no Gmail (template `followup`). Todo o bloco de IA em `try/catch`: erro estruturado, deal/timeline consistentes (FR-025, FR-026, SC-006, SC-008).

## fillTemplate
Preenche um playbook sob demanda (IA). Não envia nada.

```ts
function fillTemplate(templateId: string, dealId: string): Promise<{ text: string }>;
```
**Comportamento**: carrega `templates.body`, resolve `{{variaveis}}` (nome, empresa, dores da última `analysis`, próximo passo) via IA; devolve texto pronto para WhatsApp/e-mail/script. Garante FR-014.

## computeForecast
**Única** implementação do forecast (Princípio II/D9).

```ts
type Forecast = {
  total: { weighted: number; gross: number };
  byStage: { stageId: string; name: string; weighted: number; gross: number }[];
  byOwner: { ownerId: string; weighted: number; gross: number }[];
  vsGoal: { month: string; target: number; weighted: number; attainmentPct: number;
            perOwner: { ownerId: string; target: number; weighted: number; attainmentPct: number }[] };
};

function computeForecast(month: string /* YYYY-MM-01 */): Promise<Forecast>;
```
**Comportamento**: só `status='open'`; `weighted = Σ value × (stage.probability/100)`, `gross = Σ value`; cruza com `goals`. Terminais (won/lost/standby) ficam fora do ponderado. Garante FR-017, FR-018, SC-003.

## closeDeal
Fechamento com obrigatoriedade condicional (D12).

```ts
type Close =
  | { status: "won"; dealType: "pontual" }
  | { status: "won"; dealType: "recorrente"; mrr: number /* > 0 */ }
  | { status: "lost"; lostReason: "preço"|"timing"|"concorrente"|"sem_budget"|"sumiu"|"outro" }
  | { status: "standby"; reaquecerEm: string /* date */ };

function closeDeal(dealId: string, c: Close): Promise<void>;
```
**Comportamento**: valida (zod) por variante; `won/recorrente` exige `mrr > 0`; persiste status + move para etapa terminal. Garante FR-007, SC-009 e o edge "Ganho/recorrente sem MRR bloqueado".

## getToday
Motor diário (D11).

```ts
type TodayItem = { dealId: string; title: string; contactName: string;
                   nextAction: string; nextActionDate: string; overdue: boolean };
function getToday(ownerId: string, today: string): Promise<TodayItem[]>;
```
**Comportamento**: deals `status='open'`, `owner_id = ownerId`, `next_action_date <= today`; ordena atrasados-primeiro (`overdue = next_action_date < today`). Garante FR-009, FR-010, SC-001, SC-007.

## proposals (serviço)
```ts
function createProposalVersion(dealId: string, input: { value: number; validUntil?: string; docUrl?: string }): Promise<{ proposalId: string; version: number }>;
function updateProposalStatus(proposalId: string, status: "rascunho"|"enviada"|"vista"|"aceita"|"recusada"): Promise<void>;
```
**Comportamento**: nova versão incrementa `version` (preserva histórico, UNIQUE deal_id+version); mudança de status move o deal para a etapa correspondente; grava atividade `proposal`. Garante FR-011, FR-012.
