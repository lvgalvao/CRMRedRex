import { createClient } from "@/lib/supabase/server";
import {
  createCompany as repoCreateCompany,
  updateCompany as repoUpdateCompany,
} from "@/lib/supabase/companies";
import {
  createContact as repoCreateContact,
  updateContact as repoUpdateContact,
} from "@/lib/supabase/contacts";
import type { Company, Contact, Origem } from "@/lib/supabase/types";

// CRUD de empresas e contatos (FR-003).

export async function createCompany(input: {
  name: string;
  domain?: string | null;
}): Promise<Company> {
  const db = await createClient();
  return repoCreateCompany(db, input);
}

export async function editCompany(
  id: string,
  patch: { name?: string; domain?: string | null },
): Promise<Company> {
  const db = await createClient();
  return repoUpdateCompany(db, id, patch);
}

export async function createContact(input: {
  name: string;
  email: string;
  phone?: string | null;
  company_id?: string | null;
  origem?: Origem;
}): Promise<Contact> {
  const db = await createClient();
  return repoCreateContact(db, { origem: "outbound", ...input });
}

export async function editContact(
  id: string,
  patch: {
    name?: string;
    email?: string;
    phone?: string | null;
    company_id?: string | null;
    origem?: Origem;
  },
): Promise<Contact> {
  const db = await createClient();
  return repoUpdateContact(db, id, patch);
}
