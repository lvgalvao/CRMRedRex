"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Profile, Stage } from "@/lib/supabase/types";

type Props = { profiles: Profile[]; stages: Stage[] };

const STATUS = [
  { value: "open", label: "Aberta" },
  { value: "won", label: "Ganha" },
  { value: "lost", label: "Perdida" },
  { value: "standby", label: "Stand-by" },
];

// Filtros na query string: a URL vira o estado, dá para compartilhar e voltar (FR-023).
export function DealFilters({ profiles, stages }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";

  function aplicar(chave: string, valor: string) {
    const novo = new URLSearchParams(params.toString());
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    router.push(novo.size ? `/deals?${novo}` : "/deals");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Responsável"
        value={params.get("owner") ?? ""}
        onChange={(e) => aplicar("owner", e.target.value)}
        className={field}
      >
        <option value="">Todos os responsáveis</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Etapa"
        value={params.get("stage") ?? ""}
        onChange={(e) => aplicar("stage", e.target.value)}
        className={field}
      >
        <option value="">Todas as etapas</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Status"
        value={params.get("status") ?? ""}
        onChange={(e) => aplicar("status", e.target.value)}
        className={field}
      >
        <option value="">Todos os status</option>
        {STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {params.size > 0 ? (
        <button
          onClick={() => router.push("/deals")}
          className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
        >
          Limpar
        </button>
      ) : null}
    </div>
  );
}
