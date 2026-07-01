"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botão "Atualizar" — dispara o polling do Calendly via sessão (FR-019).
export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSync() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync/calendly", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.message ?? "Falha na sincronização.");
      } else {
        setMsg(`${data.created} novo(s), ${data.skipped} já existente(s).`);
        router.refresh();
      }
    } catch {
      setMsg("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSync}
        disabled={loading}
        className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:border-primary disabled:opacity-50"
      >
        {loading ? "Atualizando..." : "Atualizar (Calendly)"}
      </button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
