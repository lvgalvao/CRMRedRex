import { describe, it, expect } from "vitest";
import { computeForecastFromData, weightedValue } from "@/lib/services/computeForecast";
import type { Deal, Goal, Stage } from "@/lib/supabase/types";

const stages: Pick<Stage, "id" | "name" | "probability">[] = [
  { id: "s1", name: "Proposta enviada", probability: 60 },
  { id: "s2", name: "Negociação", probability: 80 },
  { id: "won", name: "Ganho", probability: 100 },
];

function d(o: Partial<Deal>): Deal {
  return {
    id: Math.random().toString(),
    contact_id: "c",
    company_id: null,
    stage_id: "s1",
    owner_id: "u1",
    title: "x",
    value: 1000,
    probability: null,
    expected_close_date: null,
    deal_type: "pontual",
    mrr: 0,
    position: 0,
    status: "open",
    attendance: "pendente",
    next_action: null,
    next_action_date: null,
    lost_reason: null,
    reaquecer_em: null,
    calendly_event_uid: null,
    created_at: "",
    updated_at: "",
    ...o,
  };
}

describe("computeForecast (FR-017/FR-018, SC-003)", () => {
  it("pondera valor × probabilidade só de deals abertos", () => {
    const f = computeForecastFromData(
      [
        d({ stage_id: "s1", value: 1000 }), // 600
        d({ stage_id: "s2", value: 1000 }), // 800
        d({ stage_id: "won", value: 5000, status: "won" }), // excluído (terminal)
      ],
      stages,
      [],
      "2026-05-01",
    );
    expect(f.total.weighted).toBe(1400);
    expect(f.total.gross).toBe(2000); // só os abertos
  });

  it("calcula % de atingimento contra a meta do time (owner_id null)", () => {
    const goals: Pick<Goal, "owner_id" | "target_value">[] = [
      { owner_id: null, target_value: 2800 },
    ];
    const f = computeForecastFromData(
      [d({ stage_id: "s2", value: 1000 })],
      stages,
      goals,
      "2026-05-01",
    );
    expect(f.vsGoal.target).toBe(2800);
    expect(f.vsGoal.weighted).toBe(800);
    expect(f.vsGoal.attainmentPct).toBe(28.6);
  });

  it("agrega por etapa e por dono", () => {
    const f = computeForecastFromData(
      [
        d({ owner_id: "u1", stage_id: "s1", value: 1000 }),
        d({ owner_id: "u2", stage_id: "s2", value: 2000 }),
      ],
      stages,
      [
        { owner_id: "u1", target_value: 600 },
        { owner_id: "u2", target_value: 800 },
      ],
      "2026-05-01",
    );
    expect(f.byStage.find((s) => s.stageId === "s1")?.weighted).toBe(600);
    expect(f.byStage.find((s) => s.stageId === "s2")?.weighted).toBe(1600);
    expect(f.vsGoal.perOwner.find((o) => o.ownerId === "u2")?.attainmentPct).toBe(200);
  });
});

// --- 002: probabilidade efetiva por oportunidade (FR-008a, FR-008b, SC-008) ---
describe("forecast com probabilidade ajustada (FR-008a)", () => {
  it("usa a probabilidade da etapa quando o deal não tem ajuste manual", () => {
    const f = computeForecastFromData(
      [d({ stage_id: "s1", value: 1000, probability: null })],
      stages,
      [],
      "2026-08-01",
    );
    expect(f.total.weighted).toBe(600); // 1000 × 60%
  });

  it("o ajuste manual do deal prevalece sobre a etapa", () => {
    const f = computeForecastFromData(
      [d({ stage_id: "s1", value: 1000, probability: 25 })],
      stages,
      [],
      "2026-08-01",
    );
    expect(f.total.weighted).toBe(250); // 1000 × 25%, não 60%
  });

  it("ajuste de 0% zera o ponderado sem zerar o bruto", () => {
    const f = computeForecastFromData(
      [d({ stage_id: "s2", value: 5000, probability: 0 })],
      stages,
      [],
      "2026-08-01",
    );
    expect(f.total.weighted).toBe(0);
    expect(f.total.gross).toBe(5000);
  });

  it("mistura deals herdados e ajustados no mesmo total", () => {
    const f = computeForecastFromData(
      [
        d({ stage_id: "s1", value: 1000, probability: null }), // 600
        d({ stage_id: "s2", value: 1000, probability: 50 }), // 500
      ],
      stages,
      [],
      "2026-08-01",
    );
    expect(f.total.weighted).toBe(1100);
  });

  it("deal fechado fica fora do ponderado mesmo com probabilidade ajustada (FR-013)", () => {
    const f = computeForecastFromData(
      [d({ stage_id: "s1", value: 1000, probability: 90, status: "won" })],
      stages,
      [],
      "2026-08-01",
    );
    expect(f.total.weighted).toBe(0);
    expect(f.total.gross).toBe(0);
  });
});

describe("weightedValue — unidade da regra de forecast (FR-008a, FR-013)", () => {
  it("aplica a probabilidade da etapa quando não há ajuste", () => {
    expect(weightedValue({ value: 1000, probability: null, status: "open" }, { probability: 60 })).toBe(600);
  });

  it("aplica o ajuste manual quando existe", () => {
    expect(weightedValue({ value: 1000, probability: 25, status: "open" }, { probability: 60 })).toBe(250);
  });

  it("zera para oportunidades fechadas, qualquer que seja a probabilidade", () => {
    for (const status of ["won", "lost", "standby"] as const) {
      expect(weightedValue({ value: 1000, probability: 90, status }, { probability: 60 })).toBe(0);
    }
  });

  it("trata valor e etapa ausentes como zero", () => {
    expect(weightedValue({ value: null, probability: null, status: "open" }, { probability: 60 })).toBe(0);
    expect(weightedValue({ value: 1000, probability: null, status: "open" }, null)).toBe(0);
  });
});
