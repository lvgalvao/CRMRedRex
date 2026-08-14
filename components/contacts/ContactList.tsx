"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CadastroFeedback, ErroCampo } from "./CadastroFeedback";
import { DeleteButton, botao } from "./RowActions";
import type { CadastroState } from "@/app/(crm)/contacts/actions";
import type { Company, Contact } from "@/lib/supabase/types";

type Props = {
  contacts: Contact[];
  companies: Company[];
  dealsPorContato: Record<string, number>;
  updateAction: (id: string, prev: CadastroState, formData: FormData) => Promise<CadastroState>;
  deleteAction: (id: string, prev: CadastroState) => Promise<CadastroState>;
};

const field = "rounded-md border border-border bg-background px-2 py-1 text-sm";

function EditRow({
  contact,
  companies,
  updateAction,
  onDone,
}: {
  contact: Contact;
  companies: Company[];
  updateAction: (id: string, prev: CadastroState, formData: FormData) => Promise<CadastroState>;
  onDone: (state: CadastroState) => void;
}) {
  const [state, formAction, pending] = useActionState<CadastroState, FormData>(
    updateAction.bind(null, contact.id),
    {},
  );

  useEffect(() => {
    if (state.ok) onDone(state);
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input name="name" defaultValue={contact.name} className={field} />
      <ErroCampo msg={state.errors?.name} />
      <input name="email" type="email" defaultValue={contact.email} className={field} />
      <ErroCampo msg={state.errors?.email} />
      <input
        name="phone"
        defaultValue={contact.phone ?? ""}
        placeholder="Telefone"
        className={field}
      />
      <select name="company_id" defaultValue={contact.company_id ?? ""} className={field}>
        <option value="">Sem empresa</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="origem" defaultValue={contact.origem} className={field}>
        <option value="outbound">Outbound</option>
        <option value="inbound">Inbound</option>
      </select>
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => onDone({})} className={`${botao} hover:border-primary`}>
          Cancelar
        </button>
      </div>
      <CadastroFeedback state={{ message: state.message }} />
    </form>
  );
}

export function ContactList({
  contacts,
  companies,
  dealsPorContato,
  updateAction,
  deleteAction,
}: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CadastroState>({});
  const nomeDaEmpresa = new Map(companies.map((c) => [c.id, c.name]));

  function concluir(state: CadastroState) {
    setEditando(null);
    setFeedback(state);
  }

  if (contacts.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface p-3 text-sm text-muted-foreground">
        Nenhum contato ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <CadastroFeedback state={feedback} />
      <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
        {contacts.map((c) => {
          const oportunidades = dealsPorContato[c.id] ?? 0;
          return (
            <li key={c.id} className="flex flex-col gap-1 p-3 text-sm">
              {editando === c.id ? (
                <EditRow
                  contact={c}
                  companies={companies}
                  updateAction={updateAction}
                  onDone={concluir}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/contacts/${c.id}`} className="font-medium hover:text-accent">
                      {c.name}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.email}
                      {c.company_id ? ` · ${nomeDaEmpresa.get(c.company_id) ?? "—"}` : ""}
                      {oportunidades > 0
                        ? ` · ${oportunidades} ${oportunidades === 1 ? "oportunidade" : "oportunidades"}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setEditando(c.id)}
                      className={`${botao} hover:border-primary`}
                    >
                      Editar
                    </button>
                    <DeleteButton
                      id={c.id}
                      action={deleteAction}
                      onResult={concluir}
                      aviso={
                        oportunidades > 0
                          ? `Este contato tem ${oportunidades} oportunidade(s) e não pode ser excluído. Exclua ou transfira as oportunidades antes.`
                          : "O contato e as atividades da timeline dele serão apagados. Isso não pode ser desfeito."
                      }
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
