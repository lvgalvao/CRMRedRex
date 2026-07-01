import { formatBRL } from "@/lib/utils";

// Barra forecast × meta no topo do dashboard (sinal comercial, PRD §14).
export function ForecastVsGoal({
  weighted,
  target,
  attainmentPct,
}: {
  weighted: number;
  target: number;
  attainmentPct: number;
}) {
  const width = Math.min(attainmentPct, 100);
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Forecast ponderado × meta do mês</p>
          <p className="text-2xl font-heavy text-foreground">
            {formatBRL(weighted)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {formatBRL(target)}
            </span>
          </p>
        </div>
        <span className="text-2xl font-heavy text-primary">{attainmentPct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-pill bg-muted">
        <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
