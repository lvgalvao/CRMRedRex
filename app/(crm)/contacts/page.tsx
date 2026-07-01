import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listContacts } from "@/lib/supabase/contacts";
import { listCompanies } from "@/lib/supabase/companies";
import { createCompanyAction, createContactAction } from "./actions";

export default async function ContactsPage() {
  const db = await createClient();
  const [contacts, companies] = await Promise.all([listContacts(db), listCompanies(db)]);

  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-heavy">Contatos & Empresas</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          action={createCompanyAction}
          className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
        >
          <h2 className="font-semibold">Nova empresa</h2>
          <input name="name" placeholder="Nome" required className={field} />
          <input name="domain" placeholder="Domínio (opcional)" className={field} />
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Criar empresa
          </button>
        </form>

        <form
          action={createContactAction}
          className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
        >
          <h2 className="font-semibold">Novo contato</h2>
          <input name="name" placeholder="Nome" required className={field} />
          <input name="email" type="email" placeholder="E-mail" required className={field} />
          <input name="phone" placeholder="Telefone (E.164, ex. +5511999998888)" className={field} />
          <select name="company_id" className={field} defaultValue="">
            <option value="">Sem empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="origem" className={field} defaultValue="outbound">
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Criar contato
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Contatos</h2>
        <ul className="flex flex-col gap-1">
          {contacts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/contacts/${c.id}`}
                className="text-sm text-accent hover:underline"
              >
                {c.name} · {c.email}
              </Link>
            </li>
          ))}
          {contacts.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nenhum contato ainda.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
