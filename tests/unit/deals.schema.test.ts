import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { parseCreateDeal, parseEditDeal, fieldErrors } from "@/lib/services/deals.schema";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";

const base = {
  title: "Projeto de dados — ACME",
  company_id: UUID_A,
  contact_id: UUID_B,
  stage_id: UUID_C,
};

function erros(input: unknown): Record<string, string> {
  try {
    parseCreateDeal(input);
    throw new Error("esperava ZodError");
  } catch (e) {
    if (e instanceof ZodError) return fieldErrors(e);
    throw e;
  }
}

describe("createDealSchema — obrigatórios (FR-002, FR-003)", () => {
  it("aceita o mínimo: nome, cliente, contato e etapa", () => {
    const out = parseCreateDeal(base);
    expect(out.title).toBe("Projeto de dados — ACME");
    expect(out.company_id).toBe(UUID_A);
  });

  it("recusa nome vazio", () => {
    expect(erros({ ...base, title: "   " })).toHaveProperty("title");
  });

  it("recusa cliente, contato ou etapa ausentes", () => {
    expect(erros({ ...base, company_id: "" })).toHaveProperty("company_id");
    expect(erros({ ...base, contact_id: "" })).toHaveProperty("contact_id");
    expect(erros({ ...base, stage_id: "" })).toHaveProperty("stage_id");
  });

  it("recusa nome acima de 120 caracteres", () => {
    expect(erros({ ...base, title: "x".repeat(121) })).toHaveProperty("title");
  });
});

describe("createDealSchema — valor e probabilidade (FR-006)", () => {
  it("aceita valor zero e positivo", () => {
    expect(parseCreateDeal({ ...base, value: 0 }).value).toBe(0);
    expect(parseCreateDeal({ ...base, value: 15000 }).value).toBe(15000);
  });

  it("recusa valor negativo", () => {
    expect(erros({ ...base, value: -1 })).toHaveProperty("value");
  });

  it("aceita probabilidade nos limites e recusa fora de 0–100", () => {
    expect(parseCreateDeal({ ...base, probability: 0 }).probability).toBe(0);
    expect(parseCreateDeal({ ...base, probability: 100 }).probability).toBe(100);
    expect(erros({ ...base, probability: 101 })).toHaveProperty("probability");
    expect(erros({ ...base, probability: -5 })).toHaveProperty("probability");
  });

  it("probabilidade ausente fica indefinida — herda a etapa (FR-008)", () => {
    expect(parseCreateDeal(base).probability).toBeUndefined();
    expect(parseCreateDeal({ ...base, probability: "" }).probability).toBeUndefined();
  });
});

describe("createDealSchema — previsão de fechamento (FR-007)", () => {
  it("aceita data no passado", () => {
    const out = parseCreateDeal({ ...base, expected_close_date: "2020-01-15" });
    expect(out.expected_close_date).toBe("2020-01-15");
  });

  it("aceita ausência de previsão", () => {
    expect(
      parseCreateDeal({ ...base, expected_close_date: "" }).expected_close_date,
    ).toBeUndefined();
  });

  it("recusa data em formato inválido", () => {
    expect(erros({ ...base, expected_close_date: "15/01/2026" })).toHaveProperty(
      "expected_close_date",
    );
  });
});

describe("editDealSchema", () => {
  it("aceita patch parcial", () => {
    expect(parseEditDeal({ value: 500 })).toEqual({ value: 500 });
  });

  it("valida os campos presentes", () => {
    expect(() => parseEditDeal({ value: -10 })).toThrow(ZodError);
  });
});
