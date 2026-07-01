"use server";

import { fillTemplate } from "@/lib/services/fillTemplate";

// Preenche o playbook sob demanda e devolve o texto (não envia nada).
export async function fillAction(templateId: string, dealId: string): Promise<string> {
  if (!templateId || !dealId) return "";
  const { text } = await fillTemplate(templateId, dealId);
  return text;
}
