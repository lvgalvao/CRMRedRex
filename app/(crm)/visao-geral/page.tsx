import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/services/dashboard";
import { listStages } from "@/lib/supabase/stages";
import { listDeals } from "@/lib/supabase/deals";
import { ForecastVsGoal } from "@/components/dashboard/ForecastVsGoal";
import { WinRateGauge } from "@/components/dashboard/WinRateGauge";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { formatBRL, todayISO } from "@/lib/utils";
import { moveDealAction } from "@/app/(crm)/pipeline/actions";

function monthStart(): string {
  return todayISO().slice(0, 7) + "-01";
}

export default async function VisaoGeralPage() {
  const month = monthStart();
  const db = await createClient();
  const [profile, data, stages, deals] = await Promise.all([
    getCurrentProfile(),
    getDashboardData(month),
    listStages(db),
    listDeals(db),
  ]);

  const kpis = [
    {
      label: "Tarefas de hoje",
      value: String(
        deals.filter(
          (d) => d.status === "open" && d.next_action_date && d.next_action_date <= todayISO(),
        ).length,
      ),
    },
    { label: "Valor ganho (mês)", value: formatBRL(data.wonValue) },
    { label: "Ticket médio", value: formatBRL(data.ticketMedio) },
    { label: "MRR novo", value: formatBRL(data.mrrNovo) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heavy">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {profile?.name}. Forecast do mês e seu funil em um só lugar.
          </p>
        </div>
      </div>

      {/* Faixa executiva: forecast × meta + gauge + KPIs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ForecastVsGoal
            weighted={data.forecast.vsGoal.weighted}
            target={data.forecast.vsGoal.target}
            attainmentPct={data.forecast.vsGoal.attainmentPct}
          />
        </div>
        <WinRateGauge won={data.won} lost={data.lost} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-card border border-border bg-surface p-4 shadow-card"
          >
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-heavy">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline na mesma tela */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <KanbanBoard stages={stages} deals={deals} moveDealAction={moveDealAction} />
      </div>
    </div>
  );
}
