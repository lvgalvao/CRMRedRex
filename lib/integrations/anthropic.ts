import "server-only";

import { serverEnv } from "@/lib/env";

// Adapter da IA em runtime (API da Anthropic, Messages). Cada uso atrás desta interface
// para trocar modelo/fornecedor em um só lugar (Princípio II). Chave só no servidor.

const MODEL = "claude-sonnet-4-6";

export interface AiClient {
  complete(prompt: string, maxTokens?: number): Promise<string>;
}

export function isAiConfigured(): boolean {
  try {
    return Boolean(serverEnv().ANTHROPIC_API_KEY);
  } catch {
    return false;
  }
}

export function getAiClient(): AiClient {
  return {
    async complete(prompt: string, maxTokens = 1500): Promise<string> {
      const apiKey = serverEnv().ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY ausente.");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const json = (await res.json()) as { content?: { type: string; text?: string }[] };
      return (json.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n");
    },
  };
}
