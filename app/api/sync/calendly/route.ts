import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSyncValue, setSyncValue } from "@/lib/supabase/syncState";
import { listDiagnosticos, getInvitee } from "@/lib/integrations/calendly";
import { createDealFromBooking } from "@/lib/services/createDealFromBooking";

// Polling do Calendly (B1). Gatilho fino: autoriza, dedup no serviço, responde rápido.
// Autorização: sessão Supabase (botão "Atualizar") OU CRON_SECRET (Vercel Cron).

const WATERMARK_KEY = "calendly:last_synced_at";

async function authorize(req: NextRequest): Promise<{ ok: boolean; ownerId: string | null }> {
  const auth = req.headers.get("authorization");
  const cronSecret = serverEnv().CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return { ok: true, ownerId: null }; // cron: deal sem dono (regra simples)
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { ok: true, ownerId: user.id }; // quem disparou
  return { ok: false, ownerId: null };
}

async function handleSync(req: NextRequest) {
  const { ok, ownerId } = await authorize(req);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const since = (await getSyncValue(admin, WATERMARK_KEY)) ?? now;

  let created = 0;
  let skipped = 0;
  try {
    const bookings = await listDiagnosticos(since);
    for (const ev of bookings) {
      const invitee = ev.status === "active" ? await getInvitee(ev.inviteesUri) : null;
      const result = await createDealFromBooking(
        {
          calendlyEventUid: ev.uid,
          startTime: ev.startTime,
          inviteeName: invitee?.name ?? ev.name,
          inviteeEmail: invitee?.email ?? "",
          answers: invitee?.answers,
          status: ev.status,
        },
        ownerId,
      );
      if (result.created) created += 1;
      else skipped += 1;
    }
    // Marca d'água só após processar com sucesso (não perde nem duplica).
    await setSyncValue(admin, WATERMARK_KEY, now);
  } catch (err) {
    return NextResponse.json(
      { error: "sync_failed", message: err instanceof Error ? err.message : "erro" },
      { status: 502 },
    );
  }

  return NextResponse.json({ created, skipped });
}

// POST: botão "Atualizar" (sessão). GET: Vercel Cron (CRON_SECRET no Authorization).
export const POST = handleSync;
export const GET = handleSync;
