import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeal } from "@/lib/supabase/deals";
import { listStages } from "@/lib/supabase/stages";
import { listProfiles } from "@/lib/supabase/profiles";
import { listActivitiesByDeal } from "@/lib/supabase/activities";
import { listProposalsByDeal } from "@/lib/supabase/proposals";
import { ActivityTimeline } from "@/components/contacts/ActivityTimeline";
import { CloseDealDialog } from "@/components/deals/CloseDealDialog";
import { ProposalForm } from "@/components/deals/ProposalForm";
import { ProposalList } from "@/components/deals/ProposalList";
import { formatBRL, todayISO } from "@/lib/utils";
import {
  setNextActionAction,
  setOwnerAction,
  addNoteAction,
  closeDealAction,
  createProposalAction,
  updateProposalStatusAction,
} from "./actions";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const deal = await getDeal(db, id);
  if (!deal) notFound();

  const [stages, profiles, activities, proposals] = await Promise.all([
    listStages(db),
    listProfiles(db),
    listActivitiesByDeal(db, id),
    listProposalsByDeal(db, id),
  ]);
  const stage = stages.find((s) => s.id === deal.stage_id);
  const today = todayISO();

  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";
  const setOwner = setOwnerAction.bind(null, id);
  const setNext = setNextActionAction.bind(null, id);
  const addNoteB = addNoteAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/pipeline" className="text-xs text-muted-foreground hover:underline">
          ← Pipeline
        </Link>
        <h1 className="mt-1 text-2xl font-heavy">{deal.title}</h1>
        <p className="text-sm text-muted-foreground">
          {deal.contact?.name ?? "—"} · {formatBRL(deal.value)} · {stage?.name ?? "—"} ·{" "}
          {deal.status}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <form action={setOwner} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
            <h3 className="font-semibold">Dono</h3>
            <select name="owner_id" defaultValue={deal.owner_id ?? ""} className={field}>
              <option value="">Sem dono</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-border px-3 py-1.5 text-sm">Salvar dono</button>
          </form>

          <form action={setNext} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
            <h3 className="font-semibold">Próxima ação</h3>
            <input
              name="next_action"
              defaultValue={deal.next_action ?? ""}
              placeholder="Ex.: Ligar para confirmar"
              className={field}
            />
            <input
              name="next_action_date"
              type="date"
              defaultValue={deal.next_action_date ?? ""}
              className={field}
            />
            <button className="rounded-md border border-border px-3 py-1.5 text-sm">Salvar ação</button>
          </form>

          <CloseDealDialog dealId={id} closeAction={closeDealAction} />
        </div>

        <div className="flex flex-col gap-4">
          <form action={addNoteB} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
            <h3 className="font-semibold">Registrar nota</h3>
            <textarea name="content" rows={3} className={field} placeholder="O que aconteceu..." />
            <button className="rounded-md border border-border px-3 py-1.5 text-sm">Adicionar à timeline</button>
          </form>

          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Propostas</h3>
            <ProposalForm dealId={id} createAction={createProposalAction} />
            <ProposalList
              proposals={proposals}
              today={today}
              statusAction={updateProposalStatusAction}
            />
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Timeline</h3>
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>
    </div>
  );
}
