import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContact } from "@/lib/supabase/contacts";
import { getCompany } from "@/lib/supabase/companies";
import { listActivitiesByContact } from "@/lib/supabase/activities";
import { ActivityTimeline } from "@/components/contacts/ActivityTimeline";
import { createDealFromContactAction } from "./actions";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const contact = await getContact(db, id);
  if (!contact) notFound();

  const [company, activities] = await Promise.all([
    contact.company_id ? getCompany(db, contact.company_id) : Promise.resolve(null),
    listActivitiesByContact(db, id),
  ]);

  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";
  const createDeal = createDealFromContactAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/contacts" className="text-xs text-muted-foreground hover:underline">
          ← Contatos
        </Link>
        <h1 className="mt-1 text-2xl font-heavy">{contact.name}</h1>
        <p className="text-sm text-muted-foreground">
          {contact.email}
          {contact.phone ? ` · ${contact.phone}` : ""} · {contact.origem}
          {company ? ` · ${company.name}` : ""}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form action={createDeal} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <h2 className="font-semibold">Novo deal para este contato</h2>
          <input name="title" placeholder="Título do deal" required className={field} />
          <input name="value" type="number" step="0.01" placeholder="Valor (R$)" className={field} />
          <input name="next_action" placeholder="Próxima ação" className={field} />
          <input name="next_action_date" type="date" className={field} />
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Criar deal
          </button>
        </form>

        <div>
          <h2 className="mb-2 font-semibold">Timeline</h2>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}
