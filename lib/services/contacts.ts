import { createClient } from "@/lib/supabase/server";
import {
  createCompany as repoCreateCompany,
  updateCompany as repoUpdateCompany,
} from "@/lib/supabase/companies";
import {
  createContact as repoCreateContact,
  updateContact as repoUpdateContact,
} from "@/lib/supabase/contacts";
import { parseCreateCompany, parseCreateContact } from "./contacts.schema";
import type { Company, Contact, Origem } from "@/lib/supabase/types";

// Erro do Postgres para violação de unicidade (contacts.email é unique).
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: string }).code === UNIQUE_VIOLATION;
}

// CRUD de empresas e contatos (FR-003).

export async function createCompany(input: unknown): Promise<Company> {
  const data = parseCreateCompany(input);
  const db = await createClient();
  return repoCreateCompany(db, { name: data.name, domain: data.domain ?? null });
}

export async function editCompany(
  id: string,
  patch: { name?: string; domain?: string | null },
): Promise<Company> {
  const db = await createClient();
  return repoUpdateCompany(db, id, patch);
}

export async function createContact(input: unknown): Promise<Contact> {
  const data = parseCreateContact(input);
  const db = await createClient();
  try {
    return await repoCreateContact(db, {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      company_id: data.company_id ?? null,
      origem: data.origem as Origem,
    });
  } catch (error) {
    // contacts.email é unique: traduz o erro do banco em mensagem para o vendedor.
    if (isUniqueViolation(error)) {
      throw new Error(`Já existe um contato com o e-mail ${data.email}.`);
    }
    throw error;
  }
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
