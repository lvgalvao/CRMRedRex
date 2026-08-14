"use client";

import { useActionState, useEffect } from "react";
import type { CadastroState } from "@/app/(crm)/contacts/actions";

const botao = "rounded-md border border-border px-2 py-1 text-xs transition";

/**
 * Excluir em dois passos: o primeiro clique revela a consequência real e pede
 * confirmação. Sem window.confirm — o aviso precisa dizer o que vai acontecer,
 * e um dialog nativo não cabe essa explicação.
 */
export function DeleteButton({
  id,
  aviso,
  action,
  onResult,
}: {
  id: string;
  aviso: string;
  action: (id: string, prev: CadastroState) => Promise<CadastroState>;
  onResult: (state: CadastroState) => void;
}) {
  const [state, formAction, pending] = useActionState<CadastroState>(
    action.bind(null, id),
    {},
  );

  useEffect(() => {
    if (state.ok || state.message) onResult(state);
  }, [state, onResult]);

  return (
    <details className="inline-block">
      <summary
        className={`${botao} cursor-pointer list-none text-danger hover:border-danger`}
        role="button"
      >
        Excluir
      </summary>
      <div className="mt-2 flex flex-col gap-2 rounded-md border border-danger/30 bg-danger/5 p-2 text-xs">
        <p>{aviso}</p>
        <form action={formAction}>
          <button
            disabled={pending}
            className="rounded-md bg-danger px-2 py-1 font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Excluindo..." : "Confirmar exclusão"}
          </button>
        </form>
      </div>
    </details>
  );
}

export { botao };
