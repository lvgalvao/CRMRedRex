// Núcleo PURO da análise pós-call (testável sem IA/banco — T062).

export type Analysis = {
  resumo: string;
  qualificacao: string;
  dores: string;
  proximoPasso: string;
  nextActionDate: string | null;
};

/** Monta o prompt enviado à IA (PII mínima — só o necessário, LGPD/D8). */
export function buildAnalysisPrompt(transcript: string, context: { empresa?: string }): string {
  return [
    "Você é analista comercial. Analise a transcrição da reunião de diagnóstico e responda",
    "APENAS com um JSON válido com as chaves: resumo, qualificacao, dores, proximoPasso, nextActionDate (YYYY-MM-DD ou null).",
    context.empresa ? `Empresa: ${context.empresa}` : "",
    "Transcrição:",
    transcript,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Parseia a resposta da IA. Tolerante: se não for JSON, usa o texto como resumo. */
export function parseAnalysis(aiText: string): Analysis {
  const fallback: Analysis = {
    resumo: aiText.trim(),
    qualificacao: "",
    dores: "",
    proximoPasso: "",
    nextActionDate: null,
  };
  try {
    const match = aiText.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const obj = JSON.parse(match[0]) as Partial<Analysis>;
    return {
      resumo: obj.resumo ?? "",
      qualificacao: obj.qualificacao ?? "",
      dores: obj.dores ?? "",
      proximoPasso: obj.proximoPasso ?? "",
      nextActionDate: obj.nextActionDate ?? null,
    };
  } catch {
    return fallback;
  }
}
