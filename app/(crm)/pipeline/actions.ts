"use server";

import { revalidatePath } from "next/cache";
import { moveDeal } from "@/lib/services/deals";

export async function moveDealAction(dealId: string, stageId: string, position: number) {
  await moveDeal(dealId, stageId, position);
  revalidatePath("/pipeline");
}
