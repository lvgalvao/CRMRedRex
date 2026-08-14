import type { Deal, DealStatus } from "@/lib/supabase/types";

// Mapeamento etapa ↔ status e probabilidade efetiva. Camada PURA: sem banco, sem env,
// testável isolada (T012). Compartilhada por deals.ts, closeDeal.ts e computeForecast.ts
// para que a regra não se duplique (Princípio II).

export type TerminalStatus = Extract<DealStatus, "won" | "lost" | "standby">;

/** Etapa terminal correspondente a cada status de fechamento. */
export const TERMINAL_STAGE: Record<TerminalStatus, string> = {
  won: "Ganho",
  lost: "Perdido",
  standby: "Stand-by",
};

/** Inverso de TERMINAL_STAGE: nome da etapa -> status implicado. */
export const STAGE_TO_STATUS: Record<string, TerminalStatus> = Object.entries(
  TERMINAL_STAGE,
).reduce<Record<string, TerminalStatus>>((acc, [status, stageName]) => {
  acc[stageName] = status as TerminalStatus;
  return acc;
}, {});

export function isTerminalStage(stageName: string): boolean {
  return stageName in STAGE_TO_STATUS;
}

/** Status implicado por uma etapa: terminal para Ganho/Perdido/Stand-by, 'open' nas demais. */
export function statusForStage(stageName: string): DealStatus {
  return STAGE_TO_STATUS[stageName] ?? "open";
}

/**
 * Probabilidade que vale para este deal (FR-008a):
 * o ajuste manual prevalece; sem ajuste (null), herda a etapa.
 */
export function effectiveProbability(
  deal: Pick<Deal, "probability">,
  stage: Pick<{ probability: number }, "probability"> | undefined | null,
): number {
  return deal.probability ?? stage?.probability ?? 0;
}

/**
 * Patch de status implicado por uma mudança de etapa (FR-012, FR-014).
 * - etapa terminal  -> aplica o status correspondente
 * - etapa ativa     -> reabre o deal fechado, limpando motivo de perda e reaquecimento
 * - nada a mudar    -> objeto vazio
 */
export function transitionForStage(currentStatus: DealStatus, stageName: string): Partial<Deal> {
  const target = statusForStage(stageName);

  if (target !== "open") {
    return target === currentStatus ? {} : { status: target };
  }

  // Etapa ativa: só age se o deal estava fechado (reabertura).
  if (currentStatus === "open") return {};
  return { status: "open", lost_reason: null, reaquecer_em: null };
}
