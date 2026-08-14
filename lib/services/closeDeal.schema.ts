import { z } from "zod";
import type { Deal } from "@/lib/supabase/types";

// Validação PURA do fechamento (sem dependência de banco/env) -> testável isolada (T016).
// FR-007, SC-009, D12.

const wonSchema = z
  .object({
    status: z.literal("won"),
    deal_type: z.enum(["pontual", "recorrente"]),
    mrr: z.number().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.deal_type === "recorrente" && !(typeof val.mrr === "number" && val.mrr > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MRR deve ser > 0 para deal recorrente",
        path: ["mrr"],
      });
    }
  });

const lostSchema = z.object({
  status: z.literal("lost"),
  lost_reason: z.enum(["preço", "timing", "concorrente", "sem_budget", "sumiu", "outro"]),
});

const standbySchema = z.object({
  status: z.literal("standby"),
  reaquecer_em: z.string().min(1, "Stand-by exige data para reaquecer"),
});

export const closeSchema = z.union([wonSchema, lostSchema, standbySchema]);

export type CloseInput = z.infer<typeof closeSchema>;

/** Valida o fechamento (pura). Lança ZodError se inválido. */
export function parseClose(input: unknown): CloseInput {
  return closeSchema.parse(input);
}

/** Mapeia o status terminal -> patch de campos do deal. */
export function closeToDealPatch(input: CloseInput): Partial<Deal> {
  switch (input.status) {
    case "won":
      return input.deal_type === "recorrente"
        ? { status: "won", deal_type: "recorrente", mrr: input.mrr ?? 0 }
        : { status: "won", deal_type: "pontual" };
    case "lost":
      return { status: "lost", lost_reason: input.lost_reason };
    case "standby":
      return { status: "standby", reaquecer_em: input.reaquecer_em };
  }
}

// Mapeamento etapa terminal <-> status vive em dealStage.ts (fonte única, T011).
// Reexportado aqui para não quebrar quem já importava de closeDeal.
export { TERMINAL_STAGE } from "./dealStage";
