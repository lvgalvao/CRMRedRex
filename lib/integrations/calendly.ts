import "server-only";

import { serverEnv } from "@/lib/env";

// Adapter Calendly — polling da API v2 (B1). Token só no servidor.
// Funções de parsing são PURAS (testáveis sem rede — T054).

export type CalendlyBooking = {
  uid: string; // calendly_event_uid (dedup) — NUNCA o título
  name: string;
  startTime: string;
  status: "active" | "canceled";
  inviteesUri: string;
};

type RawEvent = {
  uri: string;
  name?: string;
  start_time?: string;
  status?: string;
  event_type?: string;
};

/** Extrai o UUID do final do `uri` do evento. */
export function extractUid(uri: string): string {
  return uri.split("/").filter(Boolean).pop() ?? "";
}

/** Decide se o evento é do tipo "diagnóstico" (filtra o que entra, não deduplica). */
export function isDiagnostico(ev: RawEvent, eventTypeUri: string | undefined): boolean {
  if (!eventTypeUri) return true; // sem filtro configurado -> aceita todos
  return ev.event_type === eventTypeUri;
}

/** Mapeia o evento cru da API para o nosso Booking. */
export function mapScheduledEvent(ev: RawEvent): CalendlyBooking {
  return {
    uid: extractUid(ev.uri),
    name: ev.name ?? "",
    startTime: ev.start_time ?? "",
    status: ev.status === "canceled" ? "canceled" : "active",
    inviteesUri: `${ev.uri}/invitees`,
  };
}

/** Data do lembrete = dia anterior à reunião (YYYY-MM-DD). */
export function reminderDateBefore(startTime: string): string {
  const d = new Date(startTime);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type Invitee = { email: string; name: string; answers: Record<string, string> };

// ---- Chamadas de rede (não puras) ----

/** Lista os diagnósticos do tipo configurado, seguindo a paginação completa. */
export async function listDiagnosticos(minStartTime: string): Promise<CalendlyBooking[]> {
  const env = serverEnv();
  const token = env.CALENDLY_TOKEN;
  const userUri = env.CALENDLY_USER_URI;
  if (!token || !userUri) throw new Error("Calendly não configurado (CALENDLY_TOKEN/USER_URI).");

  const out: CalendlyBooking[] = [];
  let url =
    `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}` +
    `&status=active&min_start_time=${encodeURIComponent(minStartTime)}` +
    `&sort=start_time:asc&count=100`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Calendly ${res.status}`);
    const json = (await res.json()) as {
      collection: RawEvent[];
      pagination?: { next_page?: string | null };
    };
    for (const ev of json.collection ?? []) {
      if (isDiagnostico(ev, env.CALENDLY_EVENT_TYPE_URI)) out.push(mapScheduledEvent(ev));
    }
    url = json.pagination?.next_page ?? "";
  }
  return out;
}

/** Busca o primeiro invitee de um evento. */
export async function getInvitee(inviteesUri: string): Promise<Invitee | null> {
  const token = serverEnv().CALENDLY_TOKEN;
  const res = await fetch(inviteesUri, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Calendly invitees ${res.status}`);
  const json = (await res.json()) as {
    collection: {
      email?: string;
      name?: string;
      questions_and_answers?: { question: string; answer: string }[];
    }[];
  };
  const first = json.collection?.[0];
  if (!first?.email) return null;
  const answers: Record<string, string> = {};
  for (const qa of first.questions_and_answers ?? []) answers[qa.question] = qa.answer;
  return { email: first.email, name: first.name ?? first.email, answers };
}
