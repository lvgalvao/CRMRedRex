"use client";

import { useState } from "react";
import type { Stage } from "@/lib/supabase/types";
import { isTerminalStage } from "@/lib/services/dealStage";

type Props = {
  dealId: string;
  currentStageId: string;
  stages: Stage[];
  changeStageAction: (dealId: string, formData: FormData) => Promise<void>;
};

// Troca de etapa pela tela de detalhe — mesmo efeito do arraste no Kanban (FR-011).
// Etapa terminal exige motivo/MRR/data: aqui só avisamos e direcionamos ao
// "Fechar deal", que já coleta esses campos (ver contracts/internal-services.md).
export function StageStatusControl({ dealId, currentStageId, stages, changeStageAction }: Props) {
  const [stageId, setStageId] = useState(currentStageId);
  const destino = stages.find((s) => s.id === stageId);
  const terminal = destino ? isTerminalStage(destino.name) : false;
  const mudou = stageId !== currentStageId;

  return (
    <form
      action={(fd) => changeStageAction(dealId, fd)}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h3 className="font-semibold">Etapa</h3>
      <select
        name="stage_id"
        value={stageId}
        onChange={(e) => setStageId(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {s.probability}%
          </option>
        ))}
      </select>

      {mudou && terminal ? (
        <p className="text-xs text-warning">
          Etapa de fechamento. Prefira usar &quot;Fechar oportunidade&quot; abaixo — lá o motivo da perda, o
          MRR ou a data de reaquecimento são registrados.
        </p>
      ) : null}

      <button
        disabled={!mudou}
        className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Mover etapa
      </button>
    </form>
  );
}
