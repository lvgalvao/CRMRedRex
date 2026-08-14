import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { listCompanies } from "@/lib/supabase/companies";
import { listContacts } from "@/lib/supabase/contacts";
import { listStages } from "@/lib/supabase/stages";
import { listProfiles } from "@/lib/supabase/profiles";
import { DealForm } from "@/components/deals/DealForm";
import { createDealAction } from "../actions";

export default async function NovaOportunidadePage() {
  const db = await createClient();
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
        <Link href="/pipeline" className="text-xs text-muted-foreground hover:underline">
          ← Pipeline
        </Link>
        <h1 className="mt-1 text-2xl font-heavy">Nova oportunidade</h1>
        <p className="text-sm text-muted-foreground">
          Registre um negócio que nasceu fora do agendamento automático.
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm">
          Nenhum cliente cadastrado ainda.{" "}
          <Link href="/contacts" className="text-accent underline">
            Cadastre a empresa e o contato
          </Link>{" "}
          antes de criar a oportunidade.
        </p>
      ) : (
        <div className="rounded-card border border-border bg-surface p-6">
          <DealForm
            companies={companies}
            contacts={contacts}
            stages={stages}
            profiles={profiles}
            currentProfileId={profile?.id ?? null}
            action={createDealAction}
          />
        </div>
      )}
    </div>
  );
}
