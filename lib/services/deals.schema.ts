import { z } from "zod";

// Validação PURA da Oportunidade (sem banco, sem env) -> testável isolada (T013).
// FR-002, FR-003, FR-006, FR-007, FR-008. Mensagens em português: aparecem no formulário.

const uuid = (campo: string) => z.string().uuid({ message: `Selecione ${campo}.` });

/** "" (campo de formulário vazio) vira undefined antes de validar. */
const vazioParaIndefinido = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const valor = z.preprocess(
  vazioParaIndefinido,
  z
    .number({ invalid_type_error: "Valor deve ser um número." })
    .min(0, "Valor não pode ser negativo.")
    .optional(),
);

const probabilidade = z.preprocess(
  vazioParaIndefinido,
  z
    .number({ invalid_type_error: "Probabilidade deve ser um número." })
    .int("Probabilidade deve ser um número inteiro.")
    .min(0, "Probabilidade vai de 0 a 100.")
    .max(100, "Probabilidade vai de 0 a 100.")
    .nullish(),
);

const data = z.preprocess(
  vazioParaIndefinido,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .nullish(),
);

const texto = z.preprocess(vazioParaIndefinido, z.string().trim().nullish());

export const createDealSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe o nome da oportunidade.")
    .max(120, "Nome muito longo (máx. 120 caracteres)."),
  company_id: uuid("o cliente"),
  contact_id: uuid("o contato"),
  stage_id: uuid("a etapa"),
  value: valor,
  probability: probabilidade,          // ausente/null = herda a etapa (FR-008)
  owner_id: z.preprocess(vazioParaIndefinido, z.string().uuid().nullish()),
  expected_close_date: data,           // passado é permitido (FR-007, D8)
  next_action: texto,
  next_action_date: data,
});

// Edição: mesmos campos, todos opcionais. Etapa e status têm caminho próprio (US2).
export const editDealSchema = createDealSchema.partial();

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type EditDealInput = z.infer<typeof editDealSchema>;

/** Valida a criação (pura). Lança ZodError se inválido. */
export function parseCreateDeal(input: unknown): CreateDealInput {
  return createDealSchema.parse(input);
}

/** Valida a edição (pura). Lança ZodError se inválido. */
export function parseEditDeal(input: unknown): EditDealInput {
  return editDealSchema.parse(input);
}

/** Achata um ZodError em { campo: mensagem } para o formulário exibir por campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const campo = String(issue.path[0] ?? "_");
    if (!acc[campo]) acc[campo] = issue.message;
    return acc;
  }, {});
}
