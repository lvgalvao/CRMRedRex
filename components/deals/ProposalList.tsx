import { formatBRL } from "@/lib/utils";
import type { Proposal, ProposalStatus } from "@/lib/supabase/types";

const STATUSES: ProposalStatus[] = ["rascunho", "enviada", "vista", "aceita", "recusada"];

type Props = {
  proposals: Proposal[];
  today: string;
  statusAction: (proposalId: string, formData: FormData) => Promise<void>;
};

export function ProposalList({ proposals, today, statusAction }: Props) {
  if (proposals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {proposals.map((p) => {
        const vencida = p.valid_until != null && p.valid_until < today;
        return (
          <li
            key={p.id}
            className={`rounded-card border p-3 ${vencida ? "border-danger/60" : "border-border"} bg-surface`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                v{p.version} · {formatBRL(p.value)}
              </span>
              <span className={vencida ? "text-danger" : "text-muted-foreground"}>
                {vencida ? "⚠ vencida" : p.valid_until ? `válida até ${p.valid_until}` : "sem validade"}
              </span>
            </div>
            <form action={statusAction.bind(null, p.id)} className="mt-2 flex items-center gap-2">
              <select
                name="status"
                defaultValue={p.status}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="rounded-md border border-border px-2 py-1 text-xs">Atualizar</button>
              {p.doc_url ? (
                <a href={p.doc_url} target="_blank" rel="noreferrer" className="text-xs text-accent">
                  documento ↗
                </a>
              ) : null}
            </form>
          </li>
        );
      })}
    </ul>
  );
}
