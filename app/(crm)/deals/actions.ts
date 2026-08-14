"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { createDeal } from "@/lib/services/deals";
import { fieldErrors } from "@/lib/services/deals.schema";

// Gatilho fino: extrai do FormData, delega ao serviço, devolve erro para o formulário.
// Nenhuma regra de negócio aqui (Princípio II).

export type DealFormState = {
  errors?: Record<string, string>;
  message?: string;
};

/** Texto do formulário -> string ou undefined (campo vazio não vira ""). */
function texto(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
}

/** Texto do formulário -> número ou undefined. */
function numero(v: FormDataEntryValue | null): number | undefined {
  const s = texto(v);
  return s === undefined ? undefined : Number(s);
}

export async function createDealAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  let dealId: string;

  try {
    const deal = await createDeal({
      title: texto(formData.get("title")) ?? "",
      company_id: texto(formData.get("company_id")) ?? "",
      contact_id: texto(formData.get("contact_id")) ?? "",
      stage_id: texto(formData.get("stage_id")) ?? "",
      value: numero(formData.get("value")),
      probability: numero(formData.get("probability")),
      owner_id: texto(formData.get("owner_id")),
      expected_close_date: texto(formData.get("expected_close_date")),
      next_action: texto(formData.get("next_action")),
      next_action_date: texto(formData.get("next_action_date")),
    });
    dealId = deal.id;
  } catch (error) {
    if (error instanceof ZodError) return { errors: fieldErrors(error) };
    return { message: error instanceof Error ? error.message : "Não foi possível salvar." };
  }

  // Fora do try: redirect() sinaliza por exceção e não pode ser capturado acima.
  revalidatePath("/pipeline");
  revalidatePath("/deals");
  redirect(`/deals/${dealId}`);
}
