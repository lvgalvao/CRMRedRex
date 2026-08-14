# Contrato — Serviços internos e server actions (feature 002)

`lib/services/` concentra **toda** a regra de negócio; páginas e componentes só chamam server actions, que só chamam serviços. Tipos em pseudo-TypeScript. Assinaturas existentes que **mudam** estão marcadas com `~`.

> Invariante de import: `app/`/`components/` → `lib/services/` → `lib/supabase/`. Nunca o inverso.

---

## Camada pura (sem banco, sem env — testável isolada)

### `lib/services/deals.schema.ts` — NOVO

```ts
const createDealSchema: ZodSchema<{
  title: string;                 // 1..120, trim
  company_id: string;            // uuid, obrigatório
  contact_id: string;            // uuid, obrigatório
  stage_id: string;              // uuid, obrigatório
  value?: number;                // >= 0, default 0
  probability?: number | null;   // 0..100 ou null (= herda a etapa)
  owner_id?: string | null;      // default: profile logado (resolvido no serviço)
  expected_close_date?: string | null;  // ISO date; passado permitido
  next_action?: string | null;
  next_action_date?: string | null;
}>;

const editDealSchema = createDealSchema.partial();  // status NÃO entra aqui — ver changeStatus

function parseCreateDeal(input: unknown): CreateDealInput;   // lança ZodError
function parseEditDeal(input: unknown): EditDealInput;
```
**Garante**: FR-002, FR-003 (a checagem contato∈cliente é feita no serviço, que tem acesso ao banco), FR-006, FR-007. Mensagens em português.

### `lib/services/dealStage.ts` — NOVO (puro)

```ts
type TerminalStatus = "won" | "lost" | "standby";

const TERMINAL_STAGE: Record<TerminalStatus, string>;   // won→"Ganho", lost→"Perdido", standby→"Stand-by"
const STAGE_TO_STATUS: Record<string, TerminalStatus>;  // inverso, por nome de etapa

function isTerminalStage(stageName: string): boolean;
function statusForStage(stageName: string): "open" | TerminalStatus;
function effectiveProbability(
  deal: { probability: number | null },
  stage: { probability: number },
): number;                                              // deal.probability ?? stage.probability
```
**Garante**: FR-008a, FR-010a, FR-014. Substitui o `TERMINAL_STAGE` hoje declarado em `closeDeal.schema.ts`, que passa a reexportá-lo para não quebrar imports.

---

## Serviços (regra de negócio)

### `~ createDeal` — `lib/services/deals.ts`

```ts
function createDeal(input: unknown): Promise<Deal>;
```
**Comportamento**: valida com `parseCreateDeal`; resolve `owner_id` (default = `getCurrentProfile()`); se `company_id` ausente, herda do contato; **verifica que o contato pertence ao cliente** e recusa caso contrário; força `status='open'`; grava. O `AFTER INSERT` do trigger registra a abertura no histórico.
**Garante**: FR-001..FR-005, FR-007.
**Diferença do atual**: hoje `CreateDealInput` é um tipo TS sem validação e sem `company_id`/`expected_close_date`/`probability`.

### `~ editDeal` — `lib/services/deals.ts`

```ts
function editDeal(dealId: string, patch: unknown): Promise<Deal>;
```
**Comportamento**: valida com `parseEditDeal`; se `contact_id` ou `company_id` mudarem, revalida a coerência entre eles; **não** altera `stage_id` nem `status` (caminhos próprios abaixo); preserva atividades, propostas e histórico (FR-025).
**Garante**: FR-021, FR-025.

### `~ moveDeal` — `lib/services/deals.ts`

```ts
function moveDeal(dealId: string, stageId: string, position: number): Promise<Deal>;
```
**Comportamento**: no-op se a etapa é a mesma (nenhum histórico gerado). Se a etapa de destino é terminal, aplica o status correspondente via `statusForStage`; se o destino é ativo e o deal estava fechado, **reabre** (`status='open'`, limpa `lost_reason` e `reaquecer_em`). Etapa e status vão no **mesmo** UPDATE — o trigger registra um único evento de histórico, atomicamente.
**Garante**: FR-011, FR-014, FR-020.
**Ressalva**: mover para "Ganho", "Perdido" ou "Stand-by" pelo arraste **não** coleta motivo/MRR/data de reaquecimento. A UI direciona esses casos ao `CloseDealDialog` já existente; o serviço aceita a transição, mantendo `lost_reason` nulo até o preenchimento.

### `changeStatus` — `lib/services/closeDeal.ts` (existente, reusado)

```ts
function closeDeal(dealId: string, input: unknown): Promise<void>;   // won | lost | standby
```
**Sem mudança de assinatura.** Passa a importar `TERMINAL_STAGE` de `dealStage.ts`. O registro em `activities` que ele já faz continua; o histórico estruturado agora vem do trigger, em paralelo.
**Garante**: FR-012.

### `~ computeForecast` — `lib/services/computeForecast.ts`

```ts
function computeForecastFromData(deals, stages, goals, month): Forecast;   // assinatura inalterada
```
**Mudança interna**: `const prob = effectiveProbability(d, stage) / 100` no lugar de `stage.probability / 100`; o tipo de `deals` ganha `probability`; o `select` de `computeForecast` passa a incluir a coluna.
**Garante**: FR-008a, FR-013. **Continua sendo o único ponto de cálculo do forecast.**

---

## Repositórios

### `~ lib/supabase/deals.ts`

```ts
type DealWithRelations = Deal & {
  contact: Contact | null;
  company: Company | null;
  stage: Stage | null;
  owner: Profile | null;
};

function listDealsFiltered(
  db, filters: { ownerId?: string; stageId?: string; status?: DealStatus },
): Promise<DealWithRelations[]>;    // NOVO — uma consulta com joins
```
`listDeals`, `getDeal`, `insertDeal`, `updateDeal` e `findDealByCalendlyUid` permanecem; `getDeal` passa a trazer também `company` e `stage`.

### `lib/supabase/dealHistory.ts` — NOVO (somente leitura)

```ts
type DealHistoryEntry = {
  id: string;
  created_at: string;
  changed_by: string | null;
  author_name: string | null;      // null → exibir "Sistema"
  from_stage: { id: string; name: string } | null;
  to_stage: { id: string; name: string } | null;
  from_status: DealStatus | null;
  to_status: DealStatus | null;
  dwell_seconds: number | null;
};

function listHistoryByDeal(db, dealId: string): Promise<DealHistoryEntry[]>;  // created_at desc
```
Sem `insert`, `update` ou `delete` — a RLS os recusaria de qualquer forma (FR-018).

---

## Server actions

| Action | Arquivo | Chama | Revalida |
|---|---|---|---|
| `createDealAction(formData)` | `app/(crm)/deals/actions.ts` | `createDeal` | `/deals`, `/pipeline`; redireciona para `/deals/{id}` |
| `editDealAction(dealId, formData)` | `app/(crm)/deals/[id]/actions.ts` | `editDeal` | `/deals/{id}`, `/deals`, `/pipeline`, `/hoje` |
| `changeStageAction(dealId, formData)` | `app/(crm)/deals/[id]/actions.ts` | `moveDeal` | idem |
| `moveDealAction(dealId, stageId, position)` | `app/(crm)/pipeline/actions.ts` | `moveDeal` | `/pipeline` (já existe, comportamento ampliado) |
| `closeDealAction(dealId, formData)` | `app/(crm)/deals/[id]/actions.ts` | `closeDeal` | idem (já existe) |

**Padrão obrigatório** (igual ao das actions atuais): `"use server"`, extrair do `FormData`, delegar ao serviço, `revalidatePath`. Nenhuma regra de negócio dentro da action. Erros de validação retornam estado de erro para o formulário — sem `throw` que derrube a página (US1, cenário 2).
