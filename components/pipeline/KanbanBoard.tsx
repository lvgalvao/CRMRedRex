"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import type { Stage } from "@/lib/supabase/types";
import type { DealWithContact } from "@/lib/supabase/deals";

type Props = {
  stages: Stage[];
  deals: DealWithContact[];
  moveDealAction: (dealId: string, stageId: string, position: number) => Promise<void>;
};

export function KanbanBoard({ stages, deals: initialDeals, moveDealAction }: Props) {
  const [deals, setDeals] = useState(initialDeals);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function dealsByStage(stageId: string) {
    return deals
      .filter((d) => d.stage_id === stageId)
      .sort((a, b) => a.position - b.position);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    // O "over" pode ser uma coluna (stage.id) ou outro card (deal.id).
    let targetStageId = stages.find((s) => s.id === over.id)?.id;
    if (!targetStageId) {
      const overDeal = deals.find((d) => d.id === over.id);
      targetStageId = overDeal?.stage_id;
    }
    if (!targetStageId || targetStageId === deal.stage_id) return;

    const position = dealsByStage(targetStageId).length;
    // Atualização otimista.
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: targetStageId!, position } : d)),
    );
    try {
      await moveDealAction(dealId, targetStageId, position);
    } catch {
      // Reverte em caso de erro.
      setDeals(initialDeals);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn key={stage.id} stage={stage} deals={dealsByStage(stage.id)} />
        ))}
      </div>
    </DndContext>
  );
}
