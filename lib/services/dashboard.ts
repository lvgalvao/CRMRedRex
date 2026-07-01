import { createClient } from "@/lib/supabase/server";
import { computeForecast, type Forecast } from "@/lib/services/computeForecast";
import type { Deal, Profile } from "@/lib/supabase/types";

// KPIs do dashboard (FR-018). O forecast vem de computeForecast (ponto único).

export type DashboardData = {
  forecast: Forecast;
  won: number;
  lost: number;
  wonValue: number;
  ticketMedio: number;
  cicloMedioDias: number | null;
  mrrNovo: number;
  ranking: { ownerId: string | null; name: string; won: number; value: number }[];
};

function monthBounds(month: string): { start: string; end: string } {
  const start = new Date(`${month}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getDashboardData(month: string): Promise<DashboardData> {
  const db = await createClient();
  const { start, end } = monthBounds(month);

  const [forecast, closedRes, profilesRes] = await Promise.all([
    computeForecast(month),
    db
      .from("deals")
      .select("id, owner_id, value, mrr, deal_type, status, created_at, updated_at")
      .in("status", ["won", "lost"])
      .gte("updated_at", start)
      .lt("updated_at", end),
    db.from("profiles").select("id, name"),
  ]);

  const closed = (closedRes.data ?? []) as Deal[];
  const profiles = (profilesRes.data ?? []) as Pick<Profile, "id" | "name">[];
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));

  const wonDeals = closed.filter((d) => d.status === "won");
  const lostDeals = closed.filter((d) => d.status === "lost");

  const wonValue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const ticketMedio = wonDeals.length ? wonValue / wonDeals.length : 0;
  const mrrNovo = wonDeals
    .filter((d) => d.deal_type === "recorrente")
    .reduce((s, d) => s + (d.mrr ?? 0), 0);

  const ciclos = wonDeals.map(
    (d) =>
      (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  const cicloMedioDias = ciclos.length
    ? Math.round((ciclos.reduce((s, c) => s + c, 0) / ciclos.length) * 10) / 10
    : null;

  const rankMap = new Map<string | null, { won: number; value: number }>();
  for (const d of wonDeals) {
    const r = rankMap.get(d.owner_id) ?? { won: 0, value: 0 };
    r.won += 1;
    r.value += d.value ?? 0;
    rankMap.set(d.owner_id, r);
  }
  const ranking = Array.from(rankMap.entries())
    .map(([ownerId, agg]) => ({
      ownerId,
      name: ownerId ? (nameById.get(ownerId) ?? "—") : "Sem dono",
      ...agg,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    forecast,
    won: wonDeals.length,
    lost: lostDeals.length,
    wonValue,
    ticketMedio,
    cicloMedioDias,
    mrrNovo,
    ranking,
  };
}
