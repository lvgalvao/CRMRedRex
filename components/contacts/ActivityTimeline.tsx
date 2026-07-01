import type { Activity, ActivityType } from "@/lib/supabase/types";

const TYPE_LABEL: Record<ActivityType, string> = {
  note: "Nota",
  call_note: "Ligação",
  transcript: "Transcrição",
  analysis: "Análise IA",
  email: "E-mail",
  proposal: "Proposta",
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

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {activities.map((a) => (
        <li key={a.id} className="rounded-card border border-border bg-surface p-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="rounded-pill bg-background px-2 py-0.5 text-accent">
              {TYPE_LABEL[a.type]}
            </span>
            <time className="text-muted-foreground">{formatDateTime(a.created_at)}</time>
          </div>
          {a.content ? <p className="whitespace-pre-wrap text-sm">{a.content}</p> : null}
        </li>
      ))}
    </ol>
  );
}
