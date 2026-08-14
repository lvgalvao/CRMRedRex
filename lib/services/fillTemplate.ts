import { createClient } from "@/lib/supabase/server";
import { getTemplate } from "@/lib/supabase/templates";
import { getDeal } from "@/lib/supabase/deals";
import { getCompany } from "@/lib/supabase/companies";
import { listActivitiesByDeal } from "@/lib/supabase/activities";
import { fillVariables, type TemplateVars } from "./fillTemplate.core";

export * from "./fillTemplate.core";

// Preenche um playbook com os dados do contato/deal (B4, FR-014). Não envia nada.
// A substituição é determinística; a IA (US7) pode enriquecer as dores via análise.

export async function fillTemplate(templateId: string, dealId: string): Promise<{ text: string }> {
  const db = await createClient();
  const [template, deal] = await Promise.all([getTemplate(db, templateId), getDeal(db, dealId)]);
  if (!template) throw new Error("Template não encontrado.");
  if (!deal) throw new Error("Deal não encontrado.");

  const company = deal.contact?.company_id ? await getCompany(db, deal.contact.company_id) : null;

  // Dores e próximo passo a partir da última análise (se houver).
  const activities = await listActivitiesByDeal(db, dealId);
  const lastAnalysis = activities.find((a) => a.type === "analysis");
  const dores = (lastAnalysis?.metadata?.dores as string | undefined) ?? "";

  const vars: TemplateVars = {
    nome: deal.contact?.name ?? "",
    empresa: company?.name ?? "",
    dor: dores,
    proximo_passo: deal.next_action ?? "",
    escopo: deal.title,
    validade: "",
    data: deal.next_action_date ?? "",
    trimestre: "",
  };

  return { text: fillVariables(template.body, vars) };
}
