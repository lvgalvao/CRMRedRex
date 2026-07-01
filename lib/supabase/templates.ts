import type { Template, TemplateCategory, TypedClient } from "@/lib/supabase/types";

type DB = TypedClient;

export async function listTemplates(db: DB): Promise<Template[]> {
  const { data, error } = await db.from("templates").select("*").order("category");
  if (error) throw error;
  return data ?? [];
}

export async function listTemplatesByCategory(
  db: DB,
  category: TemplateCategory,
): Promise<Template[]> {
  const { data, error } = await db
    .from("templates")
    .select("*")
    .eq("category", category)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getTemplate(db: DB, id: string): Promise<Template | null> {
  const { data, error } = await db.from("templates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
