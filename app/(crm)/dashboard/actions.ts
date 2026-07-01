"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { upsertGoal } from "@/lib/supabase/goals";
import { getCurrentProfile } from "@/lib/auth";

// Cadastro de meta mensal (gestor) — FR-016.
export async function setGoalAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "gestor") {
    throw new Error("Apenas gestores podem cadastrar metas.");
  }

  const month = String(formData.get("month") ?? ""); // YYYY-MM-01
  const target = Number(formData.get("target_value") ?? 0) || 0;
  const ownerRaw = String(formData.get("owner_id") ?? "");
  const owner_id = ownerRaw === "" ? null : ownerRaw;
  if (!month) return;

  const db = await createClient();
  await upsertGoal(db, { owner_id, month, target_value: target });
  revalidatePath("/dashboard");
}
