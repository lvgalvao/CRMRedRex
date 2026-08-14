import { z } from "zod";

// Validação PURA de empresa e contato (sem banco, sem env). Mensagens em português:
// aparecem no formulário, por campo.

const vazioParaIndefinido = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da empresa.")
    .max(120, "Nome muito longo (máx. 120 caracteres)."),
  domain: z.preprocess(vazioParaIndefinido, z.string().trim().nullish()),
});

export const createContactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do contato.").max(120, "Nome muito longo."),
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  phone: z.preprocess(vazioParaIndefinido, z.string().trim().nullish()),
  company_id: z.preprocess(vazioParaIndefinido, z.string().uuid("Selecione uma empresa válida.").nullish()),
  origem: z.enum(["inbound", "outbound"]).default("outbound"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;

export function parseCreateCompany(input: unknown): CreateCompanyInput {
  return createCompanySchema.parse(input);
}

export function parseCreateContact(input: unknown): CreateContactInput {
  return createContactSchema.parse(input);
}
