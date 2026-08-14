"use client";

import { useActionState, useEffect, useRef } from "react";
import { CadastroFeedback, ErroCampo } from "./CadastroFeedback";
import type { CadastroState } from "@/app/(crm)/contacts/actions";
import type { Company } from "@/lib/supabase/types";

type Props = {
  companies: Company[];
  action: (prev: CadastroState, formData: FormData) => Promise<CadastroState>;
};

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";

export function ContactForm({ companies, action }: Props) {
  const [state, formAction, pending] = useActionState<CadastroState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 className="font-semibold">Novo contato</h2>

      <input name="name" placeholder="Nome" className={field} />
      <ErroCampo msg={state.errors?.name} />

      <input name="email" type="email" placeholder="E-mail" className={field} />
      <ErroCampo msg={state.errors?.email} />

      <input
        name="phone"
        placeholder="Telefone (E.164, ex. +5511999998888)"
        className={field}
      />
      <ErroCampo msg={state.errors?.phone} />

      <select name="company_id" className={field} defaultValue="">
        <option value="">Sem empresa</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ErroCampo msg={state.errors?.company_id} />

      <select name="origem" className={field} defaultValue="outbound">
        <option value="outbound">Outbound</option>
        <option value="inbound">Inbound</option>
      </select>

      <button
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar contato"}
      </button>

      <CadastroFeedback state={state} />
    </form>
  );
}
