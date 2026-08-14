import type { CadastroState } from "@/app/(crm)/contacts/actions";

/** Confirmação de sucesso ou erro geral do cadastro — o vendedor precisa ver que gravou. */
export function CadastroFeedback({ state }: { state: CadastroState }) {
  if (state.ok) {
    return (
      <p
        role="status"
        className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent"
      >
        ✓ {state.ok}
      </p>
    );
  }
  if (state.message) {
    return (
      <p
        role="alert"
        className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

export function ErroCampo({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="text-xs text-danger">{msg}</span>;
}
