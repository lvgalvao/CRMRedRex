"use client";

import { useState } from "react";
import { WhatsAppButton } from "@/components/deals/WhatsAppButton";

type TemplateOpt = { id: string; name: string; category: string };
type DealOpt = { id: string; title: string; phone: string | null };

export function PlaybookFiller({
  templates,
  deals,
  fillAction,
}: {
  templates: TemplateOpt[];
  deals: DealOpt[];
  fillAction: (templateId: string, dealId: string) => Promise<string>;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [dealId, setDealId] = useState(deals[0]?.id ?? "");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const phone = deals.find((d) => d.id === dealId)?.phone ?? null;
  const field = "rounded-md border border-border bg-background px-3 py-2 text-sm";

  async function onFill() {
    setLoading(true);
    try {
      setText(await fillAction(templateId, dealId));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Playbook</span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className={field}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.category} · {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Deal</span>
          <select value={dealId} onChange={(e) => setDealId(e.target.value)} className={field}>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onFill}
        disabled={loading || !templateId || !dealId}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Preenchendo..." : "Preencher playbook"}
      </button>

      {text ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className={`${field} font-mono`}
          />
          <WhatsAppButton phone={phone} text={text} />
        </>
      ) : null}
    </div>
  );
}
