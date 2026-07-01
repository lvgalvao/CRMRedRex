import { cn } from "@/lib/utils";

// Sinal comercial (PRD §14): atrasado em vermelho; sem ação = "parado".
export function NextActionBadge({
  nextAction,
  nextActionDate,
  today,
}: {
  nextAction: string | null;
  nextActionDate: string | null;
  today: string;
}) {
  if (!nextAction) {
    return (
      <span className="rounded-pill bg-warning/20 px-2 py-0.5 text-xs text-warning">parado</span>
    );
  }
  const overdue = nextActionDate != null && nextActionDate < today;
  return (
    <span
      className={cn(
        "rounded-pill px-2 py-0.5 text-xs",
        overdue ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground",
      )}
    >
      {overdue ? "⚠ " : ""}
      {nextAction}
      {nextActionDate ? ` · ${nextActionDate}` : ""}
    </span>
  );
}
