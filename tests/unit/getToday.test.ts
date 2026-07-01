import { describe, it, expect } from "vitest";
import { toTodayItems } from "@/lib/services/today";
import type { DealWithContact } from "@/lib/supabase/deals";

const today = "2026-05-29";

function deal(over: Partial<DealWithContact>): DealWithContact {
  return {
    id: "d",
    contact_id: "c",
    stage_id: "s",
    owner_id: "u1",
    title: "Deal",
    value: 0,
    deal_type: "pontual",
    mrr: 0,
    position: 0,
    status: "open",
    attendance: "pendente",
    next_action: "Ligar",
    next_action_date: today,
    lost_reason: null,
    reaquecer_em: null,
    calendly_event_uid: null,
    created_at: "",
    updated_at: "",
    contact: null,
    ...over,
  };
}

describe("toTodayItems (FR-009/FR-010, SC-007)", () => {
  it("inclui hoje e atrasados, exclui futuros", () => {
    const items = toTodayItems(
      [
        deal({ id: "hoje", next_action_date: today }),
        deal({ id: "atrasado", next_action_date: "2026-05-20" }),
        deal({ id: "futuro", next_action_date: "2026-06-10" }),
      ],
      today,
    );
    expect(items.map((i) => i.dealId)).toEqual(["atrasado", "hoje"]);
  });

  it("ordena atrasados primeiro, depois por data", () => {
    const items = toTodayItems(
      [
        deal({ id: "a1", next_action_date: "2026-05-25" }),
        deal({ id: "a2", next_action_date: "2026-05-10" }),
        deal({ id: "hoje", next_action_date: today }),
      ],
      today,
    );
    expect(items.map((i) => i.dealId)).toEqual(["a2", "a1", "hoje"]);
    expect(items[0].overdue).toBe(true);
    expect(items[2].overdue).toBe(false);
  });

  it("exclui deals sem próxima ação e não-abertos", () => {
    const items = toTodayItems(
      [
        deal({ id: "sem_acao", next_action: null }),
        deal({ id: "ganho", status: "won" }),
        deal({ id: "ok" }),
      ],
      today,
    );
    expect(items.map((i) => i.dealId)).toEqual(["ok"]);
  });
});
