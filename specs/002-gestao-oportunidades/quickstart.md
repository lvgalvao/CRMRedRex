# Quickstart — Cadastro e Gestão de Oportunidades (002)

Continuação do quickstart da 001 (ambiente já montado: app rodando, `.env` preenchido, migration `0001` aplicada). Aqui estão só os passos **desta feature**.

## Pré-requisitos

- Ambiente da 001 funcionando (`npm run dev` sobe e o login leva a `/visao-geral`)
- Migration `0001` aplicada — verificado em 2026-08-14: 10 tabelas, RLS ativo, `stages` com 9 linhas, `deals` com 0 linhas
- Nenhuma dependência npm nova

## 1. Aplicar a migration `0002`

```bash
supabase db push
# ou, via MCP do Supabase: apply_migration com o conteúdo de supabase/migrations/0002_opportunities.sql
```

Verificações imediatas:

```sql
-- 3 colunas novas em deals
select column_name from information_schema.columns
 where table_name = 'deals' and column_name in ('company_id','expected_close_date','probability');
-- deve retornar 3 linhas

-- tabela de histórico com RLS e SEM política de escrita
select relrowsecurity from pg_class where relname = 'deal_history';      -- t
select cmd from pg_policies where tablename = 'deal_history';            -- só SELECT

-- trigger instalado
select tgname from pg_trigger where tgrelid = 'public.deals'::regclass and not tgisinternal;
-- deve conter deals_log_change
```

## 2. Regenerar os tipos

```bash
# via MCP: generate_typescript_types  → atualizar lib/supabase/types.ts
```

`Deal` ganha `company_id`, `expected_close_date` e `probability`; surge o tipo `DealHistory`. `lib/supabase/types.ts` é mantido à mão no projeto — conferir se os tipos gerados batem antes de colar.

## 3. Rodar

```bash
npm run dev
npm run lint
npm run test     # + deals.schema.test.ts, dealStage.test.ts, computeForecast atualizado
```

## 4. Smoke test da feature

Cada item mapeia a um critério da spec.

1. **Criar** (US1): `/deals/novo` → preencher nome, cliente, contato, valor, etapa, previsão; salvar sem informar responsável → a oportunidade nasce com **você** como responsável, status Aberta, na coluna da etapa escolhida no `/pipeline`. _(FR-001, FR-004, FR-005)_
2. **Contato restrito ao cliente** (US1, cenário 3): trocar o cliente no formulário → a lista de contatos muda e não oferece contatos de outra empresa. _(FR-003)_
3. **Validação** (US1, cenário 2): salvar sem nome, sem cliente ou com valor negativo → erro por campo, em português, sem limpar o formulário. _(FR-002, FR-006)_
4. **Probabilidade herdada** (US1, cenário 5): ao escolher a etapa, o campo probabilidade mostra o valor da etapa; deixá-lo intocado → `probability` fica `null` no banco. Ajustar para 45 → o campo passa a exibir o marcador "ajustado". _(FR-008)_
5. **Forecast** (US1, cenário 6): `/visao-geral` → o valor da nova oportunidade entra no ponderado usando a probabilidade efetiva. Conferir à mão: `valor × probabilidade/100`. _(FR-008a, SC-008)_
6. **Ajuste preservado** (FR-008b): mover a oportunidade com probabilidade ajustada para outra etapa → o valor ajustado permanece; uma oportunidade sem ajuste passa a exibir a probabilidade da nova etapa.
7. **Histórico** (US2): mover por três etapas e fechar como Ganha → a tela de detalhe lista **quatro** transições (+ o registro de abertura), a mais recente no topo, com autor, data/hora e tempo de permanência. _(FR-015..FR-017, SC-002)_
8. **Sem ruído** (edge case): arrastar o card e soltar na mesma coluna → nenhuma linha nova no histórico. Editar só o valor → nenhuma linha nova. _(FR-019)_
9. **Imutabilidade** (FR-018): no SQL editor do Supabase, autenticado como usuário comum, tentar `update public.deal_history set to_status = 'won'` → 0 linhas afetadas; `insert` → recusado.
10. **Fechar e reabrir** (US2, cenários 3–5): marcar Perdida → o motivo é exigido, ela sai do forecast; arrastá-la de volta para "Negociação" → status volta a Aberta, o motivo é limpo, ela retorna ao forecast e a reabertura aparece no histórico. _(FR-012, FR-013, FR-014)_
11. **Editar** (US3): alterar valor, previsão e responsável → refletem no detalhe, no card do Kanban e nas visões por vendedor; propostas, notas e histórico continuam lá. _(FR-021, FR-025)_
12. **Listar e filtrar** (US3, cenário 4): `/deals` → filtrar por responsável, etapa e status; a soma exibida bate com a soma dos valores listados. _(FR-023)_
13. **Previsão vencida** (FR-007, D8): salvar previsão no passado com status Aberta → aceita, exibida em vermelho no detalhe e no card.
14. **Acesso** (FR-024): abrir `/deals` deslogado → redireciona para o login.

## 5. Verificação do trigger (SQL direto)

Roteiro completo dos 7 casos em [`contracts/db-triggers.md`](./contracts/db-triggers.md#verificação-executada-no-quickstart). O mínimo antes de dar a feature por pronta:

```sql
-- 1 registro de abertura por deal criado
select count(*) from deal_history h join deals d on d.id = h.deal_id
 where h.from_stage_id is null and h.to_status = 'open';

-- nenhum registro órfão de etapa E status ao mesmo tempo
select count(*) from deal_history
 where from_stage_id is null and to_stage_id is null
   and from_status is null and to_status is null;   -- deve ser 0
```

## 6. Rollback

A migration é aditiva. Para reverter em ambiente de desenvolvimento:

```sql
drop trigger if exists deals_log_change on public.deals;
drop function if exists public.log_deal_change();
drop table if exists public.deal_history;
alter table public.deals
  drop column if exists company_id,
  drop column if exists expected_close_date,
  drop column if exists probability,
  drop constraint if exists deals_value_nonneg;
```

Reverter o schema **não** basta: `computeForecast`, `deals.ts` e as telas precisam voltar junto, senão o `select` de `probability` quebra.
