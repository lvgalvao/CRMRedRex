import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM RedRex",
  description: "CRM comercial da RedRex — pipeline, forecast e o que fazer hoje.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
