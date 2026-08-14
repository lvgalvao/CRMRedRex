import { describe, it, expect } from "vitest";
import {
  TERMINAL_STAGE,
  STAGE_TO_STATUS,
  isTerminalStage,
  statusForStage,
  effectiveProbability,
  transitionForStage,
} from "@/lib/services/dealStage";

// As 9 etapas em uso (seed da migration 0001) — FR-010.
const ETAPAS_ATIVAS = [
  "Novo lead",
  "Qualificado",
  "Diagnóstico agendado",
  "Diagnóstico realizado",
  "Proposta enviada",
  "Negociação",
];

describe("mapeamento etapa <-> status (FR-010a, FR-012)", () => {
  it("mapeia os três status terminais para suas etapas", () => {
    expect(TERMINAL_STAGE).toEqual({ won: "Ganho", lost: "Perdido", standby: "Stand-by" });
  });

  it("o inverso reconhece as etapas terminais", () => {
    expect(STAGE_TO_STATUS).toEqual({ Ganho: "won", Perdido: "lost", "Stand-by": "standby" });
    expect(isTerminalStage("Ganho")).toBe(true);
    expect(isTerminalStage("Negociação")).toBe(false);
  });

  it("etapas do caminho ativo implicam status 'open'", () => {
    for (const etapa of ETAPAS_ATIVAS) expect(statusForStage(etapa)).toBe("open");
  });

  it("etapas terminais implicam o status correspondente", () => {
    expect(statusForStage("Ganho")).toBe("won");
    expect(statusForStage("Perdido")).toBe("lost");
    expect(statusForStage("Stand-by")).toBe("standby");
  });
});

describe("effectiveProbability (FR-008a, FR-008b)", () => {
  it("herda a probabilidade da etapa quando não há ajuste manual", () => {
    expect(effectiveProbability({ probability: null }, { probability: 60 })).toBe(60);
  });

  it("o ajuste manual prevalece sobre a etapa", () => {
    expect(effectiveProbability({ probability: 45 }, { probability: 60 })).toBe(45);
  });

  it("ajuste manual de 0 prevalece (não é confundido com ausência)", () => {
    expect(effectiveProbability({ probability: 0 }, { probability: 80 })).toBe(0);
  });

  it("sem etapa conhecida, cai para 0", () => {
    expect(effectiveProbability({ probability: null }, undefined)).toBe(0);
  });
});

describe("transitionForStage (FR-012, FR-014)", () => {
  it("mover deal aberto para etapa ativa não mexe no status", () => {
    expect(transitionForStage("open", "Negociação")).toEqual({});
  });

  it("mover deal aberto para etapa terminal aplica o status", () => {
    expect(transitionForStage("open", "Ganho")).toEqual({ status: "won" });
    expect(transitionForStage("open", "Perdido")).toEqual({ status: "lost" });
    expect(transitionForStage("open", "Stand-by")).toEqual({ status: "standby" });
  });

  it("reabre o deal fechado ao voltar para etapa ativa, limpando motivo e reaquecimento", () => {
    expect(transitionForStage("lost", "Negociação")).toEqual({
      status: "open",
      lost_reason: null,
      reaquecer_em: null,
    });
    expect(transitionForStage("standby", "Qualificado")).toEqual({
      status: "open",
      lost_reason: null,
      reaquecer_em: null,
    });
  });

  it("não gera patch quando o status já corresponde à etapa terminal", () => {
    expect(transitionForStage("won", "Ganho")).toEqual({});
  });
});
