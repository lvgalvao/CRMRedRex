# Phase 0 — Research & Decisões

Feature: Cadastro e Gestão de Oportunidades (`002-gestao-oportunidades`)

Nenhum `NEEDS CLARIFICATION` restou da spec (as três decisões de produto foram fechadas em 2026-08-14). Este documento registra as **decisões técnicas** que a implementação assume, com a alternativa descartada e o porquê.

---

## D1 — Estender `deals` em vez de criar `opportunities`

**Decisão**: a Oportunidade é a tabela `deals` já existente. A feature adiciona colunas; não cria entidade nova.

**Rationale**: `deals` já é lida por `computeForecast`, pelo Kanban (`listDeals`), pela tela "Hoje" (`lib/services/today.ts`), por `closeDeal` e por `createDealFromBooking`. Uma tabela `opportunities` paralela obrigaria a duplicar ou sincronizar todos esses caminhos e quebraria o invariante "forecast num único lugar". O enunciado pede a entidade Oportunidade — ela existe, só está incompleta.

**Alternativas consideradas**: (a) tabela `opportunities` nova com migração de `deals` — custo alto, zero ganho, quebra o Calendly; (b) view sobre `deals` — não resolve os campos faltantes, apenas renomeia.

**Consequência de nomenclatura**: no banco e no código a entidade continua `deal`/`deals`; na interface o rótulo é **Oportunidade**. Divergência deliberada e documentada, para não reescrever o schema em uso.

---

## D2 — `probability` nulo significa "herda a etapa"

**Decisão**: `deals.probability int null`. `null` = a oportunidade usa a probabilidade da etapa; valor preenchido = ajuste manual do vendedor, que passa a prevalecer.

**Rationale**: resolve FR-008, FR-008a e FR-008b com uma única coluna e sem flag auxiliar. FR-008b ("mudar de etapa não sobrescreve ajuste manual") sai de graça: mudar de etapa nunca escreve em `probability`, então quem estava `null` continua herdando o novo valor e quem tinha ajuste o mantém. A interface exibe o valor efetivo e um marcador "ajustado" quando não é nulo.

**Alternativas consideradas**: (a) `probability` NOT NULL com cópia da etapa na criação — perde a distinção entre herdado e ajustado, e a mudança de etapa passaria a exigir uma regra de "sobrescrever ou não" com risco de apagar o ajuste; (b) coluna extra `probability_is_manual` — redundante com `null`.

**Impacto no forecast**: `computeForecastFromData` passa a usar `deal.probability ?? stage.probability`. Uma linha, dentro do único ponto de cálculo. O `select` de `computeForecast` ganha a coluna `probability`.

---

## D3 — Histórico gravado por trigger, na mesma transação

**Decisão**: trigger `AFTER INSERT OR UPDATE` em `public.deals` que grava em `public.deal_history` quando `stage_id` ou `status` mudam.

**Rationale**: duas exigências da spec só se satisfazem assim. FR-020 pede atomicidade — o cliente Supabase JS não abre transação multi-statement, então "update depois insert" no serviço pode deixar a etapa alterada sem histórico. SC-002 pede 100% das mudanças registradas — hoje `stage_id`/`status` são alterados em quatro lugares (`moveDeal`, `closeDeal`, `createDealFromBooking` e `updateDeal` genérico), e qualquer caminho futuro que escreva direto na tabela ficaria de fora de uma solução em serviço.

**Alternativas consideradas**: (a) update + insert sequenciais no serviço — viola FR-020; (b) função RPC `move_deal_stage()` chamada pelos serviços — resolve a atomicidade, mas exige alterar todos os call sites e não impede que um `updateDeal` genérico burle o histórico; (c) `activities` com novo `type` — ver D4.

**Concessão registrada**: fere parcialmente o Princípio II (regra de negócio nos serviços). Mitigação: o trigger é *mecânica de persistência*, não decisão — não valida transição, não escolhe etapa, não bloqueia nada. Toda decisão (pode reabrir? exige motivo? qual etapa terminal?) permanece em `lib/services/`. Está documentado em Complexity Tracking no `plan.md`.

**Autor da mudança**: `changed_by = auth.uid()` resolvido dentro do trigger, com verificação de existência em `profiles`. Chamadas com `service role` (Cron do Calendly, webhook do tl;dv) têm `auth.uid()` nulo e o registro fica com autor `null`, exibido como **Sistema** na interface.

---

## D4 — `deal_history` como tabela dedicada, não `activities`

**Decisão**: tabela própria, com `from_stage_id`, `to_stage_id`, `from_status`, `to_status`, `dwell_seconds`, `changed_by`, `created_at`.

**Rationale**: o histórico precisa ser consultável por coluna (tempo médio por etapa é a pergunta comercial que ele existe para responder) e **imutável** (FR-018). `activities` tem `check` de `type` voltado à timeline humana (`note`, `call_note`, `transcript`…), é editável pelo usuário sob a política RLS atual, e guardaria os campos estruturados em `metadata` jsonb — sem índice útil e sem garantia de forma.

**Alternativas consideradas**: reusar `activities` ampliando o `check` para `stage_change`/`status_change` — mais barato de escrever, mas perde imutabilidade e consultabilidade; a auditoria deixaria de ser confiável.

**Imutabilidade na prática**: RLS ativo com **apenas** política de `select` para `authenticated`. Sem política de `insert`, `update` ou `delete`, nenhum usuário escreve na tabela; a escrita acontece exclusivamente pelo trigger `security definer`.

---

## D5 — `dwell_seconds` persistido, não calculado na leitura

**Decisão**: o trigger calcula e grava o tempo de permanência desde o registro anterior do mesmo deal (ou desde `deals.created_at`, no primeiro).

**Rationale**: torna o histórico auto-contido e a leitura trivial (FR-016, SC-004 — responder "há quanto tempo está parada" em até 3 cliques). Calcular na leitura exigiria window function em toda consulta e produziria números diferentes se um registro fosse inserido fora de ordem.

**Alternativa considerada**: calcular por `lag(created_at)` na query — mais "puro", porém repetido em toda tela e mais caro; ganho nenhum num histórico que é imutável por construção.

---

## D6 — Contatos filtrados por cliente no cliente (browser), sem rota nova

**Decisão**: a página do formulário carrega empresas e contatos no Server Component e passa ambos ao `DealForm` (Client Component), que filtra os contatos do cliente selecionado em memória.

**Rationale**: single-org com poucas centenas de contatos; uma rota `/api` ou server action de busca adicionaria latência e superfície sem benefício. Atende FR-003 e o cenário 3 da US1.

**Gatilho de revisão**: se a base passar de ~2.000 contatos, trocar por busca assíncrona com `debounce`. Registrado para não virar dívida silenciosa.

---

## D7 — Reabertura como regra de serviço, não do banco

**Decisão**: mover uma oportunidade fechada para uma etapa ativa devolve `status='open'` e limpa `lost_reason` e `reaquecer_em`; a regra vive em `lib/services/deals.ts`, apoiada no mapeamento puro de `lib/services/dealStage.ts`.

**Rationale**: FR-014 é decisão de negócio, e decisão é dos serviços. O trigger apenas registrará as duas mudanças (etapa e status) resultantes, em um único registro de histórico por transação.

**Alternativa considerada**: derivar o status da etapa por trigger — colocaria regra de negócio no banco e tornaria impossível ter, por exemplo, uma oportunidade em "Negociação" marcada como Stand-by.

---

## D8 — Previsão vencida é sinal visual, não bloqueio

**Decisão**: `expected_close_date` aceita data no passado; a interface marca em vermelho (`#DC2626`, reservado a atraso/erro pela identidade visual) quando a data passou e o status ainda é `open`.

**Rationale**: FR-007 e Princípio I — o gestor precisa **ver** a previsão estourada; impedir o registro só empurraria o vendedor a inventar uma data futura, corrompendo o forecast.

---

## D9 — Sem exclusão de oportunidades

**Decisão**: nenhuma operação de delete nesta feature. O encerramento se dá por status (Perdida/Stand-by).

**Rationale**: está nas Assumptions da spec e protege o histórico. `on delete cascade` em `deal_history` existe apenas para consistência referencial, não como fluxo de produto.
