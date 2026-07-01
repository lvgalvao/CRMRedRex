import { describe, it, expect } from "vitest";
import { parseClose, closeToDealPatch } from "@/lib/services/closeDeal.schema";

describe("closeDeal — validação de fechamento (FR-007, SC-009)", () => {
  it("won pontual é válido", () => {
    expect(parseClose({ status: "won", deal_type: "pontual" })).toMatchObject({
      status: "won",
      deal_type: "pontual",
    });
  });

  it("won recorrente exige mrr > 0", () => {
    expect(() => parseClose({ status: "won", deal_type: "recorrente", mrr: 0 })).toThrow();
    expect(() => parseClose({ status: "won", deal_type: "recorrente" })).toThrow();
    expect(parseClose({ status: "won", deal_type: "recorrente", mrr: 1500 })).toMatchObject({
      mrr: 1500,
    });
  });

  it("lost exige motivo padronizado do enum", () => {
    expect(() => parseClose({ status: "lost" })).toThrow();
    expect(() => parseClose({ status: "lost", lost_reason: "qualquer" })).toThrow();
    expect(parseClose({ status: "lost", lost_reason: "preço" })).toMatchObject({
      lost_reason: "preço",
    });
  });

  it("standby exige data de reaquecer", () => {
    expect(() => parseClose({ status: "standby" })).toThrow();
    expect(parseClose({ status: "standby", reaquecer_em: "2026-09-01" })).toMatchObject({
      reaquecer_em: "2026-09-01",
    });
  });

  it("closeToDealPatch mapeia status -> campos do deal", () => {
    expect(closeToDealPatch({ status: "won", deal_type: "recorrente", mrr: 900 })).toEqual({
      status: "won",
      deal_type: "recorrente",
      mrr: 900,
    });
    expect(closeToDealPatch({ status: "lost", lost_reason: "timing" })).toEqual({
      status: "lost",
      lost_reason: "timing",
    });
  });
});
