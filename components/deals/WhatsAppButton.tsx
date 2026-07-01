"use client";

import { useState } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

// Abre o WhatsApp com a mensagem preenchida (FR-015). Trata telefone ausente/ inválido.
export function WhatsAppButton({
  phone,
  text,
  className,
}: {
  phone: string | null | undefined;
  text: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const result = buildWhatsAppLink(phone, text);
    if (result.ok) {
      setError(null);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={!text}
        className={
          className ??
          "rounded-md bg-success px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        }
      >
        Abrir no WhatsApp
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
