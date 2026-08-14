import { cn } from "@/lib/utils";

/** Bloco cinza pulsante usado nos loading.tsx — dá resposta visual imediata. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Cabeçalho de página (título + subtítulo). */
export function SkeletonHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Linha de cards de KPI. */
export function SkeletonKpis({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4 shadow-card">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Quadro Kanban com as 9 etapas do funil. */
export function SkeletonKanban() {
  return (
    <div className="flex gap-3 overflow-x-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex w-64 shrink-0 flex-col gap-2 rounded-card border border-border bg-surface p-3"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Lista vertical de itens. */
export function SkeletonList({ n = 5 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4 shadow-card">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
