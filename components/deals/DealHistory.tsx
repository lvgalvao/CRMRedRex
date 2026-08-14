import type { DealHistoryEntry } from "@/lib/supabase/dealHistory";
import type { DealStatus } from "@/lib/supabase/types";

// Linha do tempo do histórico de etapa/status (FR-016, FR-017).
// Registros são imutáveis: este componente só lê.

const STATUS_LABEL: Record<DealStatus, string> = {
  open: "Aberta",
  won: "Ganha",
  lost: "Perdida",
  standby: "Stand-by",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tempo de permanência em linguagem comercial: "3 dias", "5 h", "12 min". */
function formatDwell(seconds: number | null): string | null {
  if (seconds == null) return null;
  const dias = Math.floor(seconds / 86400);
  if (dias >= 1) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const horas = Math.floor(seconds / 3600);
  if (horas >= 1) return `${horas} h`;
  const minutos = Math.floor(seconds / 60);
  if (minutos >= 1) return `${minutos} min`;
  return "menos de 1 min";
}

function Transicao({ entry }: { entry: DealHistoryEntry }) {
  const abertura = !entry.from_stage && !entry.from_status;
  if (abertura) {
    return (
      <span>
        Oportunidade criada em <strong>{entry.to_stage?.name ?? "—"}</strong>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-1">
      {entry.from_stage || entry.to_stage ? (
        <>
          <span className="text-muted-foreground">{entry.from_stage?.name ?? "—"}</span>
          <span aria-hidden>→</span>
          <strong>{entry.to_stage?.name ?? "—"}</strong>
        </>
      ) : null}
      {(entry.from_stage || entry.to_stage) && entry.to_status ? (
        <span className="text-muted-foreground">·</span>
      ) : null}
      {entry.to_status ? (
        <>
          <span className="text-muted-foreground">
            {entry.from_status ? STATUS_LABEL[entry.from_status] : "—"}
          </span>
          <span aria-hidden>→</span>
          <strong>{STATUS_LABEL[entry.to_status]}</strong>
        </>
      ) : null}
    </span>
  );
}

export function DealHistory({ entries }: { entries: DealHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma mudança registrada ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e) => {
        const permanencia = formatDwell(e.dwell_seconds);
        return (
          <li key={e.id} className="rounded-card border border-border bg-surface p-3 text-sm">
            <Transicao entry={e} />
            <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              <span>{formatDateTime(e.created_at)}</span>
              <span aria-hidden>·</span>
              <span>{e.author_name ?? "Sistema"}</span>
              {permanencia ? (
                <>
                  <span aria-hidden>·</span>
                  <span>ficou {permanencia} na etapa anterior</span>
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
