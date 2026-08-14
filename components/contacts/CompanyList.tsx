"use client";

import { useActionState, useEffect, useState } from "react";
import { CadastroFeedback, ErroCampo } from "./CadastroFeedback";
import { DeleteButton, botao } from "./RowActions";
import type { CadastroState } from "@/app/(crm)/contacts/actions";
import type { Company } from "@/lib/supabase/types";

type Props = {
  companies: Company[];
  contatosPorEmpresa: Record<string, number>;
  updateAction: (id: string, prev: CadastroState, formData: FormData) => Promise<CadastroState>;
  deleteAction: (id: string, prev: CadastroState) => Promise<CadastroState>;
};

const field = "rounded-md border border-border bg-background px-2 py-1 text-sm";

function EditRow({
  company,
  updateAction,
  onDone,
}: {
  company: Company;
  updateAction: (id: string, prev: CadastroState, formData: FormData) => Promise<CadastroState>;
  onDone: (state: CadastroState) => void;
}) {
  const [state, formAction, pending] = useActionState<CadastroState, FormData>(
    updateAction.bind(null, company.id),
    {},
  );

  useEffect(() => {
    if (state.ok) onDone(state);
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input name="name" defaultValue={company.name} className={field} />
      <ErroCampo msg={state.errors?.name} />
      <input
        name="domain"
        defaultValue={company.domain ?? ""}
        placeholder="Domínio"
        className={field}
      />
      <ErroCampo msg={state.errors?.domain} />
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

export function CompanyList({
  companies,
  contatosPorEmpresa,
  updateAction,
  deleteAction,
}: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CadastroState>({});

  function concluir(state: CadastroState) {
    setEditando(null);
    setFeedback(state);
  }

  if (companies.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface p-3 text-sm text-muted-foreground">
        Nenhuma empresa ainda. Comece cadastrando o cliente acima.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <CadastroFeedback state={feedback} />
      <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
        {companies.map((c) => {
          const vinculados = contatosPorEmpresa[c.id] ?? 0;
          return (
            <li key={c.id} className="flex flex-col gap-1 p-3 text-sm">
              {editando === c.id ? (
                <EditRow company={c} updateAction={updateAction} onDone={concluir} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.domain ? `${c.domain} · ` : ""}
                      {vinculados} {vinculados === 1 ? "contato" : "contatos"}
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
                        vinculados > 0
                          ? `Os ${vinculados} contato(s) e as oportunidades desta empresa não serão apagados — apenas ficarão sem cliente.`
                          : "A empresa será removida. Nenhum contato ou oportunidade está vinculado."
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
