import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  parseCreateCompany,
  parseCreateContact,
} from "@/lib/services/contacts.schema";
import { fieldErrors } from "@/lib/services/deals.schema";

const UUID = "11111111-1111-4111-8111-111111111111";

function erros(fn: () => unknown): Record<string, string> {
  try {
    fn();
    throw new Error("esperava ZodError");
  } catch (e) {
    if (e instanceof ZodError) return fieldErrors(e);
    throw e;
  }
}

describe("createCompanySchema", () => {
  it("aceita empresa só com nome", () => {
    expect(parseCreateCompany({ name: "ACME" }).name).toBe("ACME");
  });

  it("recusa nome vazio ou só espaços", () => {
    expect(erros(() => parseCreateCompany({ name: "" }))).toHaveProperty("name");
    expect(erros(() => parseCreateCompany({ name: "   " }))).toHaveProperty("name");
  });

  it("domínio vazio não vira string vazia", () => {
    expect(parseCreateCompany({ name: "ACME", domain: "" }).domain).toBeUndefined();
  });
});

describe("createContactSchema", () => {
  it("aceita contato com nome e e-mail", () => {
    const out = parseCreateContact({ name: "Ana", email: "ana@acme.com" });
    expect(out.email).toBe("ana@acme.com");
    expect(out.origem).toBe("outbound");
  });

  it("recusa nome ou e-mail ausentes", () => {
    expect(erros(() => parseCreateContact({ name: "", email: "a@b.com" }))).toHaveProperty("name");
    expect(erros(() => parseCreateContact({ name: "Ana", email: "" }))).toHaveProperty("email");
  });

  it("recusa e-mail malformado", () => {
    expect(erros(() => parseCreateContact({ name: "Ana", email: "ana@" }))).toHaveProperty("email");
  });

  it("aceita empresa por uuid e recusa valor inválido", () => {
    expect(parseCreateContact({ name: "Ana", email: "a@b.com", company_id: UUID }).company_id).toBe(UUID);
    expect(
      erros(() => parseCreateContact({ name: "Ana", email: "a@b.com", company_id: "abc" })),
    ).toHaveProperty("company_id");
  });

  it("sem empresa é válido (contato avulso)", () => {
    expect(parseCreateContact({ name: "Ana", email: "a@b.com", company_id: "" }).company_id).toBeUndefined();
  });
});
