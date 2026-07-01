import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/supabase/templates";
import { listDeals } from "@/lib/supabase/deals";
import { PlaybookFiller } from "@/components/playbooks/PlaybookFiller";
import { fillAction } from "./actions";

export default async function PlaybooksPage() {
  const db = await createClient();
  const [templates, deals] = await Promise.all([listTemplates(db), listDeals(db)]);

  const templateOpts = templates.map((t) => ({ id: t.id, name: t.name, category: t.category }));
  const dealOpts = deals.map((d) => ({
    id: d.id,
    title: d.title,
    phone: d.contact?.phone ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-heavy">Playbooks</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um playbook e um deal; o texto é preenchido com os dados do contato e pode ir
          direto para o WhatsApp.
        </p>
      </div>
      {templateOpts.length === 0 || dealOpts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre ao menos um deal para usar os playbooks.
        </p>
      ) : (
        <PlaybookFiller templates={templateOpts} deals={dealOpts} fillAction={fillAction} />
      )}
    </div>
  );
}
