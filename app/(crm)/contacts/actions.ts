"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  createCompany,
  createContact,
  editCompany,
  editContact,
  deleteCompany,
  deleteContact,
} from "@/lib/services/contacts";
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

function revalidar() {
  revalidatePath("/contacts");
  revalidatePath("/deals/novo");
  revalidatePath("/deals");
}

export async function updateCompanyAction(
  id: string,
  _prev: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  try {
    const company = await editCompany(id, {
      name: texto(formData.get("name")) ?? "",
      domain: texto(formData.get("domain")) ?? null,
    });
    revalidar();
    return { ok: `Empresa "${company.name}" atualizada.` };
  } catch (error) {
    if (error instanceof ZodError) return { errors: fieldErrors(error) };
    return { message: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
}

export async function deleteCompanyAction(
  id: string,
  _prev: CadastroState,
): Promise<CadastroState> {
  try {
    const { contacts, deals } = await deleteCompany(id);
    revalidar();
    const desvinculados: string[] = [];
    if (contacts > 0) desvinculados.push(`${contacts} contato(s)`);
    if (deals > 0) desvinculados.push(`${deals} oportunidade(s)`);
    return {
      ok: desvinculados.length
        ? `Empresa excluída. ${desvinculados.join(" e ")} ficaram sem cliente.`
        : "Empresa excluída.",
    };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Não foi possível excluir." };
  }
}

export async function updateContactAction(
  id: string,
  _prev: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  try {
    const contact = await editContact(id, {
      name: texto(formData.get("name")) ?? "",
      email: texto(formData.get("email")) ?? "",
      phone: texto(formData.get("phone")) ?? null,
      company_id: texto(formData.get("company_id")) ?? null,
      origem: texto(formData.get("origem")) ?? "outbound",
    });
    revalidar();
    return { ok: `Contato "${contact.name}" atualizado.` };
  } catch (error) {
    if (error instanceof ZodError) return { errors: fieldErrors(error) };
    return { message: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
}

export async function deleteContactAction(
  id: string,
  _prev: CadastroState,
): Promise<CadastroState> {
  try {
    const { activities } = await deleteContact(id);
    revalidar();
    return {
      ok: activities > 0
        ? `Contato excluído, junto com ${activities} atividade(s) da timeline.`
        : "Contato excluído.",
    };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Não foi possível excluir." };
  }
}
