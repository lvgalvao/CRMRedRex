"use client";

import { useState } from "react";

type CloseStatus = "won" | "lost" | "standby";

const LOST_REASONS = ["preço", "timing", "concorrente", "sem_budget", "sumiu", "outro"] as const;

type Props = {
  dealId: string;
  closeAction: (dealId: string, formData: FormData) => Promise<void>;
};

// Campos condicionais por status terminal (FR-007, SC-009).
export function CloseDealDialog({ dealId, closeAction }: Props) {
  const [status, setStatus] = useState<CloseStatus>("won");
  const [dealType, setDealType] = useState<"pontual" | "recorrente">("pontual");

  return (
    <form
      action={(fd) => closeAction(dealId, fd)}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <h3 className="font-semibold">Fechar deal</h3>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Resultado</span>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CloseStatus)}
          className="rounded-md border border-border bg-background px-3 py-2"
        >
          <option value="won">Ganho</option>
          <option value="lost">Perdido</option>
          <option value="standby">Stand-by</option>
        </select>
      </label>

      {status === "won" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <select
              name="deal_type"
              value={dealType}
              onChange={(e) => setDealType(e.target.value as "pontual" | "recorrente")}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="pontual">Pontual</option>
              <option value="recorrente">Recorrente</option>
            </select>
          </label>
          {dealType === "recorrente" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">MRR (R$)</span>
              <input
                type="number"
                name="mrr"
                min="1"
                step="0.01"
                required
                className="rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
          ) : null}
        </>
      ) : null}

      {status === "lost" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Motivo</span>
          <select
            name="lost_reason"
            required
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            {LOST_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {status === "standby" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Reaquecer em</span>
          <input
            type="date"
            name="reaquecer_em"
            required
            className="rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
      ) : null}

      <button className="mt-1 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
        Confirmar fechamento
      </button>
    </form>
  );
}
