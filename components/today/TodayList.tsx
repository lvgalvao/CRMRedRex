import Link from "next/link";
import type { TodayItem } from "@/lib/services/today";
import { cn } from "@/lib/utils";

export function TodayList({ items }: { items: TodayItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nada pendente para hoje. Bom trabalho. 🎯</p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.dealId}
          className={cn(
            "flex items-center justify-between rounded-card border bg-surface p-3",
            item.overdue ? "border-danger/60" : "border-border",
          )}
        >
          <div>
            <Link href={`/deals/${item.dealId}`} className="font-semibold hover:text-accent">
              {item.title}
            </Link>
            <p className="text-xs text-muted-foreground">{item.contactName}</p>
          </div>
          <div className="text-right text-sm">
            <p className={item.overdue ? "font-semibold text-danger" : "text-foreground"}>
              {item.overdue ? "⚠ atrasado" : "hoje"}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.nextAction} · {item.nextActionDate}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
