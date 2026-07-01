import { formatBRL } from "@/lib/utils";
import type { Forecast } from "@/lib/services/computeForecast";

export function FunnelByStage({ byStage }: { byStage: Forecast["byStage"] }) {
  const max = Math.max(1, ...byStage.map((s) => s.gross));
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="mb-3 font-semibold">Pipeline por etapa</h3>
      <ul className="flex flex-col gap-2">
        {byStage.map((s) => (
          <li key={s.stageId} className="text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {s.name} ({s.count})
              </span>
              <span>{formatBRL(s.gross)}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-muted">
              <div
                className="h-full rounded-pill bg-lime"
                style={{ width: `${(s.gross / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
