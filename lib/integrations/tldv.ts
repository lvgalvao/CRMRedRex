import { z } from "zod";

// Adapter tl;dv (B2). Parsing PURO (testável) do payload do webhook.

export const tldvEventSchema = z.object({
  event: z.enum(["MeetingReady", "TranscriptReady"]),
  meetingId: z.string().min(1),
  participants: z.array(z.object({ email: z.string() })).optional(),
  transcript: z.string().optional(),
});

export type TldvEvent = z.infer<typeof tldvEventSchema>;

/** Valida e parseia o payload do tl;dv. Lança ZodError se inválido. */
export function parseTldvEvent(body: unknown): TldvEvent {
  return tldvEventSchema.parse(body);
}
