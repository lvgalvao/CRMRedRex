import { redirect } from "next/navigation";

// Entrada do app: visão executiva (dashboard + pipeline).
export default function Home() {
  redirect("/visao-geral");
}
