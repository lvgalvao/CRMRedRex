import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Helper padrão shadcn/ui para compor classes Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata valor em BRL. */
export function formatBRL(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

/** Data ISO (YYYY-MM-DD) de hoje no fuso local. */
export function todayISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}
