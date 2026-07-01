import type { Contact, Origem, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listContacts(db: DB): Promise<Contact[]> {
  const { data, error } = await db.from("contacts").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getContact(db: DB, id: string): Promise<Contact | null> {
  const { data, error } = await db.from("contacts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findContactByEmail(db: DB, email: string): Promise<Contact | null> {
  const { data, error } = await db.from("contacts").select("*").eq("email", email).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createContact(
  db: DB,
  input: {
    name: string;
    email: string;
    phone?: string | null;
    company_id?: string | null;
    origem?: Origem;
  },
): Promise<Contact> {
  const { data, error } = await db.from("contacts").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateContact(
  db: DB,
  id: string,
  patch: Partial<Pick<Contact, "name" | "email" | "phone" | "company_id" | "origem">>,
): Promise<Contact> {
  const { data, error } = await db.from("contacts").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
