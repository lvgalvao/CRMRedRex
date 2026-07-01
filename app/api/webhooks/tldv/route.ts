import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { verifyHmacSignature } from "@/lib/webhooks/verify";
import { parseTldvEvent } from "@/lib/integrations/tldv";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStageByName } from "@/lib/supabase/stages";
import { findContactByEmail } from "@/lib/supabase/contacts";
import { updateDeal } from "@/lib/supabase/deals";
import { insertActivity, existsActivityByMeta } from "@/lib/supabase/activities";
import { getSyncValue, setSyncValue } from "@/lib/supabase/syncState";
import { analyzeTranscript } from "@/lib/services/analyzeTranscript";
import { rateLimit, clientKey } from "@/lib/rateLimit";

// Gatilho fino (B2, FR-023/FR-024/FR-029): verifica HMAC, valida, deduplica,
// delega e responde rápido. Idempotente por meetingId.

const meetingKey = (id: string) => `tldv:meeting:${id}`;

export async function POST(req: NextRequest) {
  if (!rateLimit(`tldv:${clientKey(req)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const raw = await req.text();
  const signature = req.headers.get("x-tldv-signature");
  if (!verifyHmacSignature(raw, signature, serverEnv().TLDV_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event;
  try {
    event = parseTldvEvent(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const db = createAdminClient();

  if (event.event === "MeetingReady") {
    // Casa a reunião com um deal pelo e-mail do participante.
    const email = event.participants?.[0]?.email;
    if (email) {
      const contact = await findContactByEmail(db, email);
      if (contact) {
        const { data } = await db
          .from("deals")
          .select("id")
          .eq("contact_id", contact.id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1);
        const dealId = (data?.[0] as { id: string } | undefined)?.id;
        if (dealId) await setSyncValue(db, meetingKey(event.meetingId), dealId);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // TranscriptReady
  const dealId = await getSyncValue(db, meetingKey(event.meetingId));
  if (!dealId) return NextResponse.json({ ok: true, note: "deal não associado" });

  // Idempotência por meetingId.
  const dup = await existsActivityByMeta(db, "transcript", "meetingId", event.meetingId);
  if (dup) return NextResponse.json({ ok: true, note: "já processado" });

  const transcript = event.transcript ?? "";
  await insertActivity(db, {
    deal_id: dealId,
    type: "transcript",
    content: transcript,
    metadata: { meetingId: event.meetingId },
  });

  // Marca presença e move o deal para "Diagnóstico realizado".
  const stage = await getStageByName(db, "Diagnóstico realizado");
  await updateDeal(db, dealId, {
    attendance: "compareceu",
    ...(stage ? { stage_id: stage.id } : {}),
  });

  // Dispara a análise (resiliente — não trava o pipeline).
  await analyzeTranscript(dealId, transcript, { meetingId: event.meetingId });

  return NextResponse.json({ ok: true });
}
