import { describe, it, expect } from "vitest";
import { fillVariables, missingVariables } from "@/lib/services/fillTemplate.core";

describe("fillTemplate — substituição de variáveis (FR-014)", () => {
  it("substitui todas as variáveis conhecidas", () => {
    const out = fillVariables("Oi {{nome}}, sobre {{dor}}. Próximo: {{proximo_passo}}", {
      nome: "João",
      dor: "qualidade de dados",
      proximo_passo: "enviar proposta",
    });
    expect(out).toBe("Oi João, sobre qualidade de dados. Próximo: enviar proposta");
  });

  it("mantém visíveis as variáveis sem valor", () => {
    const out = fillVariables("Oi {{nome}}, sobre {{dor}}", { nome: "Ana" });
    expect(out).toBe("Oi Ana, sobre {{dor}}");
    expect(missingVariables(out)).toEqual(["dor"]);
  });

  it("não envia nada — função pura que só retorna texto", () => {
    expect(typeof fillVariables("{{x}}", {})).toBe("string");
  });
});
