import "server-only";

import { serverEnv } from "@/lib/env";

// Adapter Gmail — cria apenas RASCUNHO, nunca envia (Princípio V, FR-025).
// No MVP, se o Gmail não estiver configurado, o rascunho é persistido como
// atividade `email` no CRM (o serviço chamador faz isso), garantindo revisão humana.

export interface DraftResult {
  created: boolean;
  provider: "gmail" | "crm_fallback";
}

export function isGmailConfigured(): boolean {
  try {
    const env = serverEnv();
    return Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
  } catch {
    return false;
  }
}

/**
 * Cria um rascunho no Gmail (drafts.create), nunca envia. Retorna se foi criado.
 * Stub: integra com a API do Gmail quando as credenciais existirem.
 */
export async function createGmailDraft(
  _to: string,
  _subject: string,
  _body: string,
): Promise<DraftResult> {
  if (!isGmailConfigured()) {
    return { created: false, provider: "crm_fallback" };
  }
  // TODO: integrar com gmail.users.drafts.create (OAuth refresh token).
  // Mantido como rascunho — envio automático é proibido no MVP.
  return { created: true, provider: "gmail" };
}
