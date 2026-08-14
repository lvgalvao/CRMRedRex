"use client";

import { useActionState, useEffect, useRef } from "react";
import { CadastroFeedback, ErroCampo } from "./CadastroFeedback";
import type { CadastroState } from "@/app/(crm)/contacts/actions";

type Props = {
  action: (prev: CadastroState, formData: FormData) => Promise<CadastroState>;
};

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";

export function CompanyForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<CadastroState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o formulário depois de gravar, para o próximo cadastro começar em branco.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 className="font-semibold">Nova empresa</h2>

      <input name="name" placeholder="Nome" className={field} />
      <ErroCampo msg={state.errors?.name} />

      <input name="domain" placeholder="Domínio (opcional)" className={field} />
      <ErroCampo msg={state.errors?.domain} />

      <button
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar empresa"}
      </button>

      <CadastroFeedback state={state} />
    </form>
  );
}
