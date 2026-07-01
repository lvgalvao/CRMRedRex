import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Detecção de no-show (FR-027): deals em "Diagnóstico agendado" cuja reunião já
// passou e seguem com attendance 'pendente' viram 'no_show'. Agendado via Vercel Cron.
// Protegido por CRON_SECRET.

export async function GET(req: NextRequest) {
  const cronSecret = serverEnv().CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Aproxima "reunião passou" por next_action_date (lembrete = véspera) < hoje.
  const { data: stage } = await db
    .from("stages")
    .select("id")
    .eq("name", "Diagnóstico agendado")
    .maybeSingle();
  const stageId = (stage as { id: string } | null)?.id;
  if (!stageId) return NextResponse.json({ marked: 0 });

  const { data, error } = await db
    .from("deals")
    .update({ attendance: "no_show" })
    .eq("stage_id", stageId)
    .eq("attendance", "pendente")
    .lt("next_action_date", today)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ marked: (data ?? []).length });
}
