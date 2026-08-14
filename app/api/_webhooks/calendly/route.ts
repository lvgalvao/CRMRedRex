import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { verifyHmacSignature } from "@/lib/webhooks/verify";
import { extractUid } from "@/lib/integrations/calendly";
import { createDealFromBooking } from "@/lib/services/createDealFromBooking";
import { rateLimit, clientKey } from "@/lib/rateLimit";

// OPCIONAL / plano pago (B1-alt, D4): webhook invitee.created. Mesmo destino do polling
// (createDealFromBooking) — muda só o gatilho. Verifica HMAC antes de processar.

export async function POST(req: NextRequest) {
  if (!rateLimit(`calendly:${clientKey(req)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const raw = await req.text();
  const signature = req.headers.get("calendly-webhook-signature");
  // Calendly assina com um signing key; aqui reusamos a verificação HMAC genérica.
  if (!verifyHmacSignature(raw, signature, serverEnv().CALENDLY_TOKEN)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    payload?: {
      uri?: string;
      scheduled_event?: { uri?: string; start_time?: string; status?: string };
      name?: string;
      email?: string;
    };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const ev = payload.payload?.scheduled_event;
  const uri = ev?.uri ?? payload.payload?.uri;
  if (!uri) return NextResponse.json({ ok: true });

  await createDealFromBooking(
    {
      calendlyEventUid: extractUid(uri),
      startTime: ev?.start_time ?? new Date().toISOString(),
      inviteeName: payload.payload?.name ?? "Convidado",
      inviteeEmail: payload.payload?.email ?? "",
      status: ev?.status === "canceled" ? "canceled" : "active",
    },
    null,
  );

  return NextResponse.json({ ok: true });
}
