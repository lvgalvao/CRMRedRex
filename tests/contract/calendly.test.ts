import { describe, it, expect } from "vitest";
import {
  extractUid,
  isDiagnostico,
  mapScheduledEvent,
  reminderDateBefore,
} from "@/lib/integrations/calendly";

const EVENT_TYPE = "https://api.calendly.com/event_types/DIAG";

describe("Calendly — parsing/contrato (FR-019..022, SC-004/SC-005)", () => {
  it("extrai o UUID do uri (chave de dedup, não o título)", () => {
    expect(extractUid("https://api.calendly.com/scheduled_events/abc-123")).toBe("abc-123");
  });

  it("filtra pelo event_type do diagnóstico", () => {
    expect(isDiagnostico({ uri: "x", event_type: EVENT_TYPE }, EVENT_TYPE)).toBe(true);
    expect(isDiagnostico({ uri: "x", event_type: "other" }, EVENT_TYPE)).toBe(false);
  });

  it("mapeia evento cru -> Booking com uid, status e invitees_uri", () => {
    const b = mapScheduledEvent({
      uri: "https://api.calendly.com/scheduled_events/uid-9",
      name: "Diagnóstico RedRex",
      start_time: "2026-06-10T14:00:00.000000Z",
      status: "active",
    });
    expect(b.uid).toBe("uid-9");
    expect(b.status).toBe("active");
    expect(b.inviteesUri).toBe("https://api.calendly.com/scheduled_events/uid-9/invitees");
  });

  it("detecta cancelamento", () => {
    const b = mapScheduledEvent({ uri: "x/uid", status: "canceled" });
    expect(b.status).toBe("canceled");
  });

  it("next_action_date = dia anterior à reunião", () => {
    expect(reminderDateBefore("2026-06-10T14:00:00.000000Z")).toBe("2026-06-09");
  });
});
