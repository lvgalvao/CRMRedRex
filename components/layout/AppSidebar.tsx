"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  KanbanSquare,
  BarChart3,
  Users,
  BookOpen,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const MAIN: NavItem[] = [
  { href: "/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { href: "/hoje", label: "Hoje", icon: CalendarCheck },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

const CADASTROS: NavItem[] = [
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen },
];

/** Conteúdo do link: troca o ícone por um spinner enquanto a navegação está pendente.
 *  Precisa ser filho do <Link> — é assim que useLinkStatus lê o estado. */
function NavLinkContent({ item }: { item: NavItem }) {
  const { pending } = useLinkStatus();
  const Icon = item.icon;
  return (
    <>
      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{item.label}</span>
      {pending && <span className="sr-only">Carregando…</span>}
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      prefetch
      className={cn(
        "flex items-center gap-3 rounded-pill px-3 py-2 text-sm transition",
        "active:scale-[0.98]",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <NavLinkContent item={item} />
    </Link>
  );
}

export function AppSidebar({
  profile,
  members,
  logoutAction,
}: {
  profile: Profile;
  members: Profile[];
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-5">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-primary text-sm font-heavy text-primary-foreground">
          R
        </span>
        <span className="text-lg font-heavy">RedRex</span>
      </div>

      <nav className="flex flex-col gap-1">
        {MAIN.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cadastros
        </p>
        {CADASTROS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Time
        </p>
        <ul className="flex flex-col gap-2 px-1">
          {members.slice(0, 6).map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-muted text-xs font-semibold">
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="leading-tight">
                <p className="text-sm">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-border pt-3">
        <div className="mb-2 px-2">
          <p className="text-sm font-semibold">{profile.name}</p>
          <p className="text-xs text-muted-foreground">{profile.role}</p>
        </div>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-2 rounded-pill px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
