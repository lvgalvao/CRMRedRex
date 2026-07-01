import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt, parseAnalysis } from "@/lib/services/analyzeTranscript.core";

describe("analyzeTranscript — núcleo (FR-025/FR-026, SC-008)", () => {
  it("monta prompt pedindo JSON e envia só o necessário", () => {
    const p = buildAnalysisPrompt("cliente falou de qualidade de dados", { empresa: "ACME" });
    expect(p).toContain("JSON");
    expect(p).toContain("ACME");
    expect(p).toContain("qualidade de dados");
  });

  it("parseia resposta JSON da IA", () => {
    const a = parseAnalysis(
      'Segue: {"resumo":"bom papo","qualificacao":"fit alto","dores":"silos","proximoPasso":"enviar proposta","nextActionDate":"2026-06-02"}',
    );
    expect(a.dores).toBe("silos");
    expect(a.proximoPasso).toBe("enviar proposta");
    expect(a.nextActionDate).toBe("2026-06-02");
  });

  it("tolera resposta não-JSON (usa texto como resumo)", () => {
    const a = parseAnalysis("texto livre sem json");
    expect(a.resumo).toBe("texto livre sem json");
    expect(a.nextActionDate).toBeNull();
  });
});
