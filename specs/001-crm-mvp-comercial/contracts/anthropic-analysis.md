# Contrato — IA em runtime (API da Anthropic)

Integração: `lib/integrations/anthropic.ts` · Consumidores: `analyzeTranscript` (B3) e `fillTemplate` (B4). Endpoint: Messages API, modelo `claude-sonnet-4-6`.

## Chamada base
```ts
POST https://api.anthropic.com/v1/messages
headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }
body: { model: "claude-sonnet-4-6", max_tokens: <limitado>, messages: [{ role: "user", content: <prompt> }] }
```
- **Chave só no servidor** (`ANTHROPIC_API_KEY`); **limite de gasto** configurado (~$0,05–0,10/call).
- A integração expõe uma interface (`analyze`, `fill`) — trocar o modelo/fornecedor mexe só aqui (Princípio II).

## Uso 1 — análise pós-call (`analyzeTranscript`)
- **Entrada (mínima, LGPD)**: transcript + dados essenciais do deal/contato.
- **Saída esperada (estruturada)**: `{ resumo, qualificacao: { fit, orcamento, prazo, dores[] }, proximoPasso, nextActionDate }`.
- **Efeitos**: atividade `analysis`; escreve `next_action`/`next_action_date`; rascunho de follow-up no Gmail (template `followup`, citando `dores`).
- **Resiliência**: `try/catch` — falha registra erro estruturado (sem PII) e o pipeline segue (FR-026).

## Uso 2 — preenchimento de playbook (`fillTemplate`)
- **Entrada**: `templates.body` (com `{{variaveis}}`) + dados do deal/contato.
- **Saída**: texto pronto, sem envio (revisão humana — Princípio V).

## Privacidade
- Enviar só o necessário; não logar prompt/transcript completos; respeitar consentimento/retenção.

## Contrato de teste (unidade, IA mockada)
1. `analyzeTranscript` grava `analysis` + `next_action` + cria rascunho; nunca envia e-mail.
2. Erro da API → não lança para o pipeline; deal/timeline consistentes; erro logado sem PII.
3. `fillTemplate` substitui todas as `{{variaveis}}` conhecidas; devolve texto, não envia.
