import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/services/dashboard";
import { listProfiles } from "@/lib/supabase/profiles";
import { ForecastVsGoal } from "@/components/dashboard/ForecastVsGoal";
import { FunnelByStage } from "@/components/dashboard/FunnelByStage";
import { RepRanking } from "@/components/dashboard/RepRanking";
import { formatBRL, todayISO } from "@/lib/utils";
import { setGoalAction } from "./actions";

function monthStart(): string {
  return todayISO().slice(0, 7) + "-01";
}

export default async function DashboardPage() {
  const month = monthStart();
  const db = await createClient();
  const [profile, data, profiles] = await Promise.all([
    getCurrentProfile(),
    getDashboardData(month),
    listProfiles(db),
  ]);
  const isGestor = profile?.role === "gestor";
  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";

  const kpis = [
    { label: "Ganhos × Perdidos", value: `${data.won} × ${data.lost}` },
    { label: "Valor ganho (mês)", value: formatBRL(data.wonValue) },
    { label: "Ticket médio", value: formatBRL(data.ticketMedio) },
    { label: "MRR novo", value: formatBRL(data.mrrNovo) },
    { label: "Ciclo médio", value: data.cicloMedioDias != null ? `${data.cicloMedioDias} d` : "—" },
    { label: "Pipeline bruto", value: formatBRL(data.forecast.total.gross) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-heavy">Dashboard</h1>

      <ForecastVsGoal
        weighted={data.forecast.vsGoal.weighted}
        target={data.forecast.vsGoal.target}
        attainmentPct={data.forecast.vsGoal.attainmentPct}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-card border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-lg font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FunnelByStage byStage={data.forecast.byStage} />
        <RepRanking ranking={data.ranking} />
      </div>

      {isGestor ? (
        <form
          action={setGoalAction}
          className="flex flex-wrap items-end gap-2 rounded-card border border-border bg-surface p-4"
        >
          <h3 className="w-full font-semibold">Cadastrar meta do mês</h3>
          <label className="flex flex-col gap-1 text-xs">
            Mês
            <input name="month" type="date" defaultValue={month} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Dono (vazio = time)
            <select name="owner_id" className={field} defaultValue="">
              <option value="">Time</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Meta (R$)
            <input
              name="target_value"
              type="number"
              step="0.01"
              min="0"
              required
              className={field}
            />
          </label>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Salvar meta
          </button>
        </form>
      ) : null}
    </div>
  );
}
