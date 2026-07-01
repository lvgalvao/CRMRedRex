"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { formatBRL } from "@/lib/utils";
import type { Stage } from "@/lib/supabase/types";
import type { DealWithContact } from "@/lib/supabase/deals";

export function KanbanColumn({ stage, deals }: { stage: Stage; deals: DealWithContact[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-card border bg-muted/50 p-3 ${
        isOver ? "border-primary" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-pill"
            style={{ backgroundColor: stage.color ?? "#A1A1AA" }}
          />
          <h3 className="text-sm font-semibold">{stage.name}</h3>
          <span className="text-xs text-muted-foreground">{stage.probability}%</span>
        </div>
        <span className="text-xs text-muted-foreground">{deals.length}</span>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{formatBRL(total)}</p>
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {deals.map((deal) => (
            <KanbanCard key={deal.id} deal={deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
