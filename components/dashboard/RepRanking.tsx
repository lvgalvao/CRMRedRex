import { formatBRL } from "@/lib/utils";
import type { DashboardData } from "@/lib/services/dashboard";

export function RepRanking({ ranking }: { ranking: DashboardData["ranking"] }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="mb-3 font-semibold">Ranking por vendedor (mês)</h3>
      {ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum ganho no período.</p>
      ) : (
        <ol className="flex flex-col gap-1 text-sm">
          {ranking.map((r, i) => (
            <li key={r.ownerId ?? "none"} className="flex justify-between">
              <span>
                {i + 1}. {r.name}{" "}
                <span className="text-xs text-muted-foreground">({r.won} ganho(s))</span>
              </span>
              <span className="text-success">{formatBRL(r.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
