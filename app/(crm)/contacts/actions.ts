"use server";

import { revalidatePath } from "next/cache";
import { createCompany, createContact } from "@/lib/services/contacts";
import type { Origem } from "@/lib/supabase/types";

export async function createCompanyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createCompany({ name, domain: String(formData.get("domain") ?? "") || null });
  revalidatePath("/contacts");
}

export async function createContactAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return;
  await createContact({
    name,
    email,
    phone: String(formData.get("phone") ?? "") || null,
    company_id: String(formData.get("company_id") ?? "") || null,
    origem: (String(formData.get("origem") ?? "outbound") as Origem) || "outbound",
  });
  revalidatePath("/contacts");
}
