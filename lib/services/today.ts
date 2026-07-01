import { createClient } from "@/lib/supabase/server";
import type { DealWithContact } from "@/lib/supabase/deals";

// Tela "Hoje": follow-ups de hoje e atrasados do vendedor logado (FR-009/FR-010, D11).

export type TodayItem = {
  dealId: string;
  title: string;
  contactName: string;
  nextAction: string;
  nextActionDate: string;
  overdue: boolean;
};

/**
 * Núcleo PURO (testável sem banco, T028): a partir de deals abertos do dono,
 * mantém os com next_action_date <= hoje, marca atrasados e ordena
 * atrasados-primeiro (depois por data crescente).
 */
export function toTodayItems(deals: DealWithContact[], today: string): TodayItem[] {
  return deals
    .filter(
      (d) =>
        d.status === "open" &&
        d.next_action != null &&
        d.next_action_date != null &&
        d.next_action_date <= today,
    )
    .map((d) => ({
      dealId: d.id,
      title: d.title,
      contactName: d.contact?.name ?? "—",
      nextAction: d.next_action as string,
      nextActionDate: d.next_action_date as string,
      overdue: (d.next_action_date as string) < today,
    }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1; // atrasados primeiro
      return a.nextActionDate.localeCompare(b.nextActionDate);
    });
}

/** Busca os itens de "Hoje" do dono informado. */
export async function getToday(ownerId: string, today: string): Promise<TodayItem[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("deals")
    .select("*, contact:contacts(*)")
    .eq("owner_id", ownerId)
    .eq("status", "open")
    .lte("next_action_date", today);
  if (error) throw error;
  return toTodayItems((data ?? []) as DealWithContact[], today);
}
