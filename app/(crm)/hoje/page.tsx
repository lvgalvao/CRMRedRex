import { getCurrentProfile } from "@/lib/auth";
import { getToday } from "@/lib/services/today";
import { todayISO } from "@/lib/utils";
import { TodayList } from "@/components/today/TodayList";

export default async function HojePage() {
  const profile = await getCurrentProfile();
  const today = todayISO();
  const items = profile ? await getToday(profile.id, today) : [];

  const overdue = items.filter((i) => i.overdue).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-heavy">Hoje</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} follow-up(s) · {overdue} atrasado(s)
        </p>
      </div>
      <TodayList items={items} />
    </div>
  );
}
