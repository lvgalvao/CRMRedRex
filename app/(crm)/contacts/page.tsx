import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listContacts } from "@/lib/supabase/contacts";
import { listCompanies } from "@/lib/supabase/companies";
import { CompanyForm } from "@/components/contacts/CompanyForm";
import { ContactForm } from "@/components/contacts/ContactForm";
import { createCompanyAction, createContactAction } from "./actions";

export default async function ContactsPage() {
  const db = await createClient();
  const [contacts, companies] = await Promise.all([listContacts(db), listCompanies(db)]);

  const nomeDaEmpresa = new Map(companies.map((c) => [c.id, c.name]));
  const contatosPorEmpresa = contacts.reduce<Record<string, number>>((acc, c) => {
    if (c.company_id) acc[c.company_id] = (acc[c.company_id] ?? 0) + 1;
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
          {companies.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-3 text-sm text-muted-foreground">
              Nenhuma empresa ainda. Comece cadastrando o cliente acima.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 rounded-card border border-border bg-surface p-3">
              {companies.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.domain ? `${c.domain} · ` : ""}
                    {contatosPorEmpresa[c.id] ?? 0}{" "}
                    {(contatosPorEmpresa[c.id] ?? 0) === 1 ? "contato" : "contatos"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-semibold">
            Contatos <span className="text-sm text-muted-foreground">({contacts.length})</span>
          </h2>
          {contacts.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-3 text-sm text-muted-foreground">
              Nenhum contato ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 rounded-card border border-border bg-surface p-3">
              {contacts.map((c) => (
                <li key={c.id} className="text-sm">
                  <Link href={`/contacts/${c.id}`} className="font-medium hover:text-accent">
                    {c.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {" · "}
                    {c.email}
                    {c.company_id ? ` · ${nomeDaEmpresa.get(c.company_id) ?? "—"}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
