import { createClient } from "@/lib/supabase/server";
import type { Deal, Goal, Stage } from "@/lib/supabase/types";
import { effectiveProbability } from "./dealStage";

// ÚNICO ponto de cálculo do forecast (Princípio II, D9, FR-017/FR-018).
// weighted = Σ value × (probabilidade efetiva/100) para deals abertos.
// Probabilidade efetiva = ajuste manual do deal, ou a da etapa quando não houver (002/FR-008a).

export type Forecast = {
  total: { weighted: number; gross: number };
  byStage: { stageId: string; name: string; weighted: number; gross: number; count: number }[];
  byOwner: { ownerId: string | null; weighted: number; gross: number }[];
  vsGoal: {
    month: string;
    target: number;
    weighted: number;
    attainmentPct: number;
    perOwner: { ownerId: string; target: number; weighted: number; attainmentPct: number }[];
  };
};

/**
 * Valor ponderado de UMA oportunidade — a menor unidade da regra de forecast.
 * Fechadas valem 0 no ponderado (FR-013). Vive aqui para que a fórmula não se
 * espalhe: qualquer tela que precise do ponderado importa desta função.
 */
export function weightedValue(
  deal: Pick<Deal, "value" | "probability" | "status">,
  stage: Pick<Stage, "probability"> | null | undefined,
): number {
  if (deal.status !== "open") return 0;
  return (deal.value ?? 0) * (effectiveProbability(deal, stage) / 100);
}

function pct(weighted: number, target: number): number {
  return target > 0 ? Math.round((weighted / target) * 1000) / 10 : 0;
}

/**
 * Núcleo PURO do forecast (testável sem banco, T038).
 * Considera apenas deals com status 'open'. Terminais ficam de fora do ponderado.
 */
export function computeForecastFromData(
  deals: Pick<Deal, "id" | "stage_id" | "owner_id" | "value" | "status" | "probability">[],
  stages: Pick<Stage, "id" | "name" | "probability">[],
  goals: Pick<Goal, "owner_id" | "target_value">[],
  month: string,
): Forecast {
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const open = deals.filter((d) => d.status === "open");

  let totalWeighted = 0;
  let totalGross = 0;
  const byStage = new Map<string, { weighted: number; gross: number; count: number }>();
  const byOwner = new Map<string | null, { weighted: number; gross: number }>();

  for (const d of open) {
    const stage = stageById.get(d.stage_id);
    const value = d.value ?? 0;
    const weighted = weightedValue(d, stage);

    totalWeighted += weighted;
    totalGross += value;

    const s = byStage.get(d.stage_id) ?? { weighted: 0, gross: 0, count: 0 };
    s.weighted += weighted;
    s.gross += value;
    s.count += 1;
    byStage.set(d.stage_id, s);

    const o = byOwner.get(d.owner_id) ?? { weighted: 0, gross: 0 };
    o.weighted += weighted;
    o.gross += value;
    byOwner.set(d.owner_id, o);
  }

  // Meta do time = goal com owner_id null.
  const teamTarget = goals.find((g) => g.owner_id == null)?.target_value ?? 0;

  const perOwner = Array.from(byOwner.entries())
    .filter(([ownerId]) => ownerId != null)
    .map(([ownerId, agg]) => {
      const target = goals.find((g) => g.owner_id === ownerId)?.target_value ?? 0;
      return {
        ownerId: ownerId as string,
        target,
        weighted: agg.weighted,
        attainmentPct: pct(agg.weighted, target),
      };
    });

  return {
    total: { weighted: totalWeighted, gross: totalGross },
    byStage: stages.map((s) => {
      const agg = byStage.get(s.id) ?? { weighted: 0, gross: 0, count: 0 };
      return { stageId: s.id, name: s.name, ...agg };
    }),
    byOwner: Array.from(byOwner.entries()).map(([ownerId, agg]) => ({ ownerId, ...agg })),
    vsGoal: {
      month,
      target: teamTarget,
      weighted: totalWeighted,
      attainmentPct: pct(totalWeighted, teamTarget),
      perOwner,
    },
  };
}

/** Busca os dados e calcula o forecast do mês (YYYY-MM-01). */
export async function computeForecast(month: string): Promise<Forecast> {
  const db = await createClient();
  const [{ data: deals }, { data: stages }, { data: goals }] = await Promise.all([
    db.from("deals").select("id, stage_id, owner_id, value, status, probability"),
    db.from("stages").select("id, name, probability"),
    db.from("goals").select("owner_id, target_value").eq("month", month),
  ]);
  return computeForecastFromData(
    (deals ?? []) as Deal[],
    (stages ?? []) as Stage[],
    (goals ?? []) as Goal[],
    month,
  );
}
