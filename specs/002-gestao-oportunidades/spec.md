# Feature Specification: Cadastro e Gestão de Oportunidades

**Feature Branch**: `main` (diretório da feature: `002-gestao-oportunidades`)
**Created**: 2026-08-14
**Status**: Draft
**Input**: User description: "Crie a funcionalidade de Cadastro e Gestão de Oportunidades no CRM de forma manual, criando uma entidade Oportunidade relacionada a Cliente e Contato. Permita cadastrar nome, cliente, contato, valor, etapa, probabilidade, responsável, previsão de fechamento e status. Crie o fluxo básico do funil: Lead → Qualificação → Diagnóstico → Proposta → Negociação → Ganha/Perdida. Permita criar, editar, visualizar e alterar a etapa/status da oportunidade, mantendo o histórico das mudanças. Antes de implementar, analise e reutilize a estrutura e os padrões já existentes no projeto."

## Contexto e reuso

O CRM já possui a **Oportunidade** como registro central do pipeline (chamada de *deal* na
base atual), com cliente (empresa), contato, valor, etapa, responsável e status, além do
Kanban, da tela de detalhe e do fechamento Ganho/Perdido/Stand-by. Esta feature **não cria
uma entidade paralela**: ela completa a Oportunidade existente com o que falta para a
gestão manual ponta a ponta — vínculo explícito com o cliente, previsão de fechamento,
probabilidade, um formulário completo de criação/edição e o **histórico auditável** de
mudanças de etapa e status. Duplicar a entidade quebraria o forecast, o Kanban e a tela
"Hoje", que já leem a Oportunidade atual.

## Decisões (resolvidas em 2026-08-14)

- **Etapas do funil**: mantidas as 9 etapas já em uso no CRM; o funil do enunciado é lido sobre elas por mapeamento (FR-010, FR-010a). Nenhuma migração de dados.
- **Probabilidade**: campo próprio da oportunidade, pré-preenchido pela etapa e ajustável pelo vendedor; o forecast usa o ajuste manual quando existir (FR-008, FR-008a, FR-008b).
- **Histórico**: registra apenas mudanças de etapa e de status, com tempo de permanência (FR-019).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar uma oportunidade manualmente (Priority: P1)

O vendedor precisa registrar uma venda que nasceu fora dos canais automáticos (indicação,
evento, prospecção ativa). Ele abre o formulário de nova oportunidade, informa o nome do
negócio, seleciona o cliente e o contato, preenche valor, etapa inicial, responsável e a
previsão de fechamento, e salva. A oportunidade passa a existir no funil como qualquer
outra: aparece no Kanban, entra no forecast e pode receber próxima ação.

**Why this priority**: sem cadastro manual, toda venda que não vem do agendamento
automático fica fora do CRM — e o que não está no CRM não é cobrado nem previsto. É a
fatia mínima que já entrega valor: o funil passa a refletir a realidade comercial completa.

**Independent Test**: preencher e salvar o formulário de nova oportunidade com cliente e
contato existentes; confirmar que ela aparece na coluna da etapa escolhida, com valor,
responsável e previsão corretos, e que persiste após recarregar a página.

**Acceptance Scenarios**:

1. **Given** um vendedor autenticado com clientes e contatos cadastrados, **When** ele cria uma oportunidade informando nome, cliente, contato, valor, etapa, responsável e previsão de fechamento, **Then** a oportunidade é criada com status "Aberta" e aparece na coluna da etapa escolhida.
2. **Given** o formulário de nova oportunidade, **When** o vendedor não informa nome, cliente/contato ou etapa, **Then** o sistema bloqueia o salvamento e indica quais campos são obrigatórios, sem perder o que já foi digitado.
3. **Given** o formulário de nova oportunidade, **When** o vendedor seleciona um cliente, **Then** a lista de contatos oferecida é restrita aos contatos daquele cliente.
4. **Given** o formulário de nova oportunidade, **When** o vendedor não informa o responsável, **Then** o sistema atribui o próprio usuário logado como responsável.
5. **Given** o formulário de nova oportunidade, **When** o vendedor seleciona uma etapa, **Then** a probabilidade é preenchida automaticamente com a da etapa e permanece editável.
6. **Given** uma oportunidade recém-criada, **When** o gestor abre o painel de forecast, **Then** o valor dela é contabilizado no forecast ponderado usando sua probabilidade.

---

### User Story 2 - Avançar a oportunidade no funil com histórico (Priority: P1)

O vendedor move a oportunidade pelo funil conforme a venda evolui — do primeiro contato ao
fechamento — seja arrastando no Kanban, seja alterando a etapa na tela de detalhe. Toda
mudança de etapa e de status fica registrada com quem mudou, quando, de onde para onde e
por quanto tempo ficou na etapa anterior.

**Why this priority**: o funil sem histórico não responde "o que funciona pra vender?" —
não dá para saber onde as vendas travam nem por quanto tempo. O histórico é o que
transforma o movimento do Kanban em método comercial.

**Independent Test**: mover uma oportunidade por três etapas e fechá-la como Ganha;
verificar que a linha do tempo mostra as quatro transições em ordem, cada uma com autor,
data/hora, origem, destino e tempo de permanência na etapa anterior.

**Acceptance Scenarios**:

1. **Given** uma oportunidade em "Qualificação", **When** o vendedor a move para "Proposta", **Then** a nova etapa é persistida e um registro de histórico é criado com etapa de origem, etapa de destino, autor e data/hora.
2. **Given** uma oportunidade com histórico, **When** qualquer membro do time abre a tela de detalhe, **Then** vê o histórico em ordem cronológica (mais recente primeiro) com o tempo de permanência em cada etapa.
3. **Given** uma oportunidade aberta, **When** o vendedor a marca como Ganha, **Then** o status muda para "Ganha", a oportunidade sai do forecast ponderado e a mudança de status é registrada no histórico.
4. **Given** uma oportunidade aberta, **When** o vendedor a marca como Perdida, **Then** o sistema exige um motivo padronizado antes de concluir e grava o motivo junto ao registro de histórico.
5. **Given** uma oportunidade já fechada (Ganha ou Perdida), **When** o vendedor a reabre movendo-a para uma etapa do funil ativo, **Then** o status volta a "Aberta", ela retorna ao forecast e a reabertura é registrada no histórico.
6. **Given** uma tentativa de mudança de etapa que falha, **When** o erro ocorre, **Then** nenhuma alteração parcial permanece: ou etapa e histórico são gravados juntos, ou nada muda.

---

### User Story 3 - Editar e consultar a oportunidade (Priority: P2)

O vendedor abre a oportunidade e ajusta os dados que mudaram ao longo da negociação —
valor renegociado, probabilidade, previsão de fechamento adiada, troca de contato ou de
responsável. A tela de detalhe mostra tudo em um lugar: dados do negócio, cliente, contato,
responsável, previsão, próxima ação e o histórico de mudanças.

**Why this priority**: a edição sustenta a confiança no forecast — previsão e valor
desatualizados produzem número errado para o gestor. Depende do cadastro (US1) existir.

**Independent Test**: editar valor, previsão de fechamento e responsável de uma
oportunidade existente; confirmar que os novos dados aparecem no detalhe, no Kanban e
refletem no forecast do mês correspondente.

**Acceptance Scenarios**:

1. **Given** uma oportunidade existente, **When** o vendedor altera valor e previsão de fechamento e salva, **Then** os novos valores são exibidos no detalhe e no cartão do Kanban.
2. **Given** uma oportunidade existente, **When** o vendedor troca o responsável, **Then** ela passa a contar para o novo responsável nas visões por vendedor e na tela "Hoje".
3. **Given** uma oportunidade cujo contato foi trocado por outro do mesmo cliente, **When** o vendedor salva, **Then** o vínculo é atualizado sem perder atividades, propostas ou histórico já registrados.
4. **Given** uma lista de oportunidades, **When** o vendedor filtra por responsável, etapa ou status, **Then** vê apenas as oportunidades que atendem ao filtro, com o total somado dos valores exibidos.
5. **Given** um valor negativo ou uma probabilidade fora de 0–100, **When** o vendedor tenta salvar, **Then** o sistema recusa e explica o intervalo válido.

---

### Edge Cases

- Cliente sem nenhum contato cadastrado: o formulário permite criar o contato no fluxo ou orienta o cadastro antes, sem deixar a oportunidade órfã.
- Previsão de fechamento no passado: aceita, mas sinalizada visualmente como atrasada — o gestor precisa enxergar previsões vencidas, não ser impedido de registrá-las.
- Oportunidade movida para a mesma etapa em que já está: nenhum registro de histórico é criado (evita poluir a linha do tempo com ruído de drag-and-drop).
- Oportunidade com probabilidade ajustada manualmente que muda de etapa: o valor ajustado é preservado e continua sinalizado como ajustado, sem ser sobrescrito pela probabilidade da nova etapa.
- Duas edições concorrentes na mesma oportunidade: a última gravação prevalece; mudanças de etapa e status de ambas ficam registradas no histórico, enquanto os demais campos não são auditados nesta versão (FR-019).
- Contato ou cliente excluído: as oportunidades associadas continuam existindo e visíveis — a exclusão de um contato com oportunidades é recusada e a de um cliente apenas desfaz o vínculo. Nenhum registro comercial some silenciosamente.
- Oportunidade criada automaticamente pelo agendamento (Calendly): é a mesma entidade e deve ser editável pelo mesmo formulário, sem duplicar registro.
- Responsável desligado do time: suas oportunidades permanecem no funil e podem ser reatribuídas em lote ou individualmente.

## Requirements *(mandatory)*

### Functional Requirements

#### Cadastro e dados

- **FR-001**: O sistema DEVE permitir criar uma oportunidade manualmente informando: nome do negócio, cliente, contato, valor, etapa, probabilidade, responsável, previsão de fechamento e status.
- **FR-002**: O sistema DEVE exigir, no mínimo, nome, cliente, contato e etapa para criar uma oportunidade; os demais campos são opcionais e assumem padrões definidos.
- **FR-003**: O sistema DEVE vincular a oportunidade a exatamente um cliente e a exatamente um contato, e o contato oferecido DEVE pertencer ao cliente selecionado.
- **FR-004**: O sistema DEVE atribuir o usuário logado como responsável quando nenhum responsável for informado.
- **FR-005**: O sistema DEVE atribuir status "Aberta" a toda oportunidade recém-criada.
- **FR-006**: O sistema DEVE aceitar apenas valores monetários maiores ou iguais a zero e probabilidade entre 0 e 100.
- **FR-007**: O sistema DEVE permitir registrar previsão de fechamento como data, inclusive no passado, sinalizando visualmente as previsões vencidas de oportunidades ainda abertas.
- **FR-008**: O sistema DEVE preencher a probabilidade da oportunidade com a probabilidade da etapa selecionada e DEVE permitir que o vendedor a ajuste manualmente por oportunidade.
- **FR-008a**: O forecast ponderado DEVE usar a probabilidade da própria oportunidade quando ela tiver sido ajustada manualmente, e a probabilidade da etapa caso contrário — regra aplicada em um único ponto de cálculo.
- **FR-008b**: Quando a oportunidade muda de etapa e sua probabilidade nunca foi ajustada manualmente, o sistema DEVE passar a considerar e exibir a probabilidade da nova etapa; se houver ajuste manual, o valor informado DEVE ser preservado e sinalizado como ajustado.

#### Funil e etapas

- **FR-009**: O sistema DEVE oferecer um funil de etapas ordenadas cobrindo Lead → Qualificação → Diagnóstico → Proposta → Negociação → Ganha/Perdida, cada etapa com posição e probabilidade associada.
- **FR-010**: O sistema DEVE manter as 9 etapas já em uso no CRM — Novo lead, Qualificado, Diagnóstico agendado, Diagnóstico realizado, Proposta enviada, Negociação, Ganho, Perdido e Stand-by — que detalham o funil pedido; nenhuma migração de oportunidades existentes é feita.
- **FR-010a**: O funil solicitado DEVE ser lido sobre as etapas atuais pelo seguinte mapeamento: Lead = Novo lead; Qualificação = Qualificado; Diagnóstico = Diagnóstico agendado + Diagnóstico realizado; Proposta = Proposta enviada; Negociação = Negociação; Ganha/Perdida = Ganho/Perdido. Stand-by permanece como etapa de reaquecimento, fora do caminho principal.
- **FR-011**: O sistema DEVE permitir alterar a etapa da oportunidade tanto por arraste no quadro do funil quanto pela tela de detalhe, com o mesmo efeito.
- **FR-012**: O sistema DEVE permitir alterar o status entre Aberta, Ganha, Perdida e Stand-by, exigindo motivo padronizado ao marcar Perdida e data de reaquecimento ao marcar Stand-by.
- **FR-013**: O sistema DEVE remover oportunidades com status Ganha, Perdida ou Stand-by do forecast ponderado, mantendo-as visíveis nas listas e nos relatórios históricos.
- **FR-014**: O sistema DEVE permitir reabrir uma oportunidade fechada, devolvendo-a ao status Aberta e ao forecast.

#### Histórico

- **FR-015**: O sistema DEVE registrar cada mudança de etapa e cada mudança de status com: oportunidade, etapa/status de origem, etapa/status de destino, autor e data/hora.
- **FR-016**: O sistema DEVE calcular e exibir o tempo de permanência na etapa anterior a cada transição registrada.
- **FR-017**: O sistema DEVE exibir o histórico na tela de detalhe da oportunidade em ordem cronológica decrescente.
- **FR-018**: O histórico DEVE ser imutável: nenhum usuário pode editar ou excluir registros já gravados.
- **FR-019**: O histórico DEVE registrar exclusivamente mudanças de etapa e de status; alterações de valor, responsável, previsão de fechamento e demais campos não geram registro de histórico nesta versão.
- **FR-020**: Etapa e registro de histórico DEVEM ser gravados de forma atômica — uma mudança de etapa sem histórico correspondente não pode ocorrer.

#### Visualização e edição

- **FR-021**: O sistema DEVE permitir editar todos os campos da oportunidade após a criação, exceto os registros de histórico.
- **FR-022**: O sistema DEVE exibir uma tela de detalhe consolidando dados do negócio, cliente, contato, responsável, previsão, próxima ação, atividades, propostas e histórico.
- **FR-023**: O sistema DEVE oferecer uma listagem de oportunidades filtrável por responsável, etapa e status, exibindo a soma dos valores do conjunto filtrado.
- **FR-024**: O sistema DEVE restringir todo acesso a oportunidades a usuários autenticados do time.
- **FR-025**: O sistema DEVE preservar atividades, propostas e histórico existentes quando o contato, o cliente ou o responsável da oportunidade forem alterados.

### Key Entities *(include if feature involves data)*

- **Oportunidade**: negócio em andamento com um cliente. Atributos: nome, valor, probabilidade (herdada da etapa ou ajustada manualmente), previsão de fechamento, status (Aberta, Ganha, Perdida, Stand-by), próxima ação e data. Relaciona-se a um Cliente, um Contato, uma Etapa e um Responsável; acumula Atividades, Propostas e Histórico. É a mesma entidade central já usada pelo Kanban, pela tela "Hoje" e pelo forecast.
- **Cliente**: empresa com quem se negocia. Agrupa contatos e oportunidades.
- **Contato**: pessoa dentro do cliente com quem o vendedor fala. Pertence a um cliente.
- **Etapa do funil**: posição ordenada no funil de vendas, com probabilidade de fechamento associada, usada para ponderar o forecast.
- **Responsável**: membro do time dono da oportunidade — quem é cobrado por ela e para quem ela aparece na tela "Hoje".
- **Histórico da oportunidade**: registro imutável de uma mudança — origem, destino, autor, data/hora e tempo de permanência anterior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um vendedor cadastra uma oportunidade completa em menos de 60 segundos, sem consultar instruções.
- **SC-002**: 100% das mudanças de etapa e status geram registro de histórico com autor e data/hora recuperáveis.
- **SC-003**: Após uma mudança de etapa, o funil e o forecast refletem o novo estado em até 2 segundos, sem recarregar a página manualmente.
- **SC-004**: O gestor responde "há quanto tempo esta oportunidade está parada nesta etapa?" para qualquer oportunidade em até 3 cliques a partir do funil.
- **SC-005**: Nenhuma oportunidade pode existir sem cliente, contato, etapa e responsável definidos — verificável em 100% dos registros.
- **SC-006**: 90% dos vendedores conseguem criar, mover e fechar uma oportunidade na primeira tentativa, sem erro de validação bloqueante não explicado.
- **SC-007**: Oportunidades fechadas deixam de compor o forecast do mês imediatamente após o fechamento, sem intervenção manual.
- **SC-008**: O forecast ponderado de qualquer conjunto de oportunidades é reproduzível a partir dos valores e probabilidades exibidos na tela, com divergência zero.

## Assumptions

- A Oportunidade é a entidade já existente no CRM (registro central do pipeline); esta feature a estende com cliente explícito, previsão de fechamento, probabilidade e histórico — não cria uma entidade paralela.
- O vínculo com o Cliente passa a ser explícito na oportunidade; quando não informado, é herdado do cliente do contato selecionado.
- Cadastro manual e criação automática por agendamento convergem para o mesmo registro e o mesmo conjunto de regras; muda apenas o gatilho.
- Todo membro autenticado do time enxerga e edita todas as oportunidades (organização única); a tela "Hoje" continua filtrando pelo responsável.
- As 9 etapas atuais permanecem inalteradas; esta feature não cria, renomeia nem remove etapas, e a administração de etapas pelo gestor fica fora do escopo.
- A probabilidade ajustada manualmente é a exceção, não a regra: a herança da etapa continua sendo o comportamento padrão do funil.
- Alterações de valor, responsável e previsão de fechamento não são auditadas nesta versão; se auditoria completa for necessária, entra como feature separada.
- Moeda única (BRL); conversão cambial fora de escopo.
- Uma oportunidade tem exatamente um contato principal; múltiplos contatos por oportunidade ficam fora do escopo desta versão.
- Exclusão de oportunidades não faz parte desta feature — o encerramento se dá por status Perdida ou Stand-by, preservando o histórico.
- Importação em massa (CSV/planilha) fica fora do escopo desta versão.
- Notificações e alertas automáticos por previsão vencida ficam fora do escopo; a sinalização é visual, dentro do CRM.
