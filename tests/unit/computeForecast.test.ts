import { describe, it, expect } from "vitest";
import { computeForecastFromData } from "@/lib/services/computeForecast";
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
    stage_id: "s1",
    owner_id: "u1",
    title: "x",
    value: 1000,
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
    const goals: Pick<Goal, "owner_id" | "target_value">[] = [{ owner_id: null, target_value: 2800 }];
    const f = computeForecastFromData([d({ stage_id: "s2", value: 1000 })], stages, goals, "2026-05-01");
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
