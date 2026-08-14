"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { Company, Contact, Deal, Profile, Stage } from "@/lib/supabase/types";
import type { DealFormState } from "@/app/(crm)/deals/actions";

type Props = {
  companies: Company[];
  contacts: Contact[];
  stages: Stage[];
  profiles: Profile[];
  currentProfileId: string | null;
  action: (prev: DealFormState, formData: FormData) => Promise<DealFormState>;
  submitLabel?: string;
  /** Valores atuais quando o formulário está em modo edição. */
  deal?: Deal;
};

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";
const label = "text-xs font-semibold text-muted-foreground";

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="text-xs text-danger">{msg}</span>;
}

export function DealForm({
  companies,
  contacts,
  stages,
  profiles,
  currentProfileId,
  action,
  submitLabel = "Criar oportunidade",
  deal,
}: Props) {
  const [state, formAction, pending] = useActionState<DealFormState, FormData>(action, {});
  const [companyId, setCompanyId] = useState(deal?.company_id ?? "");
  const [stageId, setStageId] = useState(deal?.stage_id ?? stages[0]?.id ?? "");

  // Contatos do cliente selecionado (FR-003). Sem cliente escolhido, nenhum contato.
  const contatosDoCliente = useMemo(
    () => (companyId ? contacts.filter((c) => c.company_id === companyId) : []),
    [companyId, contacts],
  );

  // Probabilidade da etapa: vira o placeholder. Campo vazio = herda (FR-008).
  const probabilidadeDaEtapa = stages.find((s) => s.id === stageId)?.probability ?? 0;
  const clienteSemContato = companyId !== "" && contatosDoCliente.length === 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className={label} htmlFor="title">
            Nome da oportunidade *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={deal?.title ?? ""}
            placeholder="Ex.: Plataforma de dados — ACME"
            className={field}
          />
          <Erro msg={state.errors?.title} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="company_id">
            Cliente *
          </label>
          <select
            id="company_id"
            name="company_id"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className={field}
          >
            <option value="">Selecione o cliente</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Erro msg={state.errors?.company_id} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="contact_id">
            Contato *
          </label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={deal?.contact_id ?? ""}
            className={field}
            disabled={!companyId}
          >
            <option value="">
              {companyId ? "Selecione o contato" : "Escolha o cliente primeiro"}
            </option>
            {contatosDoCliente.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {clienteSemContato ? (
            <span className="text-xs text-warning">
              Este cliente ainda não tem contatos.{" "}
              <Link href="/contacts" className="underline">
                Cadastrar contato
              </Link>
            </span>
          ) : null}
          <Erro msg={state.errors?.contact_id} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="stage_id">
            Etapa *
          </label>
          <select
            id="stage_id"
            name="stage_id"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            disabled={Boolean(deal)}
            className={field}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {deal ? (
            <span className="text-xs text-muted-foreground">
              A etapa é alterada na tela da oportunidade, para registrar o histórico.
            </span>
          ) : null}
          <Erro msg={state.errors?.stage_id} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="owner_id">
            Responsável
          </label>
          <select
            id="owner_id"
            name="owner_id"
            defaultValue={deal?.owner_id ?? currentProfileId ?? ""}
            className={field}
          >
            <option value="">Eu mesmo</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Erro msg={state.errors?.owner_id} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="value">
            Valor (R$)
          </label>
          <input
            id="value"
            name="value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={deal?.value ?? ""}
            placeholder="0,00"
            className={field}
          />
          <Erro msg={state.errors?.value} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="probability">
            Probabilidade (%)
          </label>
          <input
            id="probability"
            name="probability"
            type="number"
            min="0"
            max="100"
            defaultValue={deal?.probability ?? ""}
            placeholder={`${probabilidadeDaEtapa} (da etapa)`}
            className={field}
          />
          <span className="text-xs text-muted-foreground">
            Em branco, herda os {probabilidadeDaEtapa}% da etapa. Preencher sobrescreve no forecast.
          </span>
          <Erro msg={state.errors?.probability} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="expected_close_date">
            Previsão de fechamento
          </label>
          <input
            id="expected_close_date"
            name="expected_close_date"
            type="date"
            defaultValue={deal?.expected_close_date ?? ""}
            className={field}
          />
          <Erro msg={state.errors?.expected_close_date} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="next_action">
            Próxima ação
          </label>
          <input
            id="next_action"
            name="next_action"
            defaultValue={deal?.next_action ?? ""}
            placeholder="Ex.: Ligar para confirmar diagnóstico"
            className={field}
          />
          <Erro msg={state.errors?.next_action} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={label} htmlFor="next_action_date">
            Data da próxima ação
          </label>
          <input
            id="next_action_date"
            name="next_action_date"
            type="date"
            defaultValue={deal?.next_action_date ?? ""}
            className={field}
          />
          <Erro msg={state.errors?.next_action_date} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Salvando..." : submitLabel}
        </button>
        <Link
          href={deal ? `/deals/${deal.id}` : "/pipeline"}
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
