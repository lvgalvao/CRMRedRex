# Specification Quality Checklist: Cadastro e Gestão de Oportunidades

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-14
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validação executada em 2026-08-14: **16 de 16 itens aprovados**.
- As três decisões abertas foram resolvidas pelo usuário e registradas na seção "Decisões" da spec:
  - **FR-008 / FR-008a / FR-008b** — probabilidade é campo da oportunidade, pré-preenchida pela etapa e ajustável; o forecast usa o ajuste manual quando existir.
  - **FR-010 / FR-010a** — mantidas as 9 etapas atuais, com mapeamento explícito para o funil do enunciado; sem migração de dados.
  - **FR-019** — histórico limitado a mudanças de etapa e status, com tempo de permanência.
- Ponto de atenção para o `/speckit-plan`: FR-008a altera a regra de forecast, hoje concentrada em `computeForecast` (invariante do PRD "forecast num único lugar"). A mudança deve permanecer nesse único ponto de cálculo.
- Spec pronta para `/speckit-plan`.
