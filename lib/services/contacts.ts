import { createClient } from "@/lib/supabase/server";
import {
  createCompany as repoCreateCompany,
  updateCompany as repoUpdateCompany,
  deleteCompany as repoDeleteCompany,
  countCompanyLinks,
} from "@/lib/supabase/companies";
import {
  createContact as repoCreateContact,
  updateContact as repoUpdateContact,
  deleteContact as repoDeleteContact,
  countContactLinks,
} from "@/lib/supabase/contacts";
import {
  parseCreateCompany,
  parseCreateContact,
  parseEditCompany,
  parseEditContact,
} from "./contacts.schema";
import type { Company, Contact, Origem } from "@/lib/supabase/types";

// Erro do Postgres para violação de unicidade (contacts.email é unique).
const UNIQUE_VIOLATION = "23505";
// Violação de chave estrangeira: deals.contact_id é ON DELETE RESTRICT.
const FK_VIOLATION = "23503";

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

const isUniqueViolation = (e: unknown) => hasCode(e, UNIQUE_VIOLATION);
const isFkViolation = (e: unknown) => hasCode(e, FK_VIOLATION);

// CRUD de empresas e contatos (FR-003).

export async function createCompany(input: unknown): Promise<Company> {
  const data = parseCreateCompany(input);
  const db = await createClient();
  return repoCreateCompany(db, { name: data.name, domain: data.domain ?? null });
}

export async function editCompany(id: string, patch: unknown): Promise<Company> {
  const data = parseEditCompany(patch);
  const db = await createClient();
  return repoUpdateCompany(db, id, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.domain !== undefined ? { domain: data.domain ?? null } : {}),
  });
}

/**
 * Exclui a empresa. Contatos e oportunidades NÃO são apagados: perdem o vínculo
 * (FK ON DELETE SET NULL). Devolve quantos registros foram desvinculados, para
 * a interface poder informar o que aconteceu.
 */
export async function deleteCompany(id: string): Promise<{ contacts: number; deals: number }> {
  const db = await createClient();
  const impacto = await countCompanyLinks(db, id);
  await repoDeleteCompany(db, id);
  return impacto;
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

export async function editContact(id: string, patch: unknown): Promise<Contact> {
  const data = parseEditContact(patch);
  const db = await createClient();
  try {
    return await repoUpdateContact(db, id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
      ...(data.company_id !== undefined ? { company_id: data.company_id ?? null } : {}),
      ...(data.origem !== undefined ? { origem: data.origem as Origem } : {}),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(`Já existe um contato com o e-mail ${data.email ?? "informado"}.`);
    }
    throw error;
  }
}

/**
 * Exclui o contato. Recusa quando há oportunidades vinculadas (FK RESTRICT) —
 * registro comercial não some por acidente. Atividades do contato são apagadas
 * junto (FK CASCADE), então a interface avisa antes.
 */
export async function deleteContact(id: string): Promise<{ activities: number }> {
  const db = await createClient();
  const impacto = await countContactLinks(db, id);

  if (impacto.deals > 0) {
    const plural = impacto.deals === 1 ? "oportunidade vinculada" : "oportunidades vinculadas";
    throw new Error(
      `Este contato tem ${impacto.deals} ${plural}. Exclua ou transfira as oportunidades antes.`,
    );
  }

  try {
    await repoDeleteContact(db, id);
  } catch (error) {
    if (isFkViolation(error)) {
      throw new Error("Este contato está vinculado a oportunidades e não pode ser excluído.");
    }
    throw error;
  }
  return { activities: impacto.activities };
}
