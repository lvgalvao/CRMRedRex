"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatBRL, cn } from "@/lib/utils";
import type { DealWithContact } from "@/lib/supabase/deals";

export function KanbanCard({ deal }: { deal: DealWithContact }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOpen = deal.status === "open";
  const parado = isOpen && !deal.next_action; // edge case: deal sem próxima ação
  const overdue =
    isOpen &&
    deal.next_action_date != null &&
    deal.next_action_date < new Date().toISOString().slice(0, 10);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-card border border-border bg-surface p-3 text-sm shadow-card active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/deals/${deal.id}`}
          className="font-semibold text-foreground hover:text-accent"
          onClick={(e) => e.stopPropagation()}
        >
          {deal.title}
        </Link>
        <span className="text-muted-foreground">{formatBRL(deal.value)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{deal.contact?.name ?? "—"}</p>
      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
        {deal.next_action ? (
          <span
            className={cn(
              "rounded-pill px-2 py-0.5",
              overdue ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground",
            )}
          >
            {overdue ? "⚠ " : ""}
            {deal.next_action}
          </span>
        ) : null}
        {parado ? (
          <span className="rounded-pill bg-warning/20 px-2 py-0.5 text-warning">parado</span>
        ) : null}
      </div>
    </div>
  );
}
