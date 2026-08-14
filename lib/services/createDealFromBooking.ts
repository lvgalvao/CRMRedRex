import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStageByName } from "@/lib/supabase/stages";
import { findCompanyByName, createCompany } from "@/lib/supabase/companies";
import { findContactByEmail, createContact } from "@/lib/supabase/contacts";
import { findDealByCalendlyUid, insertDeal, updateDeal } from "@/lib/supabase/deals";
import { insertActivity } from "@/lib/supabase/activities";
import { reminderDateBefore } from "@/lib/integrations/calendly";

// Ponto ÚNICO de entrada de agendamentos (polling e webhook chamam o mesmo — D4, B1).
// Idempotente por calendly_event_uid (NUNCA pelo título). Usa service role (server).

export type Booking = {
  calendlyEventUid: string;
  startTime: string;
  inviteeName: string;
  inviteeEmail: string;
  companyName?: string | null;
  answers?: Record<string, string>;
  status: "active" | "canceled";
};

export async function createDealFromBooking(
  b: Booking,
  ownerId: string | null,
): Promise<{ dealId: string | null; created: boolean }> {
  const db = createAdminClient();

  const existing = await findDealByCalendlyUid(db, b.calendlyEventUid);

  // Cancelamento: reflete no deal existente (não cria novo).
  if (b.status === "canceled") {
    if (existing) {
      await updateDeal(db, existing.id, { next_action: "Reagendar (cancelado no Calendly)" });
      await insertActivity(db, {
        deal_id: existing.id,
        type: "note",
        content: "Agendamento cancelado no Calendly.",
        metadata: { kind: "calendly_cancel", uid: b.calendlyEventUid },
      });
    }
    return { dealId: existing?.id ?? null, created: false };
  }

  // Dedup: já existe -> no-op.
  if (existing) return { dealId: existing.id, created: false };

  // find-or-create empresa (opcional).
  let companyId: string | null = null;
  if (b.companyName) {
    const company =
      (await findCompanyByName(db, b.companyName)) ??
      (await createCompany(db, { name: b.companyName }));
    companyId = company.id;
  }

  // find-or-create contato (origem inbound).
  const contact =
    (await findContactByEmail(db, b.inviteeEmail)) ??
    (await createContact(db, {
      name: b.inviteeName,
      email: b.inviteeEmail,
      company_id: companyId,
      origem: "inbound",
    }));

  const stage = await getStageByName(db, "Diagnóstico agendado");
  if (!stage) throw new Error("Etapa 'Diagnóstico agendado' não encontrada (rode o seed).");

  const deal = await insertDeal(db, {
    contact_id: contact.id,
    // Cliente explícito no deal (002/FR-003): usa a empresa resolvida acima e,
    // na falta dela, herda a do contato — sem isso a oportunidade nasce sem cliente.
    company_id: companyId ?? contact.company_id ?? null,
    stage_id: stage.id,
    owner_id: ownerId,
    title: `Diagnóstico — ${b.inviteeName}`,
    calendly_event_uid: b.calendlyEventUid,
    next_action: "Confirmar presença + enviar lembrete",
    next_action_date: reminderDateBefore(b.startTime),
  });

  await insertActivity(db, {
    deal_id: deal.id,
    contact_id: contact.id,
    type: "note",
    content: "Diagnóstico agendado via Calendly.",
    metadata: { kind: "calendly_booking", uid: b.calendlyEventUid, answers: b.answers ?? {} },
  });

  return { dealId: deal.id, created: true };
}
