import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listContacts } from "@/lib/supabase/contacts";
import { listCompanies } from "@/lib/supabase/companies";
import { listDeals } from "@/lib/supabase/deals";
import { CompanyForm } from "@/components/contacts/CompanyForm";
import { ContactForm } from "@/components/contacts/ContactForm";
import { CompanyList } from "@/components/contacts/CompanyList";
import { ContactList } from "@/components/contacts/ContactList";
import {
  createCompanyAction,
  createContactAction,
  updateCompanyAction,
  deleteCompanyAction,
  updateContactAction,
  deleteContactAction,
} from "./actions";

export default async function ContactsPage() {
  const db = await createClient();
  const [contacts, companies, deals] = await Promise.all([
    listContacts(db),
    listCompanies(db),
    listDeals(db),
  ]);

  const contatosPorEmpresa = contacts.reduce<Record<string, number>>((acc, c) => {
    if (c.company_id) acc[c.company_id] = (acc[c.company_id] ?? 0) + 1;
    return acc;
  }, {});

  // Vínculos que decidem se a exclusão é possível — mostrados antes de confirmar.
  const dealsPorContato = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.contact_id] = (acc[d.contact_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-heavy">Contatos &amp; Empresas</h1>
        <Link
          href="/deals/novo"
          className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:border-primary"
        >
          + Nova oportunidade
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CompanyForm action={createCompanyAction} />
        <ContactForm companies={companies} action={createContactAction} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">
            Empresas <span className="text-sm text-muted-foreground">({companies.length})</span>
          </h2>
          <CompanyList
            companies={companies}
            contatosPorEmpresa={contatosPorEmpresa}
            updateAction={updateCompanyAction}
            deleteAction={deleteCompanyAction}
          />
        </div>

        <div>
          <h2 className="mb-2 font-semibold">
            Contatos <span className="text-sm text-muted-foreground">({contacts.length})</span>
          </h2>
          <ContactList
            contacts={contacts}
            companies={companies}
            dealsPorContato={dealsPorContato}
            updateAction={updateContactAction}
            deleteAction={deleteContactAction}
          />
        </div>
      </div>
    </div>
  );
}
