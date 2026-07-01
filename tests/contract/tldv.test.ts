import { describe, it, expect } from "vitest";
import { verifyHmacSignature, hmacSha256Hex } from "@/lib/webhooks/verify";
import { parseTldvEvent } from "@/lib/integrations/tldv";

const SECRET = "tldv-secret";

describe("tl;dv — contrato do webhook (FR-023/FR-024/FR-029)", () => {
  it("rejeita assinatura inválida e aceita a válida (tempo constante)", () => {
    const body = JSON.stringify({ event: "TranscriptReady", meetingId: "m1", transcript: "x" });
    const good = hmacSha256Hex(body, SECRET);
    expect(verifyHmacSignature(body, good, SECRET)).toBe(true);
    expect(verifyHmacSignature(body, "sha256=" + good, SECRET)).toBe(true);
    expect(verifyHmacSignature(body, "deadbeef", SECRET)).toBe(false);
    expect(verifyHmacSignature(body, null, SECRET)).toBe(false);
  });

  it("valida o payload (MeetingReady / TranscriptReady)", () => {
    expect(parseTldvEvent({ event: "MeetingReady", meetingId: "m1", participants: [{ email: "a@b.com" }] }).event).toBe(
      "MeetingReady",
    );
    expect(parseTldvEvent({ event: "TranscriptReady", meetingId: "m2", transcript: "t" }).meetingId).toBe("m2");
    expect(() => parseTldvEvent({ event: "Other", meetingId: "m" })).toThrow();
    expect(() => parseTldvEvent({ event: "TranscriptReady" })).toThrow();
  });
});
