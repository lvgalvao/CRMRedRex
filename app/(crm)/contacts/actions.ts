"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createCompany, createContact } from "@/lib/services/contacts";
import { fieldErrors } from "@/lib/services/deals.schema";

// Gatilho fino: extrai do FormData, delega ao serviço, devolve confirmação ou erro.

export type CadastroState = {
  ok?: string; // mensagem de sucesso exibida ao vendedor
  errors?: Record<string, string>;
  message?: string; // erro geral (ex.: e-mail duplicado)
};

function texto(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
}

export async function createCompanyAction(
  _prev: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  try {
    const company = await createCompany({
      name: texto(formData.get("name")) ?? "",
      domain: texto(formData.get("domain")),
    });
    revalidatePath("/contacts");
    revalidatePath("/deals/novo");
    return { ok: `Empresa "${company.name}" criada.` };
  } catch (error) {
    if (error instanceof ZodError) return { errors: fieldErrors(error) };
    return { message: error instanceof Error ? error.message : "Não foi possível criar a empresa." };
  }
}

export async function createContactAction(
  _prev: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  try {
    const contact = await createContact({
      name: texto(formData.get("name")) ?? "",
      email: texto(formData.get("email")) ?? "",
      phone: texto(formData.get("phone")),
      company_id: texto(formData.get("company_id")),
      origem: texto(formData.get("origem")) ?? "outbound",
    });
    revalidatePath("/contacts");
    revalidatePath("/deals/novo");
    return { ok: `Contato "${contact.name}" criado.` };
  } catch (error) {
    if (error instanceof ZodError) return { errors: fieldErrors(error) };
    return { message: error instanceof Error ? error.message : "Não foi possível criar o contato." };
  }
}
