import type { Company, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listCompanies(db: DB): Promise<Company[]> {
  const { data, error } = await db.from("companies").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getCompany(db: DB, id: string): Promise<Company | null> {
  const { data, error } = await db.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findCompanyByName(db: DB, name: string): Promise<Company | null> {
  const { data, error } = await db.from("companies").select("*").ilike("name", name).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCompany(
  db: DB,
  input: { name: string; domain?: string | null },
): Promise<Company> {
  const { data, error } = await db.from("companies").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCompany(
  db: DB,
  id: string,
  patch: Partial<Pick<Company, "name" | "domain">>,
): Promise<Company> {
  const { data, error } = await db
    .from("companies")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
