type Props = {
  dealId: string;
  createAction: (dealId: string, formData: FormData) => Promise<void>;
};

export function ProposalForm({ dealId, createAction }: Props) {
  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";
  const create = createAction.bind(null, dealId);
  return (
    <form action={create} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <h3 className="font-semibold">Nova proposta</h3>
      <input name="value" type="number" step="0.01" min="0" placeholder="Valor (R$)" required className={field} />
      <input name="valid_until" type="date" className={field} />
      <input name="doc_url" placeholder="Link do documento" className={field} />
      <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Criar versão
      </button>
    </form>
  );
}
