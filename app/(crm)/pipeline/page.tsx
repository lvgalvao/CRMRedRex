import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listStages } from "@/lib/supabase/stages";
import { listDeals } from "@/lib/supabase/deals";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { moveDealAction } from "./actions";

export default async function PipelinePage() {
  const db = await createClient();
  const [stages, deals] = await Promise.all([listStages(db), listDeals(db)]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heavy">Pipeline</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/contacts"
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:border-primary"
          >
            + Novo contato / deal
          </Link>
        </div>
      </div>
      <KanbanBoard stages={stages} deals={deals} moveDealAction={moveDealAction} />
    </div>
  );
}
