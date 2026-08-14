# Feature Specification: CRM Comercial da RedRex — MVP

**Feature Branch**: `001-crm-mvp-comercial`
**Created**: 2026-05-29
**Status**: Draft
**Input**: User description: "MVP comercial completo — escopo da seção 5 do PRD (`.llm/prd.md`): pipeline com dono e próxima ação, tela Hoje, propostas, playbooks preenchidos por IA, metas + dashboard de forecast, WhatsApp click-to-send, sincronização Calendly via polling, tl;dv + análise pós-call por IA."

## User Scenarios & Testing _(mandatory)_

O CRM existe para **aumentar as vendas da RedRex**. Cada história abaixo é uma fatia
independente que responde a uma das três perguntas do produto: _o que eu faço hoje?_
(vendedor), _quanto vamos fechar este mês?_ (gestor), _o que funciona pra vender?_
(método). As histórias estão ordenadas por prioridade; uma fatia de prioridade mais alta
entrega valor mesmo sem as seguintes.

### User Story 1 - Trabalhar o pipeline comercial (Priority: P1)

O vendedor faz login e vê o funil de vendas como um quadro (Kanban) com etapas. Cada
oportunidade (deal) mostra o cliente, o valor, o dono e a próxima ação. O vendedor cria
deals, edita seus dados, e os arrasta entre etapas conforme a venda avança. Empresas e
contatos são cadastrados e ligados aos deals; cada deal acumula uma linha do tempo de
atividades (notas, ligações, e-mails).

**Why this priority**: é o registro central de toda venda. Sem o pipeline com dono e
valor, nenhuma das outras histórias (forecast, Hoje, propostas) tem dados para operar. É
o menor CRM utilizável que já entrega valor: visão de funil e responsabilidade por deal.

**Independent Test**: criar empresa, contato e deal; mover o deal entre etapas; atribuir
um dono; registrar uma nota na timeline — tudo persistido e visível após recarregar, com
acesso restrito a membros autenticados.

**Acceptance Scenarios**:

1. **Given** um vendedor autenticado, **When** ele cria um deal vinculado a um contato e o posiciona em uma etapa, **Then** o deal aparece na coluna daquela etapa exibindo cliente, valor, dono e próxima ação.
2. **Given** um deal em "Diagnóstico agendado", **When** o vendedor o arrasta para "Proposta enviada", **Then** a nova etapa e a posição são persistidas e refletidas ao recarregar.
3. **Given** um deal aberto, **When** o vendedor registra uma nota, **Then** a nota entra na timeline daquele deal/contato com data e hora.
4. **Given** um usuário não autenticado, **When** ele tenta acessar qualquer tela do CRM, **Then** o acesso é negado e ele é levado ao login.
5. **Given** o fechamento de um deal, **When** o vendedor marca "Ganho", **Then** o sistema exige o tipo (pontual ou recorrente, com MRR se recorrente); ao marcar "Perdido" exige motivo padronizado; ao marcar "Stand-by" exige data para reaquecer.

---

### User Story 2 - Saber o que fazer hoje (Priority: P1)

Ao logar, o vendedor abre a tela "Hoje" e vê, em uma lista priorizada, os follow-ups com
data de hoje e os atrasados — apenas dos seus deals. A partir dessa tela ele age (abre o
deal, registra o contato feito, atualiza a próxima ação).

**Why this priority**: é o motor diário do vendedor e a defesa contra "oportunidade
perdida por esquecimento" — o principal problema que o produto resolve. Garante que
nenhum cliente estratégico fique sem follow-up.

**Independent Test**: com deals que tenham próxima ação vencida e de hoje, abrir a tela
"Hoje" e confirmar que ela lista exatamente esses itens do vendedor logado, ordenados por
urgência (atrasados primeiro), e que itens futuros ou de outro dono não aparecem.

**Acceptance Scenarios**:

1. **Given** deals do vendedor com próxima ação de hoje e atrasada, **When** ele abre "Hoje", **Then** vê os atrasados destacados (em vermelho) e os de hoje, ordenados por urgência.
2. **Given** um follow-up listado em "Hoje", **When** o vendedor conclui a ação e define uma nova próxima ação e data, **Then** o item sai da lista de hoje quando a nova data é futura.
3. **Given** deals de outro vendedor, **When** o vendedor logado abre "Hoje", **Then** esses itens não aparecem.

---

### User Story 3 - Gerir propostas como objeto de primeira classe (Priority: P2)

O vendedor cria uma proposta para um deal, com valor, versão, status, validade e link do
documento. Conforme a proposta evolui (rascunho → enviada → vista → aceita → recusada), o
deal acompanha. A validade da proposta funciona como alavanca de urgência.

**Why this priority**: estrutura a fase de negociação e dá rastreabilidade ao que foi
ofertado; depende do pipeline (US1), mas é independente das integrações e do forecast.

**Independent Test**: criar uma proposta para um deal, versioná-la (nova versão com novo
valor), mudar o status e confirmar que o histórico de versões fica na timeline e que o
deal reflete o status atual.

**Acceptance Scenarios**:

1. **Given** um deal aberto, **When** o vendedor cria uma proposta com valor e validade, **Then** ela é registrada como versão 1 com status "rascunho" e aparece na timeline do deal.
2. **Given** uma proposta existente, **When** o vendedor cria uma nova versão, **Then** a versão é incrementada e o histórico anterior é preservado.
3. **Given** uma proposta marcada como "enviada"/"aceita", **When** o status muda, **Then** o deal é movido para a etapa correspondente.

---

### User Story 4 - Acompanhar forecast contra meta (Priority: P2)

O gestor cadastra metas mensais (do time e por vendedor) e abre um dashboard que mostra,
no topo, o forecast ponderado contra a meta do mês e o % de atingimento, além de pipeline
por etapa, ganhos × perdidos, ticket médio, ciclo de venda, MRR novo e ranking por
vendedor.

**Why this priority**: responde "quanto vamos fechar este mês?" — a pergunta do gestor.
Depende de dados do pipeline (US1) e ganha precisão com propostas (US3).

**Independent Test**: com deals abertos em várias etapas, metas cadastradas e alguns deals
ganhos/perdidos no mês, abrir o dashboard e verificar que o forecast ponderado, o %
de atingimento e os KPIs batem com um cálculo manual a partir dos mesmos dados.

**Acceptance Scenarios**:

1. **Given** deals abertos com valor e probabilidade por etapa, **When** o gestor abre o dashboard, **Then** vê o forecast ponderado (soma de valor × probabilidade da etapa) comparado à meta do mês e o % de atingimento.
2. **Given** metas por vendedor, **When** o gestor consulta o ranking, **Then** vê cada vendedor por conversão e R$ ganho no período.
3. **Given** deals ganhos no mês (pontuais e recorrentes), **When** o dashboard é exibido, **Then** mostra ticket médio, ganhos × perdidos e MRR novo do mês.

---

### User Story 5 - Gerar mensagens com playbooks e disparar no WhatsApp (Priority: P3)

O vendedor escolhe um playbook (diagnóstico, objeção, follow-up, proposta,
reengajamento); o sistema preenche o template com os dados do contato/deal (nome,
empresa, dores, próximo passo) e gera o texto pronto. Um botão abre o WhatsApp já com a
mensagem preenchida para envio manual.

**Why this priority**: responde "o que funciona pra vender?" (eleva todo vendedor ao
nível do melhor) e é o maior ganho de usabilidade — mas depende de ter contato/deal
(US1) e se beneficia da análise (US7).

**Independent Test**: a partir de um deal com contato e telefone, escolher um playbook,
ver o texto preenchido com os dados corretos, e confirmar que o botão de WhatsApp abre a
conversa com o texto já no campo de mensagem (sem enviar automaticamente).

**Acceptance Scenarios**:

1. **Given** um deal com contato e dados conhecidos, **When** o vendedor escolhe um playbook, **Then** o sistema retorna o texto com as variáveis substituídas pelos dados reais.
2. **Given** um texto de follow-up gerado e um contato com telefone, **When** o vendedor clica em WhatsApp, **Then** abre a conversa do contato com a mensagem preenchida, pronta para envio manual.
3. **Given** um contato sem telefone, **When** o vendedor tenta o WhatsApp, **Then** o sistema informa que falta o telefone em vez de abrir uma conversa inválida.

---

### User Story 6 - Sincronizar diagnósticos agendados (Calendly) (Priority: P3)

Diagnósticos agendados externamente são trazidos para o CRM: ao acionar "Atualizar" (ou
por rotina periódica), o sistema busca os agendamentos do tipo "diagnóstico", cria/atualiza
o contato (origem inbound) e cria o deal em "Diagnóstico agendado", já com dono e próxima
ação ("Confirmar presença + enviar lembrete", para o dia anterior à call). Repetir a ação
não duplica deals. Cancelamentos são refletidos no deal.

**Why this priority**: automatiza a entrada inbound do funil e elimina digitação manual,
mas o CRM já é utilizável sem ela (entrada manual via US1).

**Independent Test**: acionar "Atualizar" com agendamentos disponíveis e confirmar que
cada diagnóstico vira contato + deal em "Diagnóstico agendado" com dono e próxima ação;
acionar novamente e confirmar que nenhum deal é duplicado; cancelar um agendamento na
origem e confirmar que o deal correspondente é marcado.

**Acceptance Scenarios**:

1. **Given** diagnósticos agendados na origem, **When** o vendedor aciona "Atualizar", **Then** cada diagnóstico do tipo correto cria um contato (inbound) e um deal em "Diagnóstico agendado" com dono e próxima ação.
2. **Given** uma sincronização já feita, **When** o vendedor aciona "Atualizar" de novo, **Then** nenhum deal é duplicado (deduplicação pelo identificador único do evento).
3. **Given** um agendamento cancelado na origem, **When** ocorre a sincronização, **Then** o deal correspondente é marcado/atualizado para refletir o cancelamento.

---

### User Story 7 - Transcrição e análise pós-call (Priority: P3)

Quando uma reunião gravada externamente fica pronta, sua transcrição entra na timeline do
deal certo, a presença é marcada (compareceu) e o deal avança para "Diagnóstico
realizado". Uma análise por IA gera resumo, qualificação e próximo passo, grava a próxima
ação no deal (alimentando "Hoje") e prepara um rascunho de follow-up por e-mail citando as
dores discutidas. Se a reunião passa sem transcrição, é marcada como no-show.

**Why this priority**: fecha o ciclo da reunião e abastece automaticamente o motor diário
(US2) e os playbooks (US5), mas é a camada mais dependente de terceiros e de IA.

**Independent Test**: simular a chegada de uma transcrição associada a um deal e confirmar
que a transcrição entra na timeline, a presença vira "compareceu", o deal vai para
"Diagnóstico realizado", a análise grava uma próxima ação e um rascunho de follow-up é
criado; reenviar a mesma transcrição não duplica nada; uma call sem transcrição é marcada
no-show.

**Acceptance Scenarios**:

1. **Given** uma transcrição pronta para um deal, **When** ela chega ao CRM, **Then** vira atividade de transcrição na timeline, a presença é marcada "compareceu" e o deal vai para "Diagnóstico realizado".
2. **Given** uma transcrição processada, **When** a análise por IA roda, **Then** o deal recebe resumo/qualificação como atividade, uma próxima ação com data, e um rascunho de follow-up é preparado para revisão humana.
3. **Given** a mesma transcrição recebida duas vezes, **When** o CRM a processa, **Then** não há duplicação de atividade nem de análise.
4. **Given** uma falha na análise por IA, **When** ela ocorre, **Then** o deal e a timeline permanecem consistentes (a falha não trava o pipeline) e o erro fica registrado.
5. **Given** uma reunião cujo horário passou sem transcrição, **When** a verificação de presença ocorre, **Then** o deal é marcado no-show.

---

### Edge Cases

- **Deal sem próxima ação**: um deal aberto sem próxima ação definida não aparece em "Hoje", mas deve ser sinalizado em algum ponto como pendência (deal parado).
- **Contato duplicado na sincronização**: dois agendamentos do mesmo e-mail devem reusar o contato existente (find-or-create), sem criar empresas/contatos duplicados.
- **Proposta vencida**: ao passar da validade, a proposta deve ser visivelmente destacada e o deal sinalizado.
- **Deal ganho sem MRR em recorrente**: marcar "Ganho/recorrente" sem informar MRR deve ser bloqueado.
- **Forecast com etapas terminais**: deals em "Ganho"/"Perdido"/"Stand-by" não entram no forecast ponderado de deals abertos.
- **Telefone fora do padrão**: número sem formato internacional válido impede o WhatsApp click-to-send com mensagem clara.
- **Sincronização parcial/paginada**: muitos agendamentos não podem fazer a sincronização perder eventos (paginação completa); falha no meio não pode duplicar nem perder a marca d'água.
- **Acesso entre vendedores**: no MVP qualquer membro autenticado lê os dados; "Hoje" e ranking filtram por dono, não por permissão.

## Requirements _(mandatory)_

### Functional Requirements

**Acesso e perfis**

- **FR-001**: O sistema MUST exigir login para qualquer tela do CRM e negar acesso a não autenticados.
- **FR-002**: O sistema MUST manter perfis dos membros do time com nome e papel (vendedor ou gestor), usados para atribuir dono aos deals e compor o ranking.

**Pipeline, contatos e atividades**

- **FR-003**: Usuários MUST poder cadastrar e editar empresas e contatos; cada contato registra origem (inbound ou outbound).
- **FR-004**: Usuários MUST poder criar, editar e mover deals entre etapas, persistindo etapa e posição; cada deal exibe cliente, valor, dono e próxima ação.
- **FR-005**: Cada etapa MUST ter uma probabilidade associada (usada no forecast).
- **FR-006**: O sistema MUST registrar uma timeline de atividades por deal/contato (nota, ligação, transcrição, análise, e-mail, proposta), com data e hora.
- **FR-007**: Ao fechar um deal, o sistema MUST exigir: tipo (pontual/recorrente, com MRR quando recorrente) ao marcar "Ganho"; motivo padronizado ao marcar "Perdido"; data de reaquecer ao marcar "Stand-by".

**Próxima ação e tela "Hoje"**

- **FR-008**: Todo deal aberto MUST poder ter uma próxima ação com data.
- **FR-009**: O sistema MUST oferecer a tela "Hoje" que lista, para o vendedor logado, os follow-ups de hoje e atrasados, ordenados por urgência (atrasados primeiro) e com os atrasados destacados.
- **FR-010**: A tela "Hoje" MUST mostrar apenas os deals do vendedor logado.

**Propostas**

- **FR-011**: Usuários MUST poder criar e versionar propostas por deal, com valor, status (rascunho → enviada → vista → aceita → recusada), validade e link do documento.
- **FR-012**: A mudança de status da proposta MUST mover o deal para a etapa correspondente; propostas vencendo MUST ser destacadas.

**Playbooks e WhatsApp**

- **FR-013**: O sistema MUST manter uma biblioteca de playbooks por categoria (diagnóstico, objeção, follow-up, proposta, reengajamento).
- **FR-014**: O sistema MUST preencher, sob demanda, um playbook com os dados do contato/deal (nome, empresa, dores, próximo passo) e devolver o texto pronto, sem enviar nada.
- **FR-015**: O sistema MUST oferecer um botão que abre o WhatsApp do contato com a mensagem do playbook já preenchida para envio manual; MUST tratar contato sem telefone com mensagem clara.

**Metas e forecast**

- **FR-016**: O gestor MUST poder cadastrar metas mensais do time e por vendedor.
- **FR-017**: O sistema MUST calcular o forecast ponderado (soma, para deals abertos, de valor × probabilidade da etapa) em um único ponto de cálculo, por total, por etapa e por vendedor.
- **FR-018**: O dashboard MUST exibir forecast ponderado × meta e % de atingimento do mês, pipeline em aberto por etapa, ganhos × perdidos no período, ticket médio, ciclo de venda médio, MRR novo do mês e ranking por vendedor.

**Sincronização de diagnósticos (Calendly)**

- **FR-019**: O sistema MUST sincronizar os agendamentos do tipo "diagnóstico", sob disparo manual ("Atualizar") e/ou rotina periódica, criando/atualizando contato (origem inbound) e criando o deal em "Diagnóstico agendado".
- **FR-020**: O deal criado pela sincronização MUST nascer com dono e próxima ação ("Confirmar presença + enviar lembrete", com data no dia anterior à reunião).
- **FR-021**: A sincronização MUST ser idempotente, deduplicando pelo identificador único do evento (nunca pelo título), e MUST seguir a paginação completa sem perder eventos.
- **FR-022**: A sincronização MUST refletir cancelamentos no deal correspondente.

**Transcrição e análise pós-call (tl;dv + IA)**

- **FR-023**: Ao chegar uma transcrição, o sistema MUST associá-la ao deal correto, registrá-la na timeline, marcar presença "compareceu" e mover o deal para "Diagnóstico realizado".
- **FR-024**: O processamento de transcrição MUST ser idempotente (a mesma reunião recebida duas vezes não duplica).
- **FR-025**: O sistema MUST disparar uma análise por IA que gera resumo, qualificação e próximo passo, grava a próxima ação (com data) no deal e prepara um rascunho de follow-up por e-mail citando as dores — sempre para revisão humana, nunca envio automático.
- **FR-026**: Uma falha na análise por IA MUST NOT travar o pipeline; o deal e a timeline permanecem consistentes e o erro é registrado.
- **FR-027**: O sistema MUST marcar no-show quando a reunião passa sem transcrição.

**Segurança e privacidade (transversal)**

- **FR-028**: O sistema MUST restringir todo o acesso a dados a membros autenticados (single-org no MVP).
- **FR-029**: Entradas de sincronização e webhooks MUST validar o payload e responder rápido, processando o trabalho pesado de forma assíncrona; webhooks MUST verificar a autenticidade da origem antes de processar.
- **FR-030**: O sistema MUST tratar transcrições e propostas como dados sensíveis: minimizar dados pessoais em logs e enviar à IA apenas o necessário.

### Key Entities _(include if feature involves data)_

- **Perfil**: membro do time (nome, papel vendedor/gestor); é o dono de deals e a unidade do ranking.
- **Empresa**: organização cliente (nome, domínio).
- **Contato**: pessoa em uma empresa (nome, e-mail, telefone, origem inbound/outbound).
- **Etapa**: fase do funil com nome, ordem e probabilidade de fechamento.
- **Deal (oportunidade)**: venda em andamento — cliente, valor, dono, etapa/posição, tipo (pontual/recorrente + MRR), status (aberto/ganho/perdido/stand-by), presença, próxima ação + data, motivo de perda padronizado, data de reaquecer, e o identificador do evento de origem para deduplicação.
- **Proposta**: oferta de um deal — versão, valor, status, validade, link.
- **Playbook (template)**: texto por categoria com variáveis a preencher.
- **Meta**: alvo mensal de valor, do time ou de um vendedor.
- **Atividade**: evento na timeline de um deal/contato (nota, ligação, transcrição, análise, e-mail, proposta), com conteúdo e data.
- **Estado de sincronização**: marca d'água do último processamento da origem de agendamentos.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Ao logar, o vendedor consegue identificar o que precisa fazer hoje em menos de 10 segundos (a tela "Hoje" é o ponto de entrada e lista follow-ups de hoje e atrasados).
- **SC-002**: O caminho "abrir CRM → ver o que fazer → agir (WhatsApp/e-mail) → atualizar o deal" se completa em no máximo 5 cliques.
- **SC-003**: O gestor consegue ver, a qualquer momento, o forecast ponderado contra a meta e o % de atingimento do mês, com dados reais do pipeline.
- **SC-004**: Acionar "Atualizar" duas vezes seguidas não cria nenhum deal duplicado a partir dos mesmos agendamentos.
- **SC-005**: 100% dos deals criados por sincronização nascem com dono e próxima ação definidos.
- **SC-006**: Toda reunião com transcrição recebida resulta em presença marcada, deal em "Diagnóstico realizado" e uma próxima ação gravada — sem intervenção manual.
- **SC-007**: Nenhuma oportunidade aberta com follow-up vencido fica invisível: 100% dos atrasados do vendedor aparecem em "Hoje".
- **SC-008**: Nenhum rascunho de e-mail é enviado automaticamente; 100% das comunicações externas passam por ação humana.
- **SC-009**: Fechamentos são completos: 100% dos "Ganho" têm tipo (e MRR se recorrente), 100% dos "Perdido" têm motivo padronizado, 100% dos "Stand-by" têm data de reaquecer.

## Assumptions

- **Single-org, sem acesso de cliente externo**: qualquer membro autenticado lê os dados; o filtro por dono em "Hoje"/ranking é de visão, não de permissão. Refinamento por dono fica para fase posterior.
- **Atribuição de dono na sincronização**: o deal criado por sincronização recebe como dono quem disparou o "Atualizar" (ou regra simples de rodízio), conforme o PRD.
- **Plano Free da origem de agendamentos**: a entrada inbound é por sincronização periódica (atraso de minutos é aceitável), não em tempo real; tempo real é upgrade opcional fora do MVP.
- **Transcrição automática e IA dependem de planos/keys com billing** (terceiros); o produto degrada com elegância se indisponíveis (a falha de IA não trava o pipeline).
- **Probabilidades e etapas iniciais** seguem o seed do PRD (Novo lead → Qualificado → Diagnóstico agendado → Diagnóstico realizado → Proposta enviada → Negociação → Ganho/Perdido/Stand-by).
- **Outbound** entra em "Novo lead" e só avança para "Diagnóstico agendado" após "Qualificado"; inbound (sincronizado) nasce direto em "Diagnóstico agendado".
- **Motivos de perda padronizados** e categorias de playbook seguem os conjuntos definidos no PRD.
- **Detecção de no-show** ocorre por verificação após o horário da reunião quando não há transcrição.
- **Idioma**: a interface e os textos gerados são em português.

## Out of Scope (MVP)

- Win-rate por playbook (qual script converte mais).
- Motor de alertas automáticos (follow-up atrasado, proposta vencendo, stand-by chegando à data).
- "Por que perdemos" agregado a partir de transcrições; mapa de stakeholders.
- Multi-tenant / acesso de cliente; papéis e permissões granulares.
- Envio automático de e-mail (no MVP só rascunho com revisão humana obrigatória).
- Recebimento de agendamentos em tempo real (webhook pago da origem).
