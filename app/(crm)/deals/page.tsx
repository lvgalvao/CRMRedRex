import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listDealsFiltered } from "@/lib/supabase/deals";
import { listStages } from "@/lib/supabase/stages";
import { listProfiles } from "@/lib/supabase/profiles";
import { DealFilters } from "@/components/deals/DealFilters";
import { effectiveProbability } from "@/lib/services/dealStage";
import { weightedValue } from "@/lib/services/computeForecast";
import { formatBRL, todayISO, cn } from "@/lib/utils";
import type { DealStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<DealStatus, string> = {
  open: "Aberta",
  won: "Ganha",
  lost: "Perdida",
  standby: "Stand-by",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; stage?: string; status?: string }>;
}) {
  const { owner, stage, status } = await searchParams;
  const db = await createClient();
  const [deals, stages, profiles] = await Promise.all([
    listDealsFiltered(db, {
      ownerId: owner,
      stageId: stage,
      status: status as DealStatus | undefined,
    }),
    listStages(db),
    listProfiles(db),
  ]);

  const today = todayISO();
  const totalBruto = deals.reduce((soma, d) => soma + (d.value ?? 0), 0);
  // Ponderado vem de weightedValue (ponto único da regra), nunca recalculado aqui.
  const totalPonderado = deals.reduce((soma, d) => soma + weightedValue(d, d.stage), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-heavy">Oportunidades</h1>
        <Link
          href="/deals/novo"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
        >
          + Nova oportunidade
        </Link>
      </div>

      <DealFilters profiles={profiles} stages={stages} />

      <div className="flex flex-wrap gap-6 rounded-card border border-border bg-surface px-4 py-3 text-sm">
        <span>
          <span className="text-muted-foreground">Oportunidades:</span>{" "}
          <strong>{deals.length}</strong>
        </span>
        <span>
          <span className="text-muted-foreground">Soma dos valores:</span>{" "}
          <strong>{formatBRL(totalBruto)}</strong>
        </span>
        <span>
          <span className="text-muted-foreground">Ponderado (abertas):</span>{" "}
          <strong className="text-accent">{formatBRL(totalPonderado)}</strong>
        </span>
      </div>

      {deals.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted-foreground">
          Nenhuma oportunidade para este filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Oportunidade</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Prob.</th>
                <th className="px-4 py-3">Previsão</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const vencida =
                  d.status === "open" &&
                  d.expected_close_date != null &&
                  d.expected_close_date < today;
                return (
                  <tr key={d.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/deals/${d.id}`} className="font-semibold hover:text-accent">
                        {d.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{d.contact?.name ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{d.company?.name ?? "—"}</td>
                    <td className="px-4 py-3">{d.stage?.name ?? "—"}</td>
                    <td className="px-4 py-3">{d.owner?.name ?? "Sem dono"}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(d.value)}</td>
                    <td className="px-4 py-3 text-right">
                      {effectiveProbability(d, d.stage)}%
                      {d.probability != null ? (
                        <span className="ml-1 text-[11px] text-muted-foreground">aj.</span>
                      ) : null}
                    </td>
                    <td className={cn("px-4 py-3", vencida && "font-semibold text-danger")}>
                      {formatDate(d.expected_close_date)}
                      {vencida ? " ⚠" : ""}
                    </td>
                    <td className="px-4 py-3">{STATUS_LABEL[d.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
