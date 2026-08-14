import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDeal } from "@/lib/supabase/deals";
import { listCompanies } from "@/lib/supabase/companies";
import { listContacts } from "@/lib/supabase/contacts";
import { listStages } from "@/lib/supabase/stages";
import { listProfiles } from "@/lib/supabase/profiles";
import { DealForm } from "@/components/deals/DealForm";
import { editDealAction } from "../actions";

export default async function EditarOportunidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await createClient();
  const deal = await getDeal(db, id);
  if (!deal) notFound();

  const [companies, contacts, stages, profiles, profile] = await Promise.all([
    listCompanies(db),
    listContacts(db),
    listStages(db),
    listProfiles(db),
    getCurrentProfile(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/deals/${id}`} className="text-xs text-muted-foreground hover:underline">
          ← {deal.title}
        </Link>
        <h1 className="mt-1 text-2xl font-heavy">Editar oportunidade</h1>
      </div>

      <div className="rounded-card border border-border bg-surface p-6">
        <DealForm
          companies={companies}
          contacts={contacts}
          stages={stages}
          profiles={profiles}
          currentProfileId={profile?.id ?? null}
          action={editDealAction.bind(null, id)}
          submitLabel="Salvar alterações"
          deal={deal}
        />
      </div>
    </div>
  );
}
