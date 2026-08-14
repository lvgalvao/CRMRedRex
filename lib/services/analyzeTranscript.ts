import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDeal, updateDeal } from "@/lib/supabase/deals";
import { getCompany } from "@/lib/supabase/companies";
import { insertActivity, existsActivityByMeta } from "@/lib/supabase/activities";
import { getTemplate, listTemplatesByCategory } from "@/lib/supabase/templates";
import { fillVariables } from "@/lib/services/fillTemplate.core";
import { getAiClient, isAiConfigured, type AiClient } from "@/lib/integrations/anthropic";
import { createGmailDraft } from "@/lib/integrations/gmail";
import { buildAnalysisPrompt, parseAnalysis } from "./analyzeTranscript.core";

export * from "./analyzeTranscript.core";

// Análise pós-call (B3, D7). Disparada async pelo webhook tl;dv.
// IA NÃO trava o pipeline: toda a parte de IA fica em try/catch (FR-026).

export async function analyzeTranscript(
  dealId: string,
  transcript: string,
  meta: { meetingId: string },
  ai: AiClient | null = isAiConfigured() ? getAiClient() : null,
): Promise<void> {
  const db = createAdminClient();

  // Idempotência: mesma reunião não gera análise duplicada (FR-024).
  const already = await existsActivityByMeta(db, "analysis", "meetingId", meta.meetingId);
  if (already) return;

  try {
    if (!ai) return; // IA não configurada: pipeline já seguiu (transcript/presença no webhook).

    const deal = await getDeal(db, dealId);
    const empresa = deal?.contact?.company_id
      ? (await getCompany(db, deal.contact.company_id))?.name
      : undefined;

    const aiText = await ai.complete(buildAnalysisPrompt(transcript, { empresa }), 1500);
    const analysis = parseAnalysis(aiText);

    // Atividade de análise.
    await insertActivity(db, {
      deal_id: dealId,
      type: "analysis",
      content: analysis.resumo,
      metadata: {
        meetingId: meta.meetingId,
        qualificacao: analysis.qualificacao,
        dores: analysis.dores,
        proximoPasso: analysis.proximoPasso,
      },
    });

    // Próxima ação alimenta a tela "Hoje".
    if (analysis.proximoPasso) {
      await updateDeal(db, dealId, {
        next_action: analysis.proximoPasso,
        next_action_date: analysis.nextActionDate,
      });
    }

    // Rascunho de follow-up (nunca envia).
    const [followup] = await listTemplatesByCategory(db, "followup");
    const tpl = followup ?? (await getTemplate(db, ""));
    const draftBody = tpl
      ? fillVariables(tpl.body, {
          nome: deal?.contact?.name ?? "",
          dor: analysis.dores,
          proximo_passo: analysis.proximoPasso,
          data: analysis.nextActionDate ?? "",
        })
      : analysis.resumo;

    const draft = await createGmailDraft(
      deal?.contact?.email ?? "",
      "Follow-up pós-diagnóstico",
      draftBody,
    );
    // Se o Gmail não está configurado, guarda o rascunho como atividade (revisão humana).
    await insertActivity(db, {
      deal_id: dealId,
      type: "email",
      content: draftBody,
      metadata: { kind: "draft_followup", provider: draft.provider, meetingId: meta.meetingId },
    });
  } catch (err) {
    // Falha de IA não trava o pipeline: registra o erro sem PII.
    await insertActivity(db, {
      deal_id: dealId,
      type: "note",
      content: "Falha ao analisar a transcrição (a IA não bloqueia o pipeline).",
      metadata: { kind: "analysis_error", meetingId: meta.meetingId },
    });
    console.error("[analyzeTranscript] erro:", err instanceof Error ? err.message : "desconhecido");
  }
}
